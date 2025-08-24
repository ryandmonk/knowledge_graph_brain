"""
Heimdall Knowledge Graph Extraction Script

Best Practices for Meeting Notes (RAG/Graph):
- Meeting notes are ingested as first-class citizens (distinct 'Meeting' nodes, not just 'Document' with type)
- Store date, participants, topics, decisions, action items, and link to full text
- Create relationships: DISCUSSES (Topic), DECIDED (Decision), CREATED_ACTION (ActionItem), ATTENDED_BY (Person), HAPPENED_ON (Date)
- Link meetings to project timeline for chronological navigation
- Always include meeting notes in RAG retrieval and cite them in answers
- Encourage consistent meeting note templates (date, participants, agenda, decisions, actions)
- Support search/filter by meeting date, topic, participant, or decision
- Handle duplicates/overlaps with unique IDs and cross-links

TODOs for future improvement:
- Add more robust topic extraction (e.g., using transformer-based models)
- Link action items to Person nodes more reliably (disambiguate names)
- Add meeting note template enforcement/validation
- Add UI/endpoint for searching/filtering meetings by topic, date, or participant
- Add cross-linking for related meetings (e.g., follow-ups, recurring meetings)
"""

import os
import json
from py2neo import Graph, Node, Relationship
import spacy
import re
from collections import defaultdict
from datetime import datetime
import hashlib
import requests
import argparse

# Load spaCy model for NLP (English)
nlp = spacy.load("en_core_web_sm")

graph = Graph("bolt://localhost:7687", auth=("neo4j", "password"), name="heimdall")

data_dir = "/Users/rdombrowski/Desktop/AI Tests/ConfluenceGraphRAG/data/Heimdall"

OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
OLLAMA_MODEL = "mxbai-embed-large:latest"

def get_ollama_embedding(text, model=OLLAMA_MODEL):
    """Get embedding vector from Ollama for the given text using mxbai-embed-large."""
    try:
        response = requests.post(
            OLLAMA_EMBED_URL,
            json={"model": model, "prompt": text}
        )
        response.raise_for_status()
        data = response.json()
        # Ollama returns {"embedding": [...], ...}
        return data.get("embedding")
    except Exception as e:
        print(f"Warning: Failed to get embedding from Ollama: {e}")
        return None

# Create schema constraints and indices for better performance and data integrity
def create_schema_constraints():
    """Add schema constraints for data integrity and query performance"""
    constraints = [
        "CREATE CONSTRAINT document_title IF NOT EXISTS FOR (d:Document) REQUIRE d.title IS UNIQUE",
        "CREATE CONSTRAINT person_name IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE",
        "CREATE CONSTRAINT module_name IF NOT EXISTS FOR (m:Module) REQUIRE m.name IS UNIQUE",
        "CREATE CONSTRAINT service_name IF NOT EXISTS FOR (s:Service) REQUIRE s.name IS UNIQUE", 
        "CREATE CONSTRAINT team_name IF NOT EXISTS FOR (t:Team) REQUIRE t.name IS UNIQUE",
        "CREATE CONSTRAINT business_object_name IF NOT EXISTS FOR (b:BusinessObject) REQUIRE b.name IS UNIQUE",
        "CREATE CONSTRAINT topic_name IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE",
        "CREATE CONSTRAINT date_value IF NOT EXISTS FOR (d:Date) REQUIRE d.value IS UNIQUE",
        "CREATE INDEX document_type_idx IF NOT EXISTS FOR (d:Document) ON (d.type)",
        "CREATE INDEX document_date_idx IF NOT EXISTS FOR (d:Document) ON (d.date)"
    ]
    
    print("Setting up database schema (constraints and indices)...")
    
    for constraint in constraints:
        try:
            graph.run(constraint)
        except Exception as e:
            print(f"Warning: Could not create constraint/index: {e}")
    
    print("Schema setup complete.")

# Known modules/services/processes/teams/objects (extend as needed)
KNOWN_MODULES = [
    "Heimdall App", "Import Service", "Portfolio Service", "Client Service",
    "Configuration Manager", "Data Validation Service", "Refactoring Service"
]
KNOWN_SERVICES = [
    "Import Configuration Manager", "File Service", "Client Service"
]
KNOWN_PROCESSES = [
    "Onboarding", "Order Processing", "Data Verification", "Invoicing", "Import"
]
KNOWN_TEAMS = [
    "Team Asgard", "Team Midgard", "Integrated Team", "App Support Team", "Development Team"
]
KNOWN_BUSINESS_OBJECTS = [
    "Client", "Portfolio", "Import", "Meeting", "Document", "User", "Role"
]

# Define module hierarchy for better relationships
MODULE_HIERARCHY = {
    "Heimdall App": ["Import Service", "Portfolio Service", "Client Service"],
    "Import Service": ["Configuration Manager", "File Service"],
    "Portfolio Service": ["Data Validation Service"],
    "Client Service": ["Onboarding"]
    # Add more based on actual system architecture
}

# Helper to merge nodes and avoid duplicates
def merge_node(graph, label, key, value, **properties):
    node = Node(label, **{key: value}, **properties)
    graph.merge(node, label, key)
    return node

# Extract and format date from document title or content
def extract_date_from_title(title):
    date_match = re.search(r'(20\d{2}-\d{2}-\d{2})', title)
    if date_match:
        return date_match.group(1)
    
    # Try to handle formats like "2023-04-04" or "2024-01-09"
    date_match = re.search(r'(20\d{2})[-_](\d{2})[-_](\d{2})', title)
    if date_match:
        return f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"
    
    # Try year-month format
    date_match = re.search(r'(20\d{2})[-_](\d{2})', title)
    if date_match:
        return f"{date_match.group(1)}-{date_match.group(2)}-01"
    
    # Try just year
    date_match = re.search(r'\b(20\d{2})\b', title)
    if date_match:
        return f"{date_match.group(1)}-01-01"
    
    return None

# Extract meeting topics from content
def extract_meeting_topics(content):
    topics = []
    
    # Look for agenda items, bullet points, or sections
    agenda_items = re.findall(r'(?:Agenda|Topics|Discussion|Discussed|Points|Items):?\s*(.*?)(?:\n\n|\Z)', content, re.DOTALL | re.IGNORECASE)
    for item in agenda_items:
        # Split by bullets or numbers
        sub_items = re.split(r'[\n•\-\d+\.]', item)
        topics.extend([t.strip() for t in sub_items if t.strip() and len(t.strip()) > 5])
    
    # Look for capitalized phrases which might be topics
    cap_phrases = re.findall(r'([A-Z][a-z]{2,}(?:\s+[a-z]{1,3}\s+)?(?:[A-Z][a-z]+)+)', content)
    topics.extend([phrase for phrase in cap_phrases if len(phrase) > 10 and phrase.lower() not in [t.lower() for t in topics]])
    
    # Use NLP to identify key noun phrases if limited topics found
    if len(topics) < 3:
        doc = nlp(content[:5000])  # Limit content to avoid processing too much
        noun_chunks = [chunk.text for chunk in doc.noun_chunks 
                      if len(chunk.text) > 10 
                      and not chunk.text.lower().startswith(('i ', 'we ', 'you ', 'they ', 'he ', 'she ', 'it ', 'this ', 'that '))]
        topics.extend(noun_chunks[:5])  # Add up to 5 noun chunks
    
    return list(set(topics))[:8]  # Limit to 8 unique topics

