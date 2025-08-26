const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { WebClient } = require('@slack/web-api');
const cors = require('cors');
require('dotenv').config();

// Initialize the MCP server for the connector
const server = new McpServer({
  name: 'Slack Connector',
  version: '1.0.0'
});

// Slack API helper functions
class SlackAPI {
  constructor(token) {
    this.client = new WebClient(token || process.env.SLACK_BOT_TOKEN);
    this.rateLimits = new Map(); // Track rate limits per method
  }

  async checkAuth() {
    try {
      const result = await this.client.auth.test();
      return result;
    } catch (error) {
      throw new Error(`Slack authentication failed: ${error.message}`);
    }
  }

  async getChannels(types = 'public_channel,private_channel') {
    try {
      const result = await this.client.conversations.list({
        types,
        limit: 1000,
        exclude_archived: true
      });
      return result.channels;
    } catch (error) {
      throw new Error(`Failed to fetch channels: ${error.message}`);
    }
  }

  async getChannelHistory(channelId, since, limit = 1000) {
    try {
      const options = {
        channel: channelId,
        limit,
        inclusive: true
      };

      if (since) {
        // Convert ISO date to Slack timestamp (Unix timestamp)
        const sinceTimestamp = new Date(since).getTime() / 1000;
        options.oldest = sinceTimestamp.toString();
      }

      const result = await this.client.conversations.history(options);
      return result.messages || [];
    } catch (error) {
      throw new Error(`Failed to fetch channel history for ${channelId}: ${error.message}`);
    }
  }

  async getThreadReplies(channelId, threadTs) {
    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs,
        inclusive: true
      });
      return result.messages || [];
    } catch (error) {
      console.warn(`Failed to fetch thread replies for ${channelId}:${threadTs}:`, error.message);
      return [];
    }
  }

  async getUserInfo(userId) {
    try {
      const result = await this.client.users.info({ user: userId });
      return result.user;
    } catch (error) {
      console.warn(`Failed to fetch user info for ${userId}:`, error.message);
      return null;
    }
  }

  async getChannelInfo(channelId) {
    try {
      const result = await this.client.conversations.info({ channel: channelId });
      return result.channel;
    } catch (error) {
      console.warn(`Failed to fetch channel info for ${channelId}:`, error.message);
      return null;
    }
  }

  formatMessage(message, channelInfo) {
    // Convert Slack timestamps to ISO format
    const timestamp = new Date(parseFloat(message.ts) * 1000).toISOString();
    
    // Extract text content, handling various message formats
    let content = message.text || '';
    
    // Handle rich text blocks if present
    if (message.blocks && message.blocks.length > 0) {
      content = this.extractTextFromBlocks(message.blocks);
    }

    // Handle attachments
    let attachments = [];
    if (message.attachments && message.attachments.length > 0) {
      attachments = message.attachments.map(att => ({
        title: att.title,
        text: att.text,
        color: att.color,
        service_name: att.service_name,
        from_url: att.from_url
      }));
    }

    // Handle files
    let files = [];
    if (message.files && message.files.length > 0) {
      files = message.files.map(file => ({
        name: file.name,
        title: file.title,
        mimetype: file.mimetype,
        filetype: file.filetype,
        size: file.size,
        url_private: file.url_private,
        permalink: file.permalink
      }));
    }

    return {
      id: `msg-${message.ts}`,
      type: 'message',
      title: content.split('\n')[0] || 'Slack Message',
      content: content,
      text: message.text || '',
      timestamp: timestamp,
      created_at: timestamp,
      user_id: message.user,
      channel_id: channelInfo?.id,
      channel_name: channelInfo?.name,
      thread_ts: message.thread_ts,
      reply_count: message.reply_count || 0,
      reactions: message.reactions || [],
      attachments,
      files,
      is_bot: message.bot_id ? true : false,
      bot_id: message.bot_id,
      subtype: message.subtype,
      permalink: `https://${process.env.SLACK_WORKSPACE || 'your-workspace'}.slack.com/archives/${channelInfo?.id}/p${message.ts.replace('.', '')}`,
      edited: message.edited ? {
        timestamp: new Date(parseFloat(message.edited.ts) * 1000).toISOString(),
        user: message.edited.user
      } : undefined
    };
  }

  extractTextFromBlocks(blocks) {
    let text = '';
    
    for (const block of blocks) {
      if (block.type === 'section' && block.text) {
        text += block.text.text + '\n';
      } else if (block.type === 'rich_text' && block.elements) {
        for (const element of block.elements) {
          if (element.type === 'rich_text_section' && element.elements) {
            for (const textElement of element.elements) {
              if (textElement.text) {
                text += textElement.text;
              }
            }
            text += '\n';
          }
        }
      }
    }
    
    return text.trim();
  }
}

