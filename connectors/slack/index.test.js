/**
 * Comprehensive test suite for Slack connector production features
 * Tests rate limiting, error handling, retry logic, and API methods
 */

const { SlackAPI, getDemoSlackMessages, getDemoSlackChannels } = require('./index');

// Mock the Slack Web API
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: {
      test: jest.fn()
    },
    conversations: {
      list: jest.fn(),
      history: jest.fn(),
      replies: jest.fn(),
      info: jest.fn()
    },
    users: {
      info: jest.fn()
    }
  }))
}));

const { WebClient } = require('@slack/web-api');

describe('SlackAPI Production Features', () => {
  let slackAPI;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    slackAPI = new SlackAPI('test-token');
    mockClient = slackAPI.client;
  });

const { SlackAPI, getDemoSlackMessages, getDemoSlackChannels } = require('./index');

// Mock the Slack Web API
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: {
      test: jest.fn()
    },
    conversations: {
      list: jest.fn(),
      history: jest.fn(),
      replies: jest.fn(),
      info: jest.fn()
    },
    users: {
      info: jest.fn()
    }
  }))
}));

const { WebClient } = require('@slack/web-api');

describe('SlackAPI Production Features', () => {
  let slackAPI;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    slackAPI = new SlackAPI('test-token');
    mockClient = slackAPI.client;
  });

  describe('Rate Limiting', () => {
    test('should respect rate limits and wait for reset', async () => {
      const startTime = Date.now();
      const retryAfter = 100; // 100ms for quick test
      
      // Mock rate limit error
      const rateLimitError = new Error('Rate limited');
      rateLimitError.code = 'slack_webapi_rate_limited';
      rateLimitError.retryAfter = retryAfter / 1000; // Slack uses seconds
      
      mockClient.auth.test
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ ok: true, user: 'test-user', team: 'test-team' });
      
      const result = await slackAPI.checkAuth();
      const endTime = Date.now();
      
      expect(result).toEqual({ ok: true, user: 'test-user', team: 'test-team' });
      expect(endTime - startTime).toBeGreaterThanOrEqual(retryAfter - 10); // Allow some timing tolerance
      expect(mockClient.auth.test).toHaveBeenCalledTimes(2);
    });

    test('should track rate limits per method', async () => {
      const retryAfter = 50;
      slackAPI.updateRateLimit('auth.test', retryAfter);
      
      const rateLimit = slackAPI.rateLimits.get('auth.test');
      expect(rateLimit).toBeDefined();
      expect(rateLimit.retryAfter).toBe(retryAfter);
      expect(rateLimit.resetTime).toBeGreaterThan(Date.now());
    });

    test('should wait for existing rate limit before making requests', async () => {
      const startTime = Date.now();
      const waitTime = 100;
      
      // Set an existing rate limit
      slackAPI.updateRateLimit('auth.test', waitTime);
      
      mockClient.auth.test.mockResolvedValueOnce({ ok: true, user: 'test-user' });
      
      await slackAPI.checkAuth();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(waitTime - 10);
      expect(slackAPI.rateLimits.has('auth.test')).toBe(false); // Should be cleared after wait
    });
  });

  describe('Error Handling and Retries', () => {
    test('should retry on rate limit errors with exponential backoff', async () => {
      const rateLimitError = new Error('Rate limited');
      rateLimitError.code = 'slack_webapi_rate_limited';
      rateLimitError.retryAfter = 0.1; // 100ms
      
      mockClient.auth.test
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ ok: true, user: 'test-user' });
      
      const result = await slackAPI.checkAuth();
      
      expect(result).toEqual({ ok: true, user: 'test-user' });
      expect(mockClient.auth.test).toHaveBeenCalledTimes(3);
    });

    test('should retry on server errors with exponential backoff', async () => {
      const serverError = new Error('Internal server error');
      serverError.code = 'slack_webapi_platform_error';
      serverError.data = { error: 'internal_error' };
      
      mockClient.conversations.list
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ channels: [{ id: 'C123', name: 'test' }] });
      
      const result = await slackAPI.getChannels();
      
      expect(result).toEqual([{ id: 'C123', name: 'test' }]);
      expect(mockClient.conversations.list).toHaveBeenCalledTimes(2);
    });

    test('should retry on network errors', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'ENOTFOUND';
      
      mockClient.users.info
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ user: { id: 'U123', name: 'test-user' } });
      
      const result = await slackAPI.getUserInfo('U123');
      
      expect(result).toEqual({ id: 'U123', name: 'test-user' });
      expect(mockClient.users.info).toHaveBeenCalledTimes(2);
    });

    test('should not retry on non-retryable errors', async () => {
      const authError = new Error('Invalid token');
      authError.code = 'invalid_auth';
      
      mockClient.auth.test.mockRejectedValueOnce(authError);
      
      await expect(slackAPI.checkAuth()).rejects.toThrow('Invalid token');
      expect(mockClient.auth.test).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      const serverError = new Error('Server error');
      serverError.code = 'slack_webapi_platform_error';
      
      mockClient.auth.test.mockRejectedValue(serverError);
      
      await expect(slackAPI.checkAuth()).rejects.toThrow('Slack API error after 3 attempts');
      expect(mockClient.auth.test).toHaveBeenCalledTimes(3);
    });
  });

  describe('API Methods', () => {
    test('checkAuth should return authentication info', async () => {
      const authResponse = { ok: true, user: 'test-user', team: 'test-team', bot_id: 'B123' };
      mockClient.auth.test.mockResolvedValueOnce(authResponse);
      
      const result = await slackAPI.checkAuth();
      
      expect(result).toEqual(authResponse);
      expect(mockClient.auth.test).toHaveBeenCalledWith();
    });

    test('getChannels should return channel list', async () => {
      const channels = [
        { id: 'C123', name: 'general' },
        { id: 'C456', name: 'random' }
      ];
      mockClient.conversations.list.mockResolvedValueOnce({ channels });
      
      const result = await slackAPI.getChannels();
      
      expect(result).toEqual(channels);
      expect(mockClient.conversations.list).toHaveBeenCalledWith({
        types: 'public_channel,private_channel',
        limit: 1000,
        exclude_archived: true
      });
    });

    test('getChannelHistory should return messages', async () => {
      const messages = [
        { ts: '1234567890.123', text: 'Hello world', user: 'U123' }
      ];
      mockClient.conversations.history.mockResolvedValueOnce({ messages });
      
      const result = await slackAPI.getChannelHistory('C123');
      
      expect(result).toEqual(messages);
      expect(mockClient.conversations.history).toHaveBeenCalledWith({
        channel: 'C123',
        limit: 1000,
        inclusive: true
      });
    });

    test('getChannelHistory should handle since parameter', async () => {
      const messages = [{ ts: '1234567890.123', text: 'Hello' }];
      mockClient.conversations.history.mockResolvedValueOnce({ messages });
      
      const since = '2024-01-01T00:00:00Z';
      await slackAPI.getChannelHistory('C123', since);
      
      const expectedTimestamp = (new Date(since).getTime() / 1000).toString();
      expect(mockClient.conversations.history).toHaveBeenCalledWith({
        channel: 'C123',
        limit: 1000,
        inclusive: true,
        oldest: expectedTimestamp
      });
    });

    test('getThreadReplies should return thread messages', async () => {
      const messages = [
        { ts: '1234567890.123', text: 'Original' },
        { ts: '1234567890.456', text: 'Reply' }
      ];
      mockClient.conversations.replies.mockResolvedValueOnce({ messages });
      
      const result = await slackAPI.getThreadReplies('C123', '1234567890.123');
      
      expect(result).toEqual(messages);
      expect(mockClient.conversations.replies).toHaveBeenCalledWith({
        channel: 'C123',
        ts: '1234567890.123',
        inclusive: true
      });
    });

    test('getThreadReplies should handle errors gracefully', async () => {
      mockClient.conversations.replies.mockRejectedValueOnce(new Error('Thread not found'));
      
      const result = await slackAPI.getThreadReplies('C123', '1234567890.123');
      
      expect(result).toEqual([]);
    });

    test('getUserInfo should return user data', async () => {
      const user = { id: 'U123', name: 'test-user', real_name: 'Test User' };
      mockClient.users.info.mockResolvedValueOnce({ user });
      
      const result = await slackAPI.getUserInfo('U123');
      
      expect(result).toEqual(user);
      expect(mockClient.users.info).toHaveBeenCalledWith({ user: 'U123' });
    });

    test('getUserInfo should handle errors gracefully', async () => {
      mockClient.users.info.mockRejectedValueOnce(new Error('User not found'));
      
      const result = await slackAPI.getUserInfo('U123');
      
      expect(result).toBeNull();
    });

    test('getChannelInfo should return channel data', async () => {
      const channel = { id: 'C123', name: 'general', purpose: { value: 'Main channel' } };
      mockClient.conversations.info.mockResolvedValueOnce({ channel });
      
      const result = await slackAPI.getChannelInfo('C123');
      
      expect(result).toEqual(channel);
      expect(mockClient.conversations.info).toHaveBeenCalledWith({ channel: 'C123' });
    });

    test('getChannelInfo should handle errors gracefully', async () => {
      mockClient.conversations.info.mockRejectedValueOnce(new Error('Channel not found'));
      
      const result = await slackAPI.getChannelInfo('C123');
      
      expect(result).toBeNull();
    });
  });

  describe('Message Formatting', () => {
    test('should format basic message correctly', () => {
      const message = {
        ts: '1234567890.123',
        text: 'Hello world',
        user: 'U123',
        reactions: [{ name: 'thumbsup', count: 2 }]
      };
      
      const channelInfo = { id: 'C123', name: 'general' };
      const formatted = slackAPI.formatMessage(message, channelInfo);
      
      expect(formatted).toMatchObject({
        id: 'msg-1234567890.123',
        type: 'message',
        title: 'Hello world',
        content: 'Hello world',
        text: 'Hello world',
        user_id: 'U123',
        channel_id: 'C123',
        channel_name: 'general',
        reactions: [{ name: 'thumbsup', count: 2 }],
        is_bot: false
      });
      
      expect(formatted.timestamp).toBe(new Date(1234567890123).toISOString());
      expect(formatted.permalink).toContain('slack.com/archives/C123');
    });

    test('should handle messages with attachments', () => {
      const message = {
        ts: '1234567890.123',
        text: 'Check this out',
        user: 'U123',
        attachments: [{
          title: 'Test Attachment',
          text: 'Attachment text',
          color: 'good',
          service_name: 'GitHub'
        }]
      };
      
      const channelInfo = { id: 'C123', name: 'general' };
      const formatted = slackAPI.formatMessage(message, channelInfo);
      
      expect(formatted.attachments).toEqual([{
        title: 'Test Attachment',
        text: 'Attachment text',
        color: 'good',
        service_name: 'GitHub',
        from_url: undefined
      }]);
    });

    test('should handle messages with files', () => {
      const message = {
        ts: '1234567890.123',
        text: 'Shared a file',
        user: 'U123',
        files: [{
          name: 'document.pdf',
          title: 'Important Document',
          mimetype: 'application/pdf',
          size: 12345
        }]
      };
      
      const channelInfo = { id: 'C123', name: 'general' };
      const formatted = slackAPI.formatMessage(message, channelInfo);
      
      expect(formatted.files).toEqual([{
        name: 'document.pdf',
        title: 'Important Document',
        mimetype: 'application/pdf',
        filetype: undefined,
        size: 12345,
        url_private: undefined,
        permalink: undefined
      }]);
    });

    test('should handle bot messages', () => {
      const message = {
        ts: '1234567890.123',
        text: 'Bot message',
        bot_id: 'B123',
        subtype: 'bot_message'
      };
      
      const channelInfo = { id: 'C123', name: 'general' };
      const formatted = slackAPI.formatMessage(message, channelInfo);
      
      expect(formatted.is_bot).toBe(true);
      expect(formatted.bot_id).toBe('B123');
      expect(formatted.subtype).toBe('bot_message');
    });
  });

  describe('Demo Data', () => {
    test('getDemoSlackMessages should return sample messages', () => {
      const messages = getDemoSlackMessages();
      
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      
      const firstMessage = messages[0];
      expect(firstMessage).toHaveProperty('id');
      expect(firstMessage).toHaveProperty('type', 'message');
      expect(firstMessage).toHaveProperty('content');
      expect(firstMessage).toHaveProperty('timestamp');
      expect(firstMessage).toHaveProperty('channel_name');
    });

    test('getDemoSlackChannels should return sample channels', () => {
      const channels = getDemoSlackChannels();
      
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.length).toBeGreaterThan(0);
      
      const firstChannel = channels[0];
      expect(firstChannel).toHaveProperty('id');
      expect(firstChannel).toHaveProperty('name');
      expect(firstChannel).toHaveProperty('is_channel', true);
      expect(firstChannel).toHaveProperty('created');
    });
  });

  describe('Utility Methods', () => {
    test('sleep should wait for specified time', async () => {
      const startTime = Date.now();
      await slackAPI.sleep(50);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(40); // Allow some timing tolerance
    });

    test('extractTextFromBlocks should handle rich text blocks', () => {
      const blocks = [
        {
          type: 'section',
          text: { text: 'Section text' }
        },
        {
          type: 'rich_text',
          elements: [{
            type: 'rich_text_section',
            elements: [{ text: 'Rich text content' }]
          }]
        }
      ];
      
      const result = slackAPI.extractTextFromBlocks(blocks);
      expect(result).toBe('Section text\nRich text content');
    });
  });
});