# Extract decisions and action items from content
def extract_decisions_actions(content):
    decisions = []
    actions = []
    
    # Extract decisions
    decision_sections = re.findall(r'(?:Decisions|Decision|Decided|Conclusion|Agreed):?\s*(.*?)(?:\n\n|\Z)', content, re.DOTALL | re.IGNORECASE)
    for section in decision_sections:
        items = re.split(r'[\n•\-\d+\.]', section)
        decisions.extend([d.strip() for d in items if d.strip() and len(d.strip()) > 10])
    
    # Extract actions and assignees
    action_sections = re.findall(r'(?:Actions|Action Items|Next Steps|ToDo|Tasks):?\s*(.*?)(?:\n\n|\Z)', content, re.DOTALL | re.IGNORECASE)
    for section in action_sections:
        items = re.split(r'[\n•\-\d+\.]', section)
        for item in items:
            item = item.strip()
            if item and len(item) > 10:
                # Try to extract assignee using @ symbol, parentheses, or "assigned to" phrase
                assignee = None
                assignee_patterns = [
                    r'@([A-Za-z\s]+)',
                    r'\(([A-Za-z\s]+)\)',
                    r'assigned to (\w+)',
                    r'responsible:\s*(\w+)',
                    r'owner:\s*(\w+)'
                ]
                
                for pattern in assignee_patterns:
                    match = re.search(pattern, item, re.IGNORECASE)
                    if match:
                        assignee = match.group(1).strip()
                        break
                        
                actions.append((item, assignee))
    
    return decisions, actions

# Extract status updates from content
def extract_status_updates(content):
    statuses = {}
    status_patterns = [
        r'(\w+(?:\s+\w+){0,3})\s+status:?\s*(completed|in progress|blocked|pending|done|planned|started)',
        r'status of (\w+(?:\s+\w+){0,3}):?\s*(completed|in progress|blocked|pending|done|planned|started)',
        r'(\w+(?:\s+\w+){0,3}) is (completed|in progress|blocked|pending|done|planned|started)'
    ]
    
    for pattern in status_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        for entity, status in matches:
            statuses[entity.strip()] = status.strip().lower()
    
    return statuses

# Enrich document node with metadata
def enrich_document_node(doc_node, json_data):
    # Add document content
    if json_data.get("content"):
        doc_node["content"] = json_data["content"]
    
    # Add creation and modification dates
    if json_data.get("history"):
        history = json_data["history"]
        if history.get("createdDate"):
            doc_node["created"] = history["createdDate"]
        if history.get("lastUpdated"):
            doc_node["updated"] = history["lastUpdated"]
    
    # Add labels/tags if present
    if json_data.get("labels"):
        doc_node["labels"] = ",".join(json_data["labels"])
    
    # Add document type classification using the improved classifier
    doc_node["type"], confidence = classify_document_type(json_data.get("title", ""), json_data.get("content", ""))
    doc_node["type_confidence"] = confidence
    
    # Extract and add date from title
    date = extract_date_from_title(json_data.get("title", ""))
    if date:
        doc_node["date"] = date
    
    # Add embedding for semantic search
    content = json_data.get("content", "")
    if content and len(content) > 10:
        embedding = get_ollama_embedding(content)
        if embedding:
            # Store as a list of floats (Neo4j 5+ supports float arrays)
            doc_node["embedding"] = embedding
        else:
            doc_node["embedding"] = None
    else:
        doc_node["embedding"] = None
    
    return doc_node

def extract_relationship_context(entity_a, entity_b, content, window_size=100):
    """Extract the context around two entities in the content"""
    # Normalize entity names for searching
    entity_a_lower = str(entity_a).lower()
    entity_b_lower = str(entity_b).lower()
    content_lower = content.lower()
    
    # Find occurrences of both entities
    a_positions = [m.start() for m in re.finditer(r'\b' + re.escape(entity_a_lower) + r'\b', content_lower)]
    b_positions = [m.start() for m in re.finditer(r'\b' + re.escape(entity_b_lower) + r'\b', content_lower)]
    
    if not a_positions or not b_positions:
        return ""
    
    # Find closest pair of occurrences
    min_distance = float('inf')
    closest_pair = None
    
    for a_pos in a_positions:
        for b_pos in b_positions:
            distance = abs(a_pos - b_pos)
            if distance < min_distance:
                min_distance = distance
                closest_pair = (min(a_pos, b_pos), max(a_pos, b_pos))
    
    if not closest_pair:
        return ""
    
    # Extract context window around the closest occurrences
    start_pos = max(0, closest_pair[0] - window_size)
    end_pos = min(len(content), closest_pair[1] + window_size)
    
    context = content[start_pos:end_pos]
    
    # Clean up the context
    context = re.sub(r'\s+', ' ', context).strip()
    
    return context

def classify_document_type(title, content):
    """More precise document classification with confidence scores"""
    doc_types = {
        "Meeting": ["meeting", "notes", "minutes", "discussion", "sync", "workshop", "kick-off", "session", "brainstorming"],
        "Design": ["design", "architecture", "blueprint", "structure", "framework", "pattern"],
        "Planning": ["roadmap", "plan", "strategy", "timeline", "milestone", "schedule", "project plan"],
        "Review": ["review", "retrospective", "postmortem", "analysis", "assessment", "evaluation"],
        "Requirements": ["requirements", "specifications", "user stories", "backlog", "feature", "epic"],
        "Technical": ["technical", "implementation", "code", "solution", "development", "algorithm"],
        "Process": ["process", "workflow", "procedure", "guide", "standard", "protocol"],
        "Brainstorming": ["brainstorming", "ideation", "ideas", "creative", "concept"],
        "Documentation": ["documentation", "manual", "guide", "handbook", "reference"]
    }
    
    title_lower = title.lower()
    content_sample = content[:3000].lower() if content else ""  # Sample first 3000 chars
    
    type_scores = {}
    for doc_type, keywords in doc_types.items():
        title_score = sum(3 for kw in keywords if kw in title_lower)
        content_score = sum(1 for kw in keywords if content_sample and kw in content_sample)
        type_scores[doc_type] = title_score + content_score
    
    best_type = max(type_scores.items(), key=lambda x: x[1])
    if best_type[1] > 0:
        return best_type[0], best_type[1]
    return "Document", 0  # Default type