// Demo data for when DEMO_MODE is true or no SLACK_BOT_TOKEN is provided
function getDemoSlackMessages() {
  return [
    {
      id: 'msg-demo-1',
      type: 'message',
      title: 'Welcome to the Knowledge Graph project!',
      content: 'Welcome to the Knowledge Graph project! We\'re building an exciting system that can connect data from multiple sources. Feel free to ask questions in #general if you need help getting started.',
      text: 'Welcome to the Knowledge Graph project! We\'re building an exciting system that can connect data from multiple sources.',
      timestamp: '2025-08-20T10:00:00Z',
      created_at: '2025-08-20T10:00:00Z',
      user_id: 'U001DEMO',
      channel_id: 'C001GENERAL',
      channel_name: 'general',
      thread_ts: null,
      reply_count: 3,
      reactions: [{ name: 'wave', count: 5 }, { name: 'rocket', count: 2 }],
      attachments: [],
      files: [],
      is_bot: false,
      subtype: null,
      permalink: 'https://demo-workspace.slack.com/archives/C001GENERAL/p1234567890'
    },
    {
      id: 'msg-demo-2',
      type: 'message',
      title: 'Graph RAG implementation discussion',
      content: 'I\'ve been researching Graph RAG implementations and found some interesting patterns. The key is to properly chunk documents while maintaining semantic relationships between entities.',
      text: 'I\'ve been researching Graph RAG implementations and found some interesting patterns.',
      timestamp: '2025-08-20T14:30:00Z',
      created_at: '2025-08-20T14:30:00Z',
      user_id: 'U002DEMO',
      channel_id: 'C002TECH',
      channel_name: 'tech-discussion',
      thread_ts: null,
      reply_count: 0,
      reactions: [{ name: 'brain', count: 3 }, { name: '+1', count: 4 }],
      attachments: [],
      files: [],
      is_bot: false,
      subtype: null,
      permalink: 'https://demo-workspace.slack.com/archives/C002TECH/p1234567891'
    },
    {
      id: 'msg-demo-3',
      type: 'message',
      title: 'Demo data integration completed',
      content: 'Great news! The demo data integration is working perfectly. We now have sample data from GitHub repos, Confluence pages, and Slack messages all connected in our knowledge graph.',
      text: 'Great news! The demo data integration is working perfectly.',
      timestamp: '2025-08-21T09:15:00Z',
      created_at: '2025-08-21T09:15:00Z',
      user_id: 'U003DEMO',
      channel_id: 'C003UPDATES',
      channel_name: 'project-updates',
      thread_ts: null,
      reply_count: 1,
      reactions: [{ name: 'tada', count: 8 }, { name: 'fire', count: 3 }],
      attachments: [],
      files: [],
      is_bot: false,
      subtype: null,
      permalink: 'https://demo-workspace.slack.com/archives/C003UPDATES/p1234567892'
    }
  ];
}

function getDemoSlackChannels() {
  return [
    {
      id: 'C001GENERAL',
      name: 'general',
      is_channel: true,
      is_private: false,
      created: 1725120000,
      creator: 'U001DEMO',
      purpose: {
        value: 'Company-wide announcements and general discussion'
      },
      topic: {
        value: 'Welcome to our knowledge graph project workspace!'
      },
      num_members: 12
    },
    {
      id: 'C002TECH',
      name: 'tech-discussion',
      is_channel: true,
      is_private: false,
      created: 1725120100,
      creator: 'U002DEMO',
      purpose: {
        value: 'Technical discussions about implementation details'
      },
      topic: {
        value: 'Graph RAG, Neo4j, embeddings, and more'
      },
      num_members: 8
    },
    {
      id: 'C003UPDATES',
      name: 'project-updates',
      is_channel: true,
      is_private: false,
      created: 1725120200,
      creator: 'U003DEMO',
      purpose: {
        value: 'Project status updates and milestones'
      },
      topic: {
        value: 'Stay updated on our progress'
      },
      num_members: 15
    }
  ];
}

