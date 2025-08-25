# Identity Resolution & Deduplication Patterns

This document outlines systematic approaches to entity resolution across data sources in the Knowledge Graph Brain, ensuring data quality and preventing duplicate entity creation.

## 🎯 Overview

Identity resolution is the process of determining whether different records represent the same real-world entity. In a knowledge graph with multiple data sources (GitHub, Slack, Confluence, etc.), the same person might appear as:
- `jane.doe@company.com` (Confluence)
- `janedoe` (GitHub username) 
- `@jane.doe` (Slack user)
- `Jane Doe <jane.doe@company.com>` (Git commits)

## 🏗️ Architecture

### Core Components

```typescript
interface IdentityResolver {
  resolve(candidate: EntityCandidate, existingEntities: Entity[]): Promise<ResolutionResult>;
  confidence: number;
  priority: number;
}

interface EntityCandidate {
  sourceId: string;
  sourceType: 'github' | 'slack' | 'confluence' | 'retail';
  entityType: 'Person' | 'Organization' | 'Project' | 'Product';
  attributes: Record<string, any>;
  extractedIdentifiers: IdentitySignature[];
}

interface IdentitySignature {
  type: 'email' | 'username' | 'handle' | 'name' | 'id';
  value: string;
  confidence: number;
  source: string;
}
```

### Resolution Framework

```typescript
class IdentityResolutionEngine {
  private resolvers: IdentityResolver[] = [
    new ExactMatchResolver(),
    new EmailResolver(),
    new FuzzyNameResolver(),
    new SocialIdentityResolver(),
    new ContextualResolver()
  ];
  
  async resolveEntity(candidate: EntityCandidate): Promise<ResolutionResult> {
    const results = await Promise.all(
      this.resolvers
        .sort((a, b) => b.priority - a.priority)
        .map(resolver => resolver.resolve(candidate))
    );
    
    return this.aggregateResults(results);
  }
}
```

## 🔍 Resolution Strategies

### 1. Exact Match Resolver (Priority: 100)

**Use Case**: Direct identifier matches across sources
**Confidence**: 95-100%

```typescript
class ExactMatchResolver implements IdentityResolver {
  priority = 100;
  confidence = 0.95;
  
  async resolve(candidate: EntityCandidate, existing: Entity[]): Promise<ResolutionResult> {
    for (const entity of existing) {
      // Email exact match
      if (candidate.attributes.email && entity.attributes.email === candidate.attributes.email) {
        return { match: entity, confidence: 1.0, method: 'exact_email' };
      }
      
      // GitHub ID exact match
      if (candidate.sourceType === 'github' && entity.github_id === candidate.attributes.id) {
        return { match: entity, confidence: 1.0, method: 'exact_github_id' };
      }
      
      // Slack user ID exact match  
      if (candidate.sourceType === 'slack' && entity.slack_id === candidate.attributes.id) {
        return { match: entity, confidence: 1.0, method: 'exact_slack_id' };
      }
    }
    
    return { match: null, confidence: 0, method: 'exact_no_match' };
  }
}
```

### 2. Email Domain Resolver (Priority: 80)

**Use Case**: Email-based identity linking
**Confidence**: 80-95%

```typescript
class EmailResolver implements IdentityResolver {
  priority = 80;
  confidence = 0.85;
  
  async resolve(candidate: EntityCandidate, existing: Entity[]): Promise<ResolutionResult> {
    const candidateEmail = this.extractEmail(candidate);
    if (!candidateEmail) return { match: null, confidence: 0 };
    
    for (const entity of existing) {
      const entityEmails = this.extractEmails(entity);
      
      for (const email of entityEmails) {
        // Exact email match
        if (email === candidateEmail) {
          return { match: entity, confidence: 0.95, method: 'email_exact' };
        }
        
        // Same domain + similar username
        const [candidateUser, candidateDomain] = candidateEmail.split('@');
        const [entityUser, entityDomain] = email.split('@');
        
        if (candidateDomain === entityDomain) {
          const similarity = this.stringSimilarity(candidateUser, entityUser);
          if (similarity > 0.8) {
            return { match: entity, confidence: 0.8 * similarity, method: 'email_domain_similar' };
          }
        }
      }
    }
    
    return { match: null, confidence: 0 };
  }
}
```

### 3. Fuzzy Name Resolver (Priority: 60)

**Use Case**: Name variations and nicknames
**Confidence**: 60-85%