def classify_relationship_semantics(rel_type, text_context):
    """Add semantic properties to relationships based on context"""
    semantic_indicators = {
        "RELATES_TO": {
            "collaborates_with": ["collaborate", "work together", "partnership", "joint", "cooperate"],
            "depends_on": ["depends", "requires", "needs", "reliant on", "prerequisite", "dependency"],
            "impacts": ["affects", "impacts", "influences", "changes", "alters", "modifies"],
            "implements": ["implements", "executes", "carries out", "fulfills", "realizes"],
            "reports_to": ["reports to", "supervised by", "managed by", "responsible to"],
            "communicates_with": ["communicates", "talks to", "informs", "notifies", "updates"],
            "creates": ["creates", "produces", "generates", "makes", "builds"]
        },
        "PART_OF": {
            "component_of": ["component", "module", "part", "element"],
            "subtype_of": ["type", "category", "class", "kind"],
            "member_of": ["member", "belongs", "participant", "in group"]
        },
        "MENTIONS": {
            "positively_mentions": ["good", "great", "excellent", "positive", "success", "well"],
            "negatively_mentions": ["bad", "poor", "issue", "problem", "concern", "fail"],
            "neutrally_mentions": ["mentioned", "referenced", "noted", "stated"]
        }
    }
    
    # Default confidence is medium
    confidence = 0.5
    semantic_subtype = None
    
    if rel_type in semantic_indicators:
        for semantic, keywords in semantic_indicators[rel_type].items():
            # Check for keyword matches
            matches = sum(1 for kw in keywords if kw in text_context.lower())
            if matches > 0:
                # Increase confidence based on number of matches
                match_confidence = min(0.9, 0.5 + (matches * 0.1))
                
                # If this semantic has more evidence than current best, update
                if match_confidence > confidence:
                    confidence = match_confidence
                    semantic_subtype = semantic
    
    return semantic_subtype

def extract_custom_entities(title, content):
    entities = []
    # Check for known modules/services/processes/teams/objects in title/content
    for mod in KNOWN_MODULES:
        if mod.lower() in title.lower() or mod.lower() in content.lower():
            entities.append(("Module", mod))
    for svc in KNOWN_SERVICES:
        if svc.lower() in title.lower() or svc.lower() in content.lower():
            entities.append(("Service", svc))
    for proc in KNOWN_PROCESSES:
        if proc.lower() in title.lower() or proc.lower() in content.lower():
            entities.append(("Process", proc))
    for team in KNOWN_TEAMS:
        if team.lower() in title.lower() or team.lower() in content.lower():
            entities.append(("Team", team))
    for obj in KNOWN_BUSINESS_OBJECTS:
        if obj.lower() in title.lower() or obj.lower() in content.lower():
            entities.append(("BusinessObject", obj))
    # Regex for capitalized phrases (potential modules/services/teams)
    cap_phrases = re.findall(r'([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)', content)
    for phrase in set(cap_phrases):
        if ("Service" in phrase or "Manager" in phrase or "Module" in phrase or
            "Process" in phrase or "Team" in phrase or "Meeting" in phrase):
            entities.append(("DomainEntity", phrase))
    return entities

def extract_relationships_from_content(content, node_map):
    rels = []
    # Define relationship patterns with better context capture
    relationship_patterns = [
        (r'(\w+(?:\s+\w+){0,3})\s+implements\s+(\w+(?:\s+\w+){0,3})', "IMPLEMENTS"),
        (r'(\w+(?:\s+\w+){0,3})\s+depends\s+on\s+(\w+(?:\s+\w+){0,3})', "DEPENDS_ON"),
        (r'(\w+(?:\s+\w+){0,3})\s+part\s+of\s+(\w+(?:\s+\w+){0,3})', "PART_OF"),
        (r'(\w+(?:\s+\w+){0,3})\s+owns\s+(\w+(?:\s+\w+){0,3})', "OWNS"),
        (r'(\w+(?:\s+\w+){0,3})\s+configures\s+(\w+(?:\s+\w+){0,3})', "CONFIGURES"),
        (r'(\w+(?:\s+\w+){0,3})\s+mentions\s+(\w+(?:\s+\w+){0,3})', "MENTIONS"),
        (r'(\w+(?:\s+\w+){0,3})\s+attended\s+by\s+(\w+(?:\s+\w+){0,3})', "ATTENDED_BY"),
        (r'(\w+(?:\s+\w+){0,3})\s+authored\s+by\s+(\w+(?:\s+\w+){0,3})', "AUTHORED_BY"),
        (r'(\w+(?:\s+\w+){0,3})\s+uses\s+(\w+(?:\s+\w+){0,3})', "USES"),
        (r'(\w+(?:\s+\w+){0,3})\s+provides\s+(\w+(?:\s+\w+){0,3})', "PROVIDES"),
        (r'(\w+(?:\s+\w+){0,3})\s+manages\s+(\w+(?:\s+\w+){0,3})', "MANAGES"),
        (r'(\w+(?:\s+\w+){0,3})\s+supports\s+(\w+(?:\s+\w+){0,3})', "SUPPORTS"),
        (r'(\w+(?:\s+\w+){0,3})\s+replaces\s+(\w+(?:\s+\w+){0,3})', "REPLACES"),
        (r'(\w+(?:\s+\w+){0,3})\s+extends\s+(\w+(?:\s+\w+){0,3})', "EXTENDS")
    ]
    
    # Process each relationship pattern
    for pattern, rel_type in relationship_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        for a, b in matches:
            source_found = None
            target_found = None
            
            # Find most likely node matches in node_map
            for key, node in node_map.items():
                if isinstance(node, Node) and hasattr(node, "name") and node.get("name"):
                    node_name = node.get("name", "").lower()
                    a_lower = a.lower().strip()
                    b_lower = b.lower().strip()
                    
                    # Match using flexible substring matching
                    if (a_lower in node_name or node_name in a_lower) and len(a_lower) > 3:
                        source_found = node
                    if (b_lower in node_name or node_name in b_lower) and len(b_lower) > 3:
                        target_found = node
                
            if source_found and target_found and source_found != target_found:
                # Extract context for semantic classification
                context = extract_relationship_context(a, b, content)
                
                # Create relationship
                rel = Relationship(source_found, rel_type, target_found)
                
                # Add relationship properties
                rel["source_text"] = a.strip()
                rel["target_text"] = b.strip()
                
                # Add semantic classification if available
                semantic = classify_relationship_semantics(rel_type, context)
                if semantic:
                    rel["semantic_type"] = semantic
                
                # Add context excerpt if available
                if context:
                    rel["context"] = context[:200]  # Limit context length
                
                rels.append(rel)
    
    # Enhanced entity co-occurrence with context analysis
    entity_pairs = []
    for a in node_map:
        for b in node_map:
            if a != b and isinstance(node_map[a], Node) and isinstance(node_map[b], Node):
                entity_a_name = node_map[a].get("name", "") or a
                entity_b_name = node_map[b].get("name", "") or b
                
                # Skip if either entity name is too short or not a string
                if not isinstance(entity_a_name, str) or not isinstance(entity_b_name, str):
                    continue
                if len(entity_a_name) < 3 or len(entity_b_name) < 3:
                    continue
                
                # Only consider entities that are mentioned in the content
                if (entity_a_name.lower() in content.lower() and 
                    entity_b_name.lower() in content.lower()):
                    
                    # Extract context where entities co-occur
                    context = extract_relationship_context(entity_a_name, entity_b_name, content)
                    
                    if context:
                        # Calculate proximity score
                        paragraphs = content.split('\n\n')
                        co_paragraphs = sum(1 for p in paragraphs 
                                           if entity_a_name.lower() in p.lower() 
                                           and entity_b_name.lower() in p.lower())
                        
                        # Only create relationship if they appear in same paragraph at least once
                        if co_paragraphs > 0:
                            # Determine relationship type based on entity types
                            rel_type = "RELATES_TO"  # Default relationship type
                            
                            # Add semantic classification
                            semantic = classify_relationship_semantics(rel_type, context)
                            
                            # Create relationship with metadata
                            rel = Relationship(node_map[a], rel_type, node_map[b])
                            rel["context"] = context[:200]
                            rel["co_occurrence_count"] = co_paragraphs
                            rel["confidence"] = min(0.9, 0.3 + (co_paragraphs * 0.1))
                            
                            if semantic:
                                rel["semantic_type"] = semantic
                            
                            rels.append(rel)
    
    return rels