// Implement the pull capability as a tool
server.registerTool('pull', 'Pull messages and data from Slack', {
  since: 'string',          // Optional parameter for incremental sync
  channels: 'array',        // Optional: specific channel IDs to pull from
  include_threads: 'boolean', // Optional: whether to include thread replies
  data_types: 'array'       // Optional: ['messages', 'channels', 'users']
}, async ({ since, channels, include_threads = false, data_types }) => {
  try {
    const api = new SlackAPI();
    
    // Test authentication
    const auth = await api.checkAuth();
    console.log(`Authenticated as: ${auth.user} on team: ${auth.team}`);
    
    const documents = [];
    const types = data_types || ['messages'];
    
    // Cache for user and channel info to avoid repeated API calls
    const userCache = new Map();
    const channelCache = new Map();

    if (types.includes('channels')) {
      const channelList = await api.getChannels();
      for (const channel of channelList) {
        channelCache.set(channel.id, channel);
        documents.push({
          id: `channel-${channel.id}`,
          type: 'channel',
          title: `#${channel.name}`,
          description: channel.purpose?.value || channel.topic?.value || '',
          content: channel.purpose?.value || channel.topic?.value || '',
          name: channel.name,
          channel_id: channel.id,
          created_at: new Date(parseFloat(channel.created) * 1000).toISOString(),
          creator: channel.creator,
          is_private: channel.is_private,
          is_archived: channel.is_archived,
          is_general: channel.is_general,
          member_count: channel.num_members,
          topic: channel.topic?.value,
          purpose: channel.purpose?.value
        });
      }
    }

    if (types.includes('messages')) {
      // Get channels to pull messages from
      let targetChannels = [];
      
      if (channels && channels.length > 0) {
        // Use specified channels
        for (const channelId of channels) {
          const channelInfo = await api.getChannelInfo(channelId);
          if (channelInfo) {
            targetChannels.push(channelInfo);
            channelCache.set(channelId, channelInfo);
          }
        }
      } else {
        // Get all accessible channels
        const allChannels = await api.getChannels();
        targetChannels = allChannels.slice(0, 10); // Limit to first 10 channels for demo
        for (const channel of targetChannels) {
          channelCache.set(channel.id, channel);
        }
      }

      console.log(`Pulling messages from ${targetChannels.length} channels`);

      for (const channel of targetChannels) {
        console.log(`Fetching messages from #${channel.name}...`);
        
        try {
          const messages = await api.getChannelHistory(channel.id, since, 200);
          
          for (const message of messages) {
            // Skip system messages and bot messages unless they contain valuable content
            if (message.subtype && ['channel_join', 'channel_leave'].includes(message.subtype)) {
              continue;
            }

            const formattedMessage = api.formatMessage(message, channel);
            documents.push(formattedMessage);

            // Get thread replies if requested and message has replies
            if (include_threads && message.thread_ts && message.reply_count > 0) {
              try {
                const threadReplies = await api.getThreadReplies(channel.id, message.thread_ts);
                
                for (const reply of threadReplies.slice(1)) { // Skip original message
                  const formattedReply = api.formatMessage(reply, channel);
                  formattedReply.id = `thread-${reply.ts}`;
                  formattedReply.type = 'thread_reply';
                  formattedReply.parent_message_id = `msg-${message.thread_ts}`;
                  documents.push(formattedReply);
                }
              } catch (threadError) {
                console.warn(`Failed to fetch thread for message ${message.ts}:`, threadError.message);
              }
            }
          }
        } catch (channelError) {
          console.warn(`Failed to fetch messages from channel ${channel.name}:`, channelError.message);
          continue;
        }
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          documents,
          next_since: new Date().toISOString(),
          channels_processed: channelCache.size,
          team: auth.team,
          user: auth.user
        })
      }]
    };
  } catch (error) {
    console.error('Error pulling from Slack:', error);
    throw new Error(`Slack API error: ${error.message}`);
  }
});