```typescript
class FuzzyNameResolver implements IdentityResolver {
  priority = 60;
  confidence = 0.75;
  
  async resolve(candidate: EntityCandidate, existing: Entity[]): Promise<ResolutionResult> {
    const candidateName = this.normalizeName(candidate.attributes.name);
    if (!candidateName) return { match: null, confidence: 0 };
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const entity of existing) {
      const entityName = this.normalizeName(entity.attributes.name);
      if (!entityName) continue;
      
      const similarity = this.nameSimilarity(candidateName, entityName);
      
      if (similarity > 0.85 && similarity > bestScore) {
        bestMatch = entity;
        bestScore = similarity;
      }
    }
    
    if (bestMatch && bestScore > 0.85) {
      return { match: bestMatch, confidence: bestScore * 0.85, method: 'fuzzy_name' };
    }
    
    return { match: null, confidence: 0 };
  }
  
  private normalizeName(name: string): string {
    return name?.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private nameSimilarity(name1: string, name2: string): number {
    // Implement Levenshtein distance, Jaro-Winkler, or other string similarity
    return this.jaroWinkler(name1, name2);
  }
}
```

### 4. Social Identity Resolver (Priority: 40)

**Use Case**: Cross-platform username matching
**Confidence**: 40-70%

```typescript
class SocialIdentityResolver implements IdentityResolver {
  priority = 40;
  confidence = 0.60;
  
  async resolve(candidate: EntityCandidate, existing: Entity[]): Promise<ResolutionResult> {
    const candidateHandles = this.extractSocialHandles(candidate);
    
    for (const entity of existing) {
      const entityHandles = this.extractSocialHandles(entity);
      
      for (const candidateHandle of candidateHandles) {
        for (const entityHandle of entityHandles) {
          if (candidateHandle.toLowerCase() === entityHandle.toLowerCase()) {
            return { match: entity, confidence: 0.7, method: 'social_handle_match' };
          }
          
          const similarity = this.stringSimilarity(candidateHandle, entityHandle);
          if (similarity > 0.9) {
            return { match: entity, confidence: similarity * 0.6, method: 'social_handle_similar' };
          }
        }
      }
    }
    
    return { match: null, confidence: 0 };
  }
  
  private extractSocialHandles(entity: EntityCandidate | Entity): string[] {
    const handles = [];
    if (entity.attributes.github_username) handles.push(entity.attributes.github_username);
    if (entity.attributes.slack_handle) handles.push(entity.attributes.slack_handle);
    if (entity.attributes.username) handles.push(entity.attributes.username);
    return handles;
  }
}
```

## 📊 Implementation Strategy

### Phase 1: Deterministic Rules

Start with high-confidence, rule-based resolution:

```cypher
// Find potential email matches
MATCH (p1:Person {kb_id: $kb_id})
MATCH (candidate:Person {kb_id: $kb_id, email: p1.email})
WHERE candidate.source_id <> p1.source_id
RETURN p1, candidate, 1.0 as confidence, 'exact_email' as method

// Find GitHub username matches
MATCH (p1:Person {kb_id: $kb_id})
MATCH (candidate:Person {kb_id: $kb_id})
WHERE p1.github_username = candidate.github_username
  AND p1.source_id <> candidate.source_id
RETURN p1, candidate, 0.9 as confidence, 'github_username' as method
```

### Phase 2: Fuzzy Matching

Add approximate string matching:

```cypher
// Find similar names (requires APOC or custom function)
MATCH (p1:Person {kb_id: $kb_id})
MATCH (candidate:Person {kb_id: $kb_id})
WHERE p1.source_id <> candidate.source_id
  AND apoc.text.levenshteinSimilarity(p1.name, candidate.name) > 0.85
RETURN p1, candidate, 
       apoc.text.levenshteinSimilarity(p1.name, candidate.name) * 0.8 as confidence,
       'fuzzy_name' as method
```

### Phase 3: Machine Learning Enhancement

For advanced resolution, train models on:
- Historical resolution decisions
- User feedback on merge accuracy
- Cross-source attribute correlation

## 🔧 Configuration Framework

### Per-KB Resolution Rules