def calculate_relationship_confidence(source, target, content, relationship_type):
    """Calculate confidence score for a relationship based on textual evidence"""
    # Base confidence - default low confidence for inferred relationships
    base_confidence = 0.3
    
    # Convert entity names to lowercase for matching
    source_lower = source.lower()
    target_lower = target.lower()
    content_lower = content.lower()
    
    # Check for direct relationship patterns
    direct_patterns = {
        "IMPLEMENTS": [f"{source_lower} implements {target_lower}", f"{source_lower} implementing {target_lower}"],
        "DEPENDS_ON": [f"{source_lower} depends on {target_lower}", f"{source_lower} depending on {target_lower}", f"{source_lower} requires {target_lower}"],
        "PART_OF": [f"{source_lower} part of {target_lower}", f"{source_lower} belongs to {target_lower}", f"{source_lower} within {target_lower}"],
        "OWNS": [f"{source_lower} owns {target_lower}", f"{target_lower} owned by {source_lower}", f"{source_lower} responsible for {target_lower}"],
        "USES": [f"{source_lower} uses {target_lower}", f"{source_lower} utilizing {target_lower}", f"{source_lower} with {target_lower}"],
        "RELATES_TO": [f"{source_lower} relates to {target_lower}", f"{source_lower} connected to {target_lower}", f"{source_lower} associated with {target_lower}"]
    }
    
    # Check if direct relationship patterns exist in content
    if relationship_type in direct_patterns:
        for pattern in direct_patterns[relationship_type]:
            if pattern in content_lower:
                # High confidence for direct statement
                return 0.9
    
    # Check proximity - entities mentioned in same paragraph
    paragraphs = content.split('\n\n')
    co_paragraph_count = sum(1 for p in paragraphs if source_lower in p.lower() and target_lower in p.lower())
    
    if co_paragraph_count > 0:
        # Medium confidence for co-occurrence in same paragraph
        base_confidence = max(base_confidence, 0.5 + (min(co_paragraph_count, 5) * 0.05))
    
    # Check sentence-level co-occurrence for higher confidence
    sentences = re.split(r'[.!?]\s+', content)
    co_sentence_count = sum(1 for s in sentences if source_lower in s.lower() and target_lower in s.lower())
    
    if co_sentence_count > 0:
        # Higher confidence for co-occurrence in same sentence
        base_confidence = max(base_confidence, 0.6 + (min(co_sentence_count, 3) * 0.1))
    
    # Cap confidence at 0.9 for inferred relationships
    return min(0.9, base_confidence)

def validate_node_data(node):
    """Validate node data quality before insertion"""
    required_fields = {
        "Document": ["title"],
        "Person": ["name"],
        "Module": ["name"],
        "Service": ["name"],
        "Team": ["name"],
        "Process": ["name"],
        "Topic": ["name"],
        "BusinessObject": ["name"],
        "Date": ["value"],
        "Decision": ["text"],
        "ActionItem": ["text"]
    }
    
    # Check if node has required fields based on label
    for label in node.labels:
        if label in required_fields:
            for field in required_fields[label]:
                if not node.get(field):
                    return False, f"Missing required field '{field}' for {label} node"
    
    # Validate field formats
    if "date" in node and not re.match(r'^\d{4}-\d{2}-\d{2}$', str(node["date"])):
        return False, f"Invalid date format: {node['date']}"
    
    # Check for minimum content length for text fields
    text_fields = ["title", "content", "text", "name"]
    for field in text_fields:
        if field in node and isinstance(node[field], str):
            if len(node[field].strip()) < 2:  # Minimum sensible length
                return False, f"Field '{field}' too short: '{node[field]}'"
    
    return True, None

def generate_meeting_id(title, date):
    """Generate a unique meeting ID based on title and date."""
    base = f"{title.strip().lower()}_{date or ''}"
    return hashlib.md5(base.encode('utf-8')).hexdigest()