// Create an Express app to serve the MCP server
const app = express();
const port = process.env.PORT || 3003;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const { config } = require('./config.js');
  
  try {
    // In demo mode, skip API authentication
    if (config.DEMO_MODE || !config.SLACK_BOT_TOKEN) {
      return res.json({ 
        status: 'healthy',
        service: 'slack-connector',
        timestamp: new Date().toISOString(),
        mode: 'demo',
        slack_team: 'demo-workspace',
        slack_user: 'demo-bot',
        bot_id: 'B001DEMO'
      });
    }
    
    const api = new SlackAPI();
    const auth = await api.checkAuth();
    
    res.json({ 
      status: 'healthy',
      service: 'slack-connector',
      timestamp: new Date().toISOString(),
      mode: 'production',
      slack_team: auth.team,
      slack_user: auth.user,
      bot_id: auth.bot_id
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'slack-connector',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// List available data sources
app.get('/sources', (req, res) => {
  res.json([
    {
      id: 'messages',
      name: 'Slack Messages',
      description: 'Messages from Slack channels with full content and metadata',
      schema: {
        id: 'string',
        title: 'string',
        content: 'string',
        text: 'string',
        timestamp: 'datetime',
        created_at: 'datetime',
        user_id: 'string',
        channel_id: 'string',
        channel_name: 'string',
        thread_ts: 'string',
        reply_count: 'number',
        reactions: 'array',
        attachments: 'array',
        files: 'array'
      }
    },
    {
      id: 'channels',
      name: 'Slack Channels',
      description: 'Channel metadata including topics and purposes',
      schema: {
        id: 'string',
        title: 'string',
        description: 'string',
        name: 'string',
        channel_id: 'string',
        created_at: 'datetime',
        creator: 'string',
        is_private: 'boolean',
        member_count: 'number',
        topic: 'string',
        purpose: 'string'
      }
    },
    {
      id: 'threads',
      name: 'Slack Thread Replies',
      description: 'Threaded conversations and replies',
      schema: {
        id: 'string',
        title: 'string',
        content: 'string',
        timestamp: 'datetime',
        user_id: 'string',
        channel_id: 'string',
        parent_message_id: 'string',
        thread_ts: 'string'
      }
    }
  ]);
});

// Simple pull endpoint for testing
app.get('/pull', async (req, res) => {
  const { config } = require('./config.js');
  
  try {
    const { since, channels, include_threads, data_types } = req.query;
    
    // Check if we should use demo mode
    if (config.DEMO_MODE || !config.SLACK_BOT_TOKEN) {
      console.log('🎭 Slack: Using DEMO MODE - returning mock Slack data');
      const demoMessages = getDemoSlackMessages();
      const demoChannels = getDemoSlackChannels();
      
      const types = data_types ? data_types.split(',') : ['messages'];
      let documents = [];
      
      if (types.includes('messages')) {
        documents = [...demoMessages];
      }
      
      if (types.includes('channels')) {
        const channelDocs = demoChannels.map(channel => ({
          id: `channel-${channel.id}`,
          type: 'channel',
          title: `#${channel.name}`,
          description: channel.purpose?.value || channel.topic?.value || '',
          content: channel.purpose?.value || channel.topic?.value || '',
          name: channel.name,
          channel_id: channel.id,
          created_at: new Date(channel.created * 1000).toISOString(),
          creator: channel.creator,
          is_private: channel.is_private,
          member_count: channel.num_members,
          topic: channel.topic?.value,
          purpose: channel.purpose?.value
        }));
        documents = [...documents, ...channelDocs];
      }
      
      return res.json(documents);
    }

    console.log('🔐 Slack: Using PRODUCTION MODE - fetching real data from Slack API');
    
    const api = new SlackAPI();
    const auth = await api.checkAuth();
    
    const documents = [];
    const types = data_types ? data_types.split(',') : ['messages'];
    
    // For demo purposes, limit to a few channels
    let targetChannels = [];
    if (channels) {
      targetChannels = channels.split(',');
    } else {
      const allChannels = await api.getChannels();
      targetChannels = allChannels.slice(0, 3).map(c => c.id); // First 3 channels
    }

    if (types.includes('messages')) {
      for (const channelId of targetChannels) {
        try {
          const channelInfo = await api.getChannelInfo(channelId);
          const messages = await api.getChannelHistory(channelId, since, 50); // Limit for demo
          
          for (const message of messages) {
            const formattedMessage = api.formatMessage(message, channelInfo);
            documents.push(formattedMessage);
          }
        } catch (error) {
          console.warn(`Error fetching messages from channel ${channelId}:`, error.message);
        }
      }
    }

    console.log(`📄 Serving ${documents.length} Slack documents via /pull endpoint`);
    res.json(documents);
  } catch (error) {
    console.error('Slack pull error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Set up the MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
    const { randomUUID } = require('crypto');
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`💬 Slack Connector running on port ${port}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  http://localhost:${port}/health`);
  console.log(`   GET  http://localhost:${port}/sources`);
  console.log(`   GET  http://localhost:${port}/pull[?channels=C123,C456][&since=2024-01-01]`);
  console.log(`   POST http://localhost:${port}/mcp`);
  console.log('');
  console.log('🔑 Environment variables:');
  console.log(`   SLACK_BOT_TOKEN: ${process.env.SLACK_BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`   SLACK_WORKSPACE: ${process.env.SLACK_WORKSPACE || '❌ Not set (optional)'}`);
});
