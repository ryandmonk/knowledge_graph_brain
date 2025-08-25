# Slack Connector

A comprehensive connector for ingesting Slack workspace data into Knowledge Graph Brain, including messages, channels, threads, and user interactions.

## Features

- **Channel Messages**: Full message content with formatting, reactions, and attachments
- **Thread Conversations**: Threaded replies and discussion context
- **Channel Metadata**: Channel topics, purposes, and member information
- **File Attachments**: Support for files and rich media content
- **User Information**: User profiles and interaction patterns
- **Incremental Sync**: Support for incremental updates using timestamps
- **Rich Text Support**: Proper handling of Slack's rich text format and blocks

## Setup

### 1. Install Dependencies
```bash
cd connectors/slack
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your Slack bot token
```

Required environment variables:
- `SLACK_BOT_TOKEN`: Slack bot token with appropriate scopes
- `SLACK_WORKSPACE`: Your Slack workspace name (optional, for permalink generation)
- `PORT`: Port to run the connector (default: 3003)

### 3. Slack App Setup

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Create a new app or use existing app
3. Add these Bot Token Scopes:
   - `channels:history` - View messages in public channels
   - `channels:read` - View basic channel information
   - `groups:history` - View messages in private channels (if needed)
   - `groups:read` - View private channel information (if needed)
   - `im:history` - View direct messages (if needed)
   - `mpim:history` - View group direct messages (if needed)
   - `users:read` - View user information
   - `files:read` - View file information

4. Install the app to your workspace
5. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 4. Start the Connector
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
```
Returns connector status and Slack authentication information.

### Data Sources
```
GET /sources
```
Lists available data source types (messages, channels, threads).

### Pull Data
```
GET /pull[?channels=C123,C456][&since=ISO_DATE][&include_threads=true][&data_types=messages,channels]
```

Parameters:
- `channels` (optional): Comma-separated list of channel IDs
- `since` (optional): ISO 8601 timestamp for incremental sync
- `include_threads` (optional): Whether to include thread replies
- `data_types` (optional): Comma-separated list of data types to fetch

### MCP Endpoint
```
POST /mcp
```
Model Context Protocol endpoint for AI agent integration.

## Usage Examples

### Basic Message Data
```bash
# Get messages from all accessible channels (limited to first 3 for demo)
curl "http://localhost:3003/pull"

# Get messages from specific channels
curl "http://localhost:3003/pull?channels=C1234567890,C0987654321"
```

### Include Thread Conversations
```bash
# Get messages with thread replies
curl "http://localhost:3003/pull?include_threads=true"
```

### Incremental Sync
```bash
# Get messages since specific date
curl "http://localhost:3003/pull?since=2024-01-01T00:00:00Z"
```

### Integration with Knowledge Graph Brain

1. **Register Schema**:
```yaml
# Use examples/slack.yaml
kb_id: slack-kb
name: Slack Knowledge Base
# ... (see full schema file)
```

2. **Add Data Sources**:
```bash
# Register the schema
curl -X POST http://localhost:3000/api/register-schema \
  -H "Content-Type: application/json" \
  -d @examples/slack.yaml

# Ingest message data
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"kb_id": "slack-kb", "source_id": "slack-messages"}'
```

## Data Schema

### SlackMessage Node
- Full message content with rich text formatting
- Channel and user context information
- Thread relationship tracking
- Reaction and attachment metadata
- Edit history and bot identification
- Permalink for easy reference

### SlackChannel Node
- Channel metadata (name, topic, purpose)
- Privacy and archive status
- Member count and creation info
- Creator identification

### SlackThread Node
- Thread conversation grouping
- Reply count and participants
- Parent message relationship

### Person Node
- User profile information
- Role and permission context
- Timezone and contact details

## Relationships

- `POSTED_BY`: SlackMessage → Person
- `POSTED_IN`: SlackMessage → SlackChannel
- `CREATED_BY`: SlackChannel → Person
- `MEMBER_OF`: Person → SlackChannel
- `REPLY_TO`: SlackMessage → SlackMessage
- `THREAD_IN`: SlackThread → SlackChannel
- `PART_OF`: SlackMessage → SlackThread
- `STARTED_BY`: SlackThread → Person

## Message Processing

### Rich Text Handling
The connector properly processes Slack's rich text format:
- **Blocks**: Structured content elements
- **Attachments**: External content and media
- **Files**: Uploaded documents and images
- **Links**: URL unfurling and previews
- **Mentions**: User and channel references
- **Formatting**: Bold, italic, code blocks

### Thread Processing
- **Parent Messages**: Original messages that start threads
- **Thread Replies**: Response messages within threads
- **Thread Metadata**: Reply counts and participant tracking
- **Context Preservation**: Maintaining conversation flow

## Rate Limits

Slack API has rate limits based on method tiers:
- **Tier 1**: 1+ requests per minute
- **Tier 2**: 20+ requests per minute
- **Tier 3**: 50+ requests per minute
- **Tier 4**: 100+ requests per minute

The connector handles rate limiting gracefully with backoff strategies.

## Error Handling

- **Authentication errors**: Invalid or insufficient bot token scopes
- **Permission errors**: Access denied to private channels or data
- **Rate limit errors**: When API quota is temporarily exhausted
- **Channel access errors**: Bot not invited to specific channels
- **Network errors**: Connection issues with Slack API

## Best Practices

1. **Bot Permissions**: Ensure bot is invited to channels you want to ingest
2. **Scope Management**: Only request necessary OAuth scopes for security
3. **Incremental Sync**: Use `since` parameter to avoid re-processing unchanged messages
4. **Channel Filtering**: Specify specific channels to avoid ingesting irrelevant data
5. **Thread Handling**: Consider whether thread replies are needed for your use case
6. **Content Filtering**: Skip system messages and bot spam where appropriate

## Privacy Considerations

- **Private Channels**: Only accessible if bot is explicitly invited
- **Direct Messages**: Require special permissions and user consent
- **User Data**: Respect user privacy and workspace policies
- **Message Content**: Consider sensitive information in messages
- **Retention Policies**: Align with organization's data retention requirements

## Common Channel IDs

Find channel IDs in Slack:
1. Right-click on channel name
2. Select "Copy link"
3. Channel ID is the last part of the URL (e.g., `C1234567890`)

Or use the Slack API:
```bash
curl -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  "https://slack.com/api/conversations.list"
```