def extract_entities_and_relationships(json_data):
    nodes = []
    rels = []
    node_map = {}
    title = json_data.get("title", "")
    content = json_data.get("content", "")
    author = json_data.get("history", {}).get("createdBy", {}).get("displayName")

    # --- Improved Meeting Note Detection ---
    def is_meeting_note(title, content):
        meeting_keywords = [
            "meeting", "minutes", "kick-off", "workshop", "sync", "session", "standup", "review", "retrospective", "notes", "call", "discussion"
        ]
        title_l = title.lower()
        content_l = content.lower()
        # Check for keywords in title or first 500 chars of content
        if any(kw in title_l for kw in meeting_keywords):
            return True
        if any(kw in content_l[:500] for kw in meeting_keywords):
            return True
        # Heuristic: presence of participants, agenda, or decisions sections
        if re.search(r'(participants|attendees|agenda|decisions|action items|next steps)', content_l):
            return True
        return False

    # --- Improved Participant Extraction ---
    def extract_participants(content):
        participants = set()
        # Look for explicit participant/attendee lists
        patterns = [
            r'(?:Participants|Attendees|Present)\s*[:\-]?\s*(.*?)(?:\n\n|\n[A-Z][a-z]+:|\nAgenda|\nDiscussion|\n$)',
            r'(?:By|With)\s*[:\-]?\s*(.*?)(?:\n\n|\n[A-Z][a-z]+:|\nAgenda|\nDiscussion|\n$)'
        ]
        for pat in patterns:
            matches = re.findall(pat, content, re.IGNORECASE | re.DOTALL)
            for match in matches:
                # Split by comma, semicolon, or newlines
                for name in re.split(r'[\n,;•\-]', match):
                    name = name.strip()
                    if 2 < len(name) < 50 and not name.lower().startswith(("agenda", "discussion", "decision", "action")):
                        participants.add(name)
        # Fallback: look for lines like "- John Doe (Role)" at the top
        lines = content.split('\n')[:20]
        for line in lines:
            m = re.match(r'[-•*]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)', line)
            if m:
                participants.add(m.group(1))
        return list(participants)

    # --- Document Node Creation and Enrichment ---
    # Create and enrich document node
    doc_node = Node("Document", title=title)
    doc_node = enrich_document_node(doc_node, json_data)
    nodes.append(doc_node)
    node_map["Document"] = doc_node
    
    # Add author relationship
    if author:
        person_node = Node("Person", name=author)
        nodes.append(person_node)
        rels.append(Relationship(doc_node, "AUTHORED_BY", person_node))
        node_map["Author"] = person_node
    
    # Resolve entity references for better entity recognition
    def normalize_name(name):
        """Normalize names to help with entity resolution"""
        if not name:
            return ""
        # Convert to lowercase and remove punctuation
        normalized = re.sub(r'[^\w\s]', '', name.lower())
        # Remove common titles and roles
        normalized = re.sub(r'\b(mr|mrs|ms|dr|prof|sir)\b\.?\s*', '', normalized)
        return normalized.strip()
    
    # Function to check if two entities likely refer to the same person
    def is_same_entity(name1, name2):
        if not name1 or not name2:
            return False
            
        n1 = normalize_name(name1)
        n2 = normalize_name(name2)
        
        # Check for exact match after normalization
        if n1 == n2:
            return True
            
        # Check if one is contained in the other
        if len(n1) > 3 and len(n2) > 3:
            if n1 in n2 or n2 in n1:
                return True
                
        # Check for first or last name matches
        parts1 = n1.split()
        parts2 = n2.split()
        
        if len(parts1) > 0 and len(parts2) > 0:
            # Check first names
            if parts1[0] == parts2[0] and len(parts1[0]) > 2:
                return True
                
            # Check last names
            if parts1[-1] == parts2[-1] and len(parts1[-1]) > 3:
                return True
                
        return False
    
    # NLP entity extraction from content
    doc = nlp(content)
    entity_types = defaultdict(list)
    for ent in doc.ents:
        entity_types[ent.label_].append(ent.text)
        
    # --- Enhanced Person Extraction with Role Detection and Entity Resolution ---
    person_roles = {}
    # Regex for 'Name (Role)' or 'Role: Name' patterns
    role_patterns = re.findall(r'(\b[A-Z][a-z]+\b)\s*\(([^)]+)\)', content)
    for name, role in role_patterns:
        person_roles[name] = role
    role_patterns2 = re.findall(r'([A-Za-z ]+):\s*([A-Z][a-z]+)', content)
    for role, name in role_patterns2:
        person_roles[name] = role.strip()
        
    # Use entity resolution to avoid duplicate person nodes
    person_entities = {}
    
    # First, check if the author should be added to person entities
    if author:
        person_entities[normalize_name(author)] = {
            "name": author,
            "role": None,
            "node": node_map.get("Author"),
            "mentions": ["author"]
        }
        
    # Process all person entities from NER
    for person in set(entity_types["PERSON"]):
        norm_name = normalize_name(person)
        role = person_roles.get(person)
        
        # Check if this entity already exists (may be the author or previously found)
        found_match = False
        for existing_norm_name, entity_data in person_entities.items():
            if is_same_entity(norm_name, existing_norm_name):
                # This is likely the same person - add as a mention
                entity_data["mentions"].append(person)
                found_match = True
                
                # Add role if we don't have one yet
                if not entity_data["role"] and role:
                    entity_data["role"] = role
                break
                
        # If no match found, add as new entity
        if not found_match:
            # Create a new node unless this is the author
            if not author or not is_same_entity(norm_name, normalize_name(author)):
                person_node = Node("Person", name=person)
                if role:
                    person_node["role"] = role
                nodes.append(person_node)
                rels.append(Relationship(doc_node, "MENTIONS", person_node))
                
                person_entities[norm_name] = {
                    "name": person,
                    "role": role,
                    "node": person_node,
                    "mentions": [person]
                }
                node_map[person] = person_node
                
    # Update the node_map with resolved entities
    for _, entity_data in person_entities.items():
        for mention in entity_data["mentions"]:
            if mention != entity_data["name"]:  # Skip if it's the primary name
                node_map[mention] = entity_data["node"]
                
    for date in set(entity_types["DATE"]):
        date_node = Node("Date", value=date)
        nodes.append(date_node)
        rels.append(Relationship(doc_node, "MENTIONS", date_node))
        node_map[date] = date_node
    # Custom entity extraction for modules/services/processes/teams/objects
    custom_entities = extract_custom_entities(title, content)
    for label, name in set(custom_entities):
        node = Node(label, name=name)
        nodes.append(node)
        rels.append(Relationship(doc_node, "DESCRIBES", node))
        node_map[name] = node
    # Expand relationship extraction based on schema and document structure
    rels.extend(extract_relationships_from_content(content, node_map))
    # Example: Ownership/Team relationships from document structure
    if "team" in title.lower() or "roles" in title.lower():
        for person in node_map:
            if isinstance(node_map[person], Node) and node_map[person].labels == {"Person"}:
                rels.append(Relationship(node_map[person], "HAS_ROLE", doc_node))
                
    # Meeting/attendance extraction
    is_meeting = is_meeting_note(title, content) or doc_node.get("type") == "Meeting"
    if is_meeting:
        # Assign unique meeting ID
        meeting_date = doc_node.get("date")
        meeting_id = generate_meeting_id(title, meeting_date)
        doc_node["meeting_id"] = meeting_id
        doc_node.add_label("Meeting")
        # Extract participants (improved)
        participants = extract_participants(content)
        for person in participants:
            if person not in node_map:
                person_node = Node("Person", name=person)
                nodes.append(person_node)
                node_map[person] = person_node
            rels.append(Relationship(doc_node, "ATTENDED_BY", node_map[person]))
        # Extract meeting topics
        topics = extract_meeting_topics(content)
        for topic in topics:
            if len(topic) > 5:
                topic_node = Node("Topic", name=topic)
                nodes.append(topic_node)
                rels.append(Relationship(doc_node, "DISCUSSES", topic_node))
                node_map[f"Topic:{topic}"] = topic_node
        # Extract decisions
        decisions, actions = extract_decisions_actions(content)
        for i, decision in enumerate(decisions):
            if decision and len(decision) > 10:
                decision_node = Node("Decision", text=decision)
                nodes.append(decision_node)
                decision_rel = Relationship(doc_node, "DECIDED", decision_node)
                if doc_node.get("date"):
                    decision_rel["when"] = doc_node.get("date")
                rels.append(decision_rel)
                node_map[f"Decision:{i}"] = decision_node
        # Extract action items with assignees
        for i, (action, assignee) in enumerate(actions):
            if action and len(action) > 10:
                action_node = Node("ActionItem", text=action)
                if doc_node.get("date"):
                    action_node["created_date"] = doc_node.get("date")
                nodes.append(action_node)
                action_rel = Relationship(doc_node, "CREATED_ACTION", action_node)
                rels.append(action_rel)
                node_map[f"ActionItem:{i}"] = action_node
                # Connect action to assignee
                if assignee:
                    # Try to find person in node_map
                    assignee_node = None
                    for key, node in node_map.items():
                        if isinstance(node, Node) and "Person" in node.labels and node.get("name"):
                            if assignee.lower() in node.get("name", "").lower():
                                assignee_node = node
                                break
                    if assignee_node:
                        rels.append(Relationship(action_node, "ASSIGNED_TO", assignee_node))
                    else:
                        new_person = Node("Person", name=assignee)
                        nodes.append(new_person)
                        rels.append(Relationship(action_node, "ASSIGNED_TO", new_person))
                        node_map[f"Person:{assignee}"] = new_person
        # Mark attendance (deduped)
        for person in participants:
            if person in node_map:
                attendance_rel = Relationship(doc_node, "ATTENDED_BY", node_map[person])
                if doc_node.get("date"):
                    attendance_rel["on_date"] = doc_node.get("date")
                rels.append(attendance_rel)
        # Cross-link related meetings (follow-ups, recurring)
        followup_matches = re.findall(r'follow[- ]?up to ([^\n\r]+)', content, re.IGNORECASE)
        for ref in followup_matches:
            ref_date = extract_date_from_title(ref)
            ref_id = generate_meeting_id(ref, ref_date)
            result = graph.run("MATCH (m:Meeting {meeting_id: $mid}) RETURN m LIMIT 1", mid=ref_id).data()
            if result:
                ref_node = result[0]["m"]
                rels.append(Relationship(doc_node, "FOLLOWS_UP", ref_node))
        if "recurring" in content.lower():
            doc_node["recurring"] = True
    
    # Extract status updates
    statuses = extract_status_updates(content)
    for entity, status in statuses.items():
        for key, node in node_map.items():
            if isinstance(node, Node) and hasattr(node, "name") and entity.lower() in key.lower():
                # Create status node
                status_node = Node("Status", value=status)
                nodes.append(status_node)
                status_rel = Relationship(node, "HAS_STATUS", status_node)
                # Add timestamp for status tracking
                if doc_node.get("date"):
                    status_rel["as_of"] = doc_node.get("date")
                else:
                    status_rel["as_of"] = datetime.now().strftime("%Y-%m-%d")
                rels.append(status_rel)
                break
    
    # Create hierarchical relationships between modules
    for parent, children in MODULE_HIERARCHY.items():
        parent_node = None
        # Find parent node
        for key, node in node_map.items():
            if isinstance(node, Node) and hasattr(node, "name") and node.get("name", "").lower() == parent.lower():
                parent_node = node
                break
        
        if parent_node:
            # Find child nodes
            for child in children:
                child_node = None
                for key, node in node_map.items():
                    if isinstance(node, Node) and hasattr(node, "name") and node.get("name", "").lower() == child.lower():
                        child_node = node
                        break
                
                if child_node:
                    hier_rel = Relationship(child_node, "PART_OF", parent_node)
                    hier_rel["hierarchical"] = True
                    rels.append(hier_rel)
    
    # Add relationship strength for entity co-occurrences
    entity_keys = [k for k in node_map.keys() if k != "Document" and k != "DocumentDate" and not k.startswith("Topic:") and not k.startswith("Decision:")]
    for i, key1 in enumerate(entity_keys):
        for key2 in entity_keys[i+1:]:
            if key1 != key2:
                # Skip if either entity is not in content
                entity1_name = node_map[key1].get("name", "") or key1
                entity2_name = node_map[key2].get("name", "") or key2
                
                if (entity1_name.lower() in content.lower() and 
                    entity2_name.lower() in content.lower() and
                    len(str(entity1_name)) > 3 and len(str(entity2_name)) > 3):
                    
                    # Calculate relationship strength based on co-occurrence
                    # Base strength on co-occurrence within same paragraphs
                    paragraphs = content.split('\n\n')
                    co_occurrences = sum(1 for p in paragraphs if str(entity1_name).lower() in p.lower() and str(entity2_name).lower() in p.lower())
                    
                    # Calculate simple strength score
                    strength = min(1.0, co_occurrences * 0.2)
                    # Only create relationship if significant strength
                    if strength > 0.2:
                        rel = Relationship(node_map[key1], "RELATES_TO", node_map[key2])
                        rel["strength"] = round(strength, 2)
                        rel["source"] = doc_node["title"]
                        rels.append(rel)
                
    return nodes, rels