```yaml
identity_resolution:
  enabled: true
  confidence_threshold: 0.75
  auto_merge_threshold: 0.95
  
  resolvers:
    - type: exact_match
      priority: 100
      enabled: true
      rules:
        - field: email
          confidence: 1.0
        - field: github_id
          confidence: 1.0
          
    - type: fuzzy_name
      priority: 60
      enabled: true
      threshold: 0.85
      confidence_multiplier: 0.8
      
  entity_types:
    Person:
      primary_keys: [email, github_id, slack_id]
      fuzzy_fields: [name, display_name]
      
    Organization:
      primary_keys: [domain, github_org]
      fuzzy_fields: [name, full_name]
```

### Resolution Metadata

Track resolution decisions for auditing:

```typescript
interface ResolutionRecord {
  id: string;
  kb_id: string;
  source_entity_id: string;
  target_entity_id: string;
  method: string;
  confidence: number;
  timestamp: number;
  human_verified?: boolean;
  feedback?: 'correct' | 'incorrect' | 'partial';
}
```

## 🎯 Best Practices

### 1. Confidence Thresholds

- **Auto-merge (95-100%)**: High-confidence exact matches
- **Suggest (75-94%)**: Present to users for confirmation  
- **Log only (50-74%)**: Record for analysis but don't act
- **Ignore (<50%)**: Too low confidence to be useful

### 2. Human-in-the-Loop

```typescript
interface ResolutionUI {
  presentCandidate(candidate: EntityCandidate, suggestions: ResolutionResult[]): Promise<UserDecision>;
  showMergePreview(entity1: Entity, entity2: Entity): Promise<boolean>;
  collectFeedback(resolutionId: string, feedback: 'correct' | 'incorrect'): Promise<void>;
}
```

### 3. Rollback Capability

```cypher
// Create merge audit trail
CREATE (m:Merge {
  id: $merge_id,
  timestamp: timestamp(),
  source_id: $source_entity_id,
  target_id: $target_entity_id,
  confidence: $confidence,
  method: $method
})

// Backup original entity before merge
CREATE (backup:EntityBackup {
  original_id: $entity_id,
  merge_id: $merge_id,
  data: $entity_json
})
```

## 📈 Success Metrics

### Quality Metrics
- **Precision**: Correctly identified matches / Total matches made
- **Recall**: Correctly identified matches / Total actual matches
- **F1 Score**: Harmonic mean of precision and recall

### Operational Metrics
- **Resolution Rate**: Entities resolved / Total entities ingested
- **Auto-merge Rate**: Automatic merges / Total resolutions
- **Human Review Rate**: Manual reviews / Total resolutions
- **Rollback Rate**: Rollbacks / Total merges

### Performance Metrics
- **Resolution Latency**: Time to resolve per entity
- **Throughput**: Entities processed per second
- **Resource Usage**: CPU/memory during resolution

## 🚀 Getting Started

### 1. Enable Resolution

```typescript
// In orchestrator configuration
const resolutionEngine = new IdentityResolutionEngine({
  confidenceThreshold: 0.75,
  autoMergeThreshold: 0.95,
  enabledResolvers: ['exact_match', 'email', 'fuzzy_name']
});

// Hook into ingestion pipeline
orchestrator.on('entity_ingested', async (entity) => {
  const resolution = await resolutionEngine.resolve(entity);
  if (resolution.confidence > 0.75) {
    await handleResolution(entity, resolution);
  }
});
```

### 2. Monitor Resolution

```typescript
// Resolution dashboard
app.get('/api/identity-resolution/stats', (req, res) => {
  res.json({
    total_entities: entityCount,
    resolved_entities: resolvedCount,
    resolution_rate: resolvedCount / entityCount,
    confidence_distribution: confidenceHistogram,
    method_breakdown: methodStats
  });
});
```

### 3. Manual Review Interface

```typescript
// Pending resolutions API
app.get('/api/identity-resolution/pending', (req, res) => {
  const pending = resolutionQueue.filter(r => 
    r.confidence >= 0.75 && r.confidence < 0.95
  );
  res.json(pending);
});
```

## 🔮 Future Enhancements

### Advanced Techniques
- **Graph-based Resolution**: Use relationship patterns for identity hints
- **Temporal Analysis**: Consider timing of entity appearances
- **Cross-source Validation**: Verify identity across multiple sources
- **Active Learning**: Improve models based on user feedback

### Integration Opportunities
- **External Identity Providers**: LDAP, Active Directory, OAuth providers
- **Public Data Sources**: LinkedIn, company directories, public repos
- **ML/AI Services**: Cloud entity resolution APIs for advanced matching

This framework provides a solid foundation for entity deduplication while maintaining data quality and allowing for continuous improvement through user feedback and machine learning enhancement.