def batch_process_files(files, batch_size=5):
    """Process files in batches with proper transaction management and improved error logging"""
    total_files = len(files)
    batches = [files[i:i + batch_size] for i in range(0, total_files, batch_size)]
    
    total_nodes_created = 0
    total_rels_created = 0
    total_files_processed = 0
    total_errors = 0
    failed_nodes = []
    failed_rels = []
    
    for i, batch in enumerate(batches):
        print(f"Processing batch {i+1}/{len(batches)} ({len(batch)} files)...")
        batch_nodes = []
        batch_rels = []
        batch_files_processed = 0
        batch_failed_nodes = []
        batch_failed_rels = []
        
        # Extract entities and relationships from all files in batch
        for filename in batch:
            try:
                with open(os.path.join(data_dir, filename), "r") as f:
                    data = json.load(f)
                    nodes, rels = extract_entities_and_relationships(data)
                    # Validate nodes before adding to batch
                    valid_nodes = []
                    invalid_count = 0
                    for node in nodes:
                        is_valid, error_msg = validate_node_data(node)
                        if is_valid:
                            valid_nodes.append(node)
                        else:
                            invalid_count += 1
                            batch_failed_nodes.append({"file": filename, "node": dict(node), "error": error_msg})
                            print(f"  Warning: Invalid node data in {filename}: {error_msg}")
                    batch_nodes.extend(valid_nodes)
                    batch_rels.extend(rels)
                    batch_files_processed += 1
                    if invalid_count > 0:
                        print(f"  Skipped {invalid_count} invalid nodes from {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")
                total_errors += 1
                continue
        # Process nodes in a dedicated transaction
        nodes_created = 0
        rels_created = 0
        failed_node_ids = set()
        node_to_id = {}                # Step 1: Process nodes transaction
        tx_nodes = graph.begin()
        constraint_failed_nodes = set()  # Track nodes that failed due to constraints
        try:
            # Insert valid nodes using tx.merge
            for node in batch_nodes:
                try:
                    label = list(node.labels)[0]
                    key = "title" if "title" in node else ("name" if "name" in node else ("value" if "value" in node else None))
                    if key:
                        tx_nodes.merge(node, label, key)
                        # Track node id for filtering relationships
                        node_to_id[id(node)] = node
                        nodes_created += 1
                except Exception as e:
                    # Check if this is a constraint violation - we'll handle these differently
                    if "ConstraintValidation" in str(e):
                        # For constraint violations, we should try to find the existing node
                        # and map it to our in-memory node to preserve relationships
                        constraint_failed_nodes.add(id(node))
                        # Add to failures for logging
                        batch_failed_nodes.append({"node": dict(node), "error": f"Constraint violation: {str(e)}"})
                    else:
                        # Regular error - add to failed nodes
                        batch_failed_nodes.append({"node": dict(node), "error": str(e)})
                        failed_node_ids.add(id(node))
                    print(f"  Error merging node: {e}")
            
            # Commit the node transaction
            tx_nodes.commit()
            print(f"  Successfully committed {nodes_created} nodes")
            
            # Step 2: Process relationships in a separate transaction
            # Try to resolve constraint failed nodes by looking them up in the database
            node_replacements = {}
            for node_id in constraint_failed_nodes:
                for node in batch_nodes:
                    if id(node) == node_id:
                        try:
                            # Get the label and key property
                            label = list(node.labels)[0]
                            key_prop = "title" if "title" in node else ("name" if "name" in node else ("value" if "value" in node else None))
                            
                            if key_prop and node.get(key_prop):
                                # Try to find the existing node in the database
                                query = f"MATCH (n:{label} {{{key_prop}: $val}}) RETURN n LIMIT 1"
                                result = graph.run(query, val=node[key_prop]).data()
                                
                                if result:
                                    # Store the existing node as a replacement
                                    node_replacements[node_id] = result[0]['n']
                                    print(f"  Found existing node for constraint conflict: {label} with {key_prop}={node[key_prop]}")
                        except Exception as e:
                            print(f"  Error finding replacement for constraint-failed node: {e}")
            
            # Filter out relationships involving failed nodes, replacing constraint-failed nodes with their DB versions
            filtered_rels = []
            for rel in batch_rels:
                try:
                    start_id = id(rel.start_node)
                    end_id = id(rel.end_node)
                    
                    # Skip if either node truly failed (not a constraint failure)
                    if start_id in failed_node_ids or end_id in failed_node_ids:
                        batch_failed_rels.append({"rel": str(rel), "error": "Relationship involves failed node"})
                        continue
                    
                    # Handle constraint-failed nodes by using replacements
                    start_replacement = node_replacements.get(start_id)
                    end_replacement = node_replacements.get(end_id)
                    
                    if start_replacement and end_replacement:
                        # Both nodes need replacement - create new relationship
                        new_rel = Relationship(start_replacement, rel.type, end_replacement)
                        # Copy properties
                        for key, value in rel.items():
                            new_rel[key] = value
                        filtered_rels.append(new_rel)
                    elif start_replacement:
                        # Only start node needs replacement
                        new_rel = Relationship(start_replacement, rel.type, rel.end_node)
                        # Copy properties
                        for key, value in rel.items():
                            new_rel[key] = value
                        filtered_rels.append(new_rel)
                    elif end_replacement:
                        # Only end node needs replacement
                        new_rel = Relationship(rel.start_node, rel.type, end_replacement)
                        # Copy properties
                        for key, value in rel.items():
                            new_rel[key] = value
                        filtered_rels.append(new_rel)
                    else:
                        # No replacements needed
                        filtered_rels.append(rel)
                except Exception as e:
                    batch_failed_rels.append({"rel": str(rel), "error": f"Error checking node ids: {e}"})
                    print(f"  Error filtering relationship: {e}")
            
            # Create relationships in a new transaction, processing in smaller batches
            if filtered_rels:
                # Process relationships in smaller sub-batches to avoid losing all relationships if one fails
                sub_batch_size = 50  # Process 50 relationships at a time
                rel_sub_batches = [filtered_rels[i:i + sub_batch_size] for i in range(0, len(filtered_rels), sub_batch_size)]
                
                for sub_batch in rel_sub_batches:
                    sub_tx = graph.begin()
                    sub_batch_success = 0
                    
                    try:
                        for rel in sub_batch:
                            try:
                                sub_tx.create(rel)
                                sub_batch_success += 1
                            except Exception as e:
                                batch_failed_rels.append({"rel": str(rel), "error": str(e)})
                                # Don't print every error to avoid console spam
                                if len(batch_failed_rels) % 50 == 0:
                                    print(f"  {len(batch_failed_rels)} failed relationships so far...")
                        
                        # Commit the sub-batch transaction
                        sub_tx.commit()
                        rels_created += sub_batch_success
                        print(f"  Successfully committed {sub_batch_success} relationships in sub-batch")
                    except Exception as e:
                        try:
                            sub_tx.rollback()
                        except Exception:
                            pass  # Already committed or closed
                        print(f"  Error in relationship sub-batch: {e}")
                
                print(f"  Total relationships created: {rels_created}")
            
            # Step 3: Update counters for successful batch
            total_nodes_created += nodes_created
            total_rels_created += rels_created
            total_files_processed += batch_files_processed
            print(f"  Batch {i+1} complete: Added {nodes_created} nodes and {rels_created} relationships")
            if batch_failed_nodes or batch_failed_rels:
                print(f"  Batch {i+1} had {len(batch_failed_nodes)} failed nodes and {len(batch_failed_rels)} failed relationships.")
        
        except Exception as e:
            # Exception in the main node transaction
            try:
                tx_nodes.rollback()
            except Exception:
                pass  # Already committed or closed
            print(f"Error in batch {i+1}: {e}")
            total_errors += 1
            # Add all relationships to failed_rels since we couldn't process nodes
            for rel in batch_rels:
                batch_failed_rels.append({"rel": str(rel), "error": f"Node transaction failed: {e}"})
        
        # Accumulate failures for summary
        failed_nodes.extend(batch_failed_nodes)
        failed_rels.extend(batch_failed_rels)
        # Accumulate failures for summary
        failed_nodes.extend(batch_failed_nodes)
        failed_rels.extend(batch_failed_rels)
    # Write failures to file for review
    if failed_nodes:
        with open("failed_nodes.log", "w") as f:
            for entry in failed_nodes:
                f.write(str(entry) + "\n")
    if failed_rels:
        with open("failed_relationships.log", "w") as f:
            for entry in failed_rels:
                f.write(str(entry) + "\n")
    if failed_nodes or failed_rels:
        print(f"\nSummary: {len(failed_nodes)} failed nodes and {len(failed_rels)} failed relationships logged to file.")
    return total_files_processed, total_nodes_created, total_rels_created, total_errors

def process_relationships(nodes, rels):
    """Enhance relationships with semantic types and confidence scores"""
    enhanced_count = 0
    
    # Create a transaction for batch processing
    tx = graph.begin()
    
    try:
        # Get existing relationships to enhance
        result = graph.run("""
        MATCH (a)-[r]->(b)
        WHERE NOT EXISTS(r.confidence)
        RETURN id(r) as rel_id, type(r) as rel_type, 
               startNode(r) as source, endNode(r) as target,
               CASE WHEN exists(r.context) THEN r.context ELSE '' END as context
        LIMIT 1000
        """).data()
        
        for rel_data in result:
            rel_id = rel_data["rel_id"]
            rel_type = rel_data["rel_type"]
            context = rel_data["context"]
            
            # Skip if no context to analyze
            if not context:
                continue
                
            # Classify the relationship semantics
            semantic_type = classify_relationship_semantics(rel_type, context)
            confidence = 0.7  # Default medium-high confidence
            
            # Update the relationship properties
            if semantic_type:
                # Build update query
                update_query = """
                MATCH ()-[r]->() 
                WHERE id(r) = $rel_id
                SET r.confidence = $confidence, r.semantic_type = $semantic_type
                """
                
                params = {"rel_id": rel_id, "confidence": confidence, "semantic_type": semantic_type}
                
                # Execute the update
                tx.run(update_query, parameters=params)
                enhanced_count += 1
        
        # Commit the transaction
        tx.commit()
        print(f"Enhanced {enhanced_count} relationships with semantic types and confidence scores")
        
    except Exception as e:
        tx.rollback()
        print(f"Error enhancing relationships: {e}")
    
    return enhanced_count

def create_domain_ontology():
    """Create hierarchical domain ontology for better entity classification"""
    print("Creating domain ontology...")
    
    # Define the domain ontology structure
    ontology = {
        "System": {
            "Module": KNOWN_MODULES,
            "Service": KNOWN_SERVICES,
            "Process": KNOWN_PROCESSES
        },
        "Organization": {
            "Team": KNOWN_TEAMS,
            "Role": ["Developer", "QA", "Manager", "Product Owner", "Project Manager", "Business Analyst", "Support"]
        },
        "Artifact": {
            "Document": ["Meeting Notes", "Specification", "Design Document", "User Story", "Requirements"],
            "Code": ["Frontend", "Backend", "API", "Database", "Infrastructure"],
            "Data": ["Schema", "Model", "Configuration", "Template", "Metadata"]
        }
    }
    
    # Track created nodes
    created_count = 0
    rel_count = 0
    
    # Start a transaction
    tx = graph.begin()
    
    try:
        # Create top-level DomainConcept node
        domain_concept = Node("DomainConcept", name="Heimdall Domain")
        tx.create(domain_concept)
        created_count += 1
        
        # Create domains
        for domain, categories in ontology.items():
            domain_node = Node("Domain", name=domain)
            tx.create(domain_node)
            created_count += 1
            
            # Connect domain to top-level concept
            tx.create(Relationship(domain_node, "PART_OF", domain_concept))
            rel_count += 1
            
            # Create categories
            for category, instances in categories.items():
                category_node = Node("Category", name=category)
                tx.create(category_node)
                created_count += 1
                
                # Connect category to domain
                tx.create(Relationship(category_node, "PART_OF", domain_node))
                rel_count += 1
                
                # Find or create instances and connect to category
                for instance in instances:
                    # Check if instance already exists
                    match_query = f"MATCH (n:{category} {{name: $name}}) RETURN n"
                    result = graph.run(match_query, name=instance).data()
                    
                    if result:
                        # Instance exists, just create relationship
                        instance_node = result[0]["n"]
                        tx.create(Relationship(instance_node, "INSTANCE_OF", category_node))
                        rel_count += 1
                    else:
                        # Create new instance
                        instance_node = Node(category, name=instance)
                        tx.create(instance_node)
                        created_count += 1
                        
                        # Connect instance to category
                        tx.create(Relationship(instance_node, "INSTANCE_OF", category_node))
                        rel_count += 1
        
        # Commit the transaction
        tx.commit()
        print(f"Created ontology with {created_count} nodes and {rel_count} relationships")
        
    except Exception as e:
        tx.rollback()
        print(f"Error creating domain ontology: {e}")
    
    return created_count, rel_count

def create_project_timeline():
    # Find all documents with dates and sort chronologically
    result = graph.run("""
    MATCH (d:Document)
    WHERE d.date IS NOT NULL
    RETURN d, d.date as date
    ORDER BY date
    """).data()
    
    if not result:
        print("No documents with dates found for timeline")
        return 0
    
    # Start a transaction for timeline creation
    tx = graph.begin()
    try:
        # Create Timeline node
        timeline = Node("Timeline", name="Heimdall Project Timeline")
        tx.create(timeline)
        
        prev_doc = None
        timeline_rels = 0
        
        for i, doc_data in enumerate(result):
            doc = doc_data["d"]
            
            # Connect document to timeline
            tx.create(Relationship(doc, "PART_OF", timeline))
            timeline_rels += 1
            
            # Connect documents chronologically
            if prev_doc:
                tx.create(Relationship(prev_doc, "PRECEDED", doc))
                timeline_rels += 1
                
            prev_doc = doc
        
        # Group documents by month for easier navigation
        months = {}
        for doc_data in result:
            doc = doc_data["d"]
            date = doc_data["date"]
            
            # Extract year-month
            if date and isinstance(date, str) and len(date) >= 7:  # Format: YYYY-MM-DD or YYYY-MM
                year_month = date[:7]  # YYYY-MM
                if year_month not in months:
                    month_node = Node("TimeGroup", name=year_month)
                    tx.create(month_node)
                    tx.create(Relationship(month_node, "PART_OF", timeline))
                    months[year_month] = month_node
                
                # Connect document to month group
                tx.create(Relationship(doc, "BELONGS_TO", months[year_month]))
                timeline_rels += 1
        
        # Commit the transaction
        tx.commit()
        print(f"Added {len(months)} month groups to timeline")
        return timeline_rels
        
    except Exception as e:
        tx.rollback()
        print(f"Error creating timeline, transaction rolled back: {e}")
        return 0

# MAIN EXECUTION FLOW

def main():
    global data_dir  # Move global declaration to the top
    parser = argparse.ArgumentParser(description="Heimdall Knowledge Graph Extraction Script")
    parser.add_argument('--data-dir', type=str, default=data_dir, help='Path to directory containing JSON files')
    parser.add_argument('--batch-size', type=int, default=5, help='Batch size for file processing')
    parser.add_argument('--skip-timeline', action='store_true', help='Skip project timeline creation')
    parser.add_argument('--skip-ontology', action='store_true', help='Skip domain ontology creation')
    parser.add_argument('--skip-relationship-enhancement', action='store_true', help='Skip semantic relationship enhancement')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose output')
    args = parser.parse_args()

    data_dir = args.data_dir

    # Set up schema constraints and indices first
    create_schema_constraints()

    # Get all JSON files
    json_files = [f for f in os.listdir(data_dir) if f.endswith(".json")]
    if args.verbose:
        print(f"Found {len(json_files)} JSON files to process in {data_dir}")

    # Process files in batches
    file_count, node_count, rel_count, error_count = batch_process_files(json_files, batch_size=args.batch_size)

    print(f"\nProcessed {file_count} files. Total nodes added: {node_count}, total relationships added: {rel_count}.")
    if error_count > 0:
        print(f"Encountered {error_count} errors during processing.")

    # Create project timeline for chronological navigation
    if not args.skip_timeline:
        print("Creating project timeline...")
        timeline_rels = create_project_timeline()
        print(f"Project timeline created with {timeline_rels} additional relationships")
    else:
        timeline_rels = 0

    # Create domain ontology
    if not args.skip_ontology:
        domain_node_count, domain_rel_count = create_domain_ontology()
        print(f"Domain ontology creation complete. Nodes: {domain_node_count}, Relationships: {domain_rel_count}")
    else:
        domain_node_count = domain_rel_count = 0

    # Enhance relationships with semantic information
    if not args.skip_relationship_enhancement:
        print("Enhancing relationships with semantic types...")
        enhanced_count = process_relationships([], [])
        print(f"Enhanced {enhanced_count} relationships with semantic information")
    else:
        enhanced_count = 0

    print("\nKnowledge graph extraction and enhancement complete!")
    print(f"Final stats: {node_count + domain_node_count} nodes, {rel_count + timeline_rels + domain_rel_count + enhanced_count} relationships")

if __name__ == "__main__":
    main()
