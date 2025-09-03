const { GitHubAPI } = require('./index');
const { Octokit } = require('@octokit/rest');

// Mock Octokit
jest.mock('@octokit/rest');

describe('GitHubAPI', () => {
  let githubAPI;
  let mockOctokit;

  beforeEach(() => {
    // Create mock Octokit instance
    mockOctokit = {
      rateLimit: {
        get: jest.fn()
      },
      repos: {
        listForUser: jest.fn(),
        get: jest.fn(),
        listCommits: jest.fn(),
        listReleases: jest.fn(),
        getReadme: jest.fn()
      },
      issues: {
        listForRepo: jest.fn()
      },
      pulls: {
        list: jest.fn()
      }
    };

    Octokit.mockImplementation(() => mockOctokit);
    githubAPI = new GitHubAPI('test-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should return rate limit information on success', async () => {
      const mockRateData = {
        core: {
          remaining: 4500,
          reset: Date.now() / 1000 + 3600,
          limit: 5000
        }
      };
      mockOctokit.rateLimit.get.mockResolvedValue({ data: mockRateData });

      const result = await githubAPI.checkRateLimit();

      expect(result).toEqual({
        remaining: 4500,
        reset: expect.any(Date),
        limit: 5000
      });
      expect(mockOctokit.rateLimit.get).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limit check failure gracefully', async () => {
      mockOctokit.rateLimit.get.mockRejectedValue(new Error('API Error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await githubAPI.checkRateLimit();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Could not check rate limit:', 'API Error');
      
      consoleSpy.mockRestore();
    });

    it('should warn when rate limit is low', async () => {
      const mockRateData = {
        core: {
          remaining: 50,
          reset: Date.now() / 1000 + 3600,
          limit: 5000
        }
      };
      mockOctokit.rateLimit.get.mockResolvedValue({ data: mockRateData });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await githubAPI.checkRateLimit();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 GitHub rate limit low: 50 remaining until')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getRepositories', () => {
    it('should fetch repositories successfully', async () => {
      const mockRepos = [
        { id: 1, name: 'repo1', full_name: 'owner/repo1' },
        { id: 2, name: 'repo2', full_name: 'owner/repo2' }
      ];
      mockOctokit.repos.listForUser.mockResolvedValue({ data: mockRepos });

      const result = await githubAPI.getRepositories('testowner');

      expect(result).toEqual(mockRepos);
      expect(mockOctokit.repos.listForUser).toHaveBeenCalledWith({
        username: 'testowner',
        type: 'all',
        sort: 'updated',
        per_page: 100
      });
    });

    it('should include since parameter when provided', async () => {
      const mockRepos = [];
      mockOctokit.repos.listForUser.mockResolvedValue({ data: mockRepos });
      const since = '2023-01-01T00:00:00Z';

      await githubAPI.getRepositories('testowner', since);

      expect(mockOctokit.repos.listForUser).toHaveBeenCalledWith({
        username: 'testowner',
        type: 'all',
        sort: 'updated',
        per_page: 100,
        since
      });
    });

    it('should retry on rate limit error', async () => {
      const rateLimitError = new Error('API rate limit exceeded');
      rateLimitError.status = 403;
      rateLimitError.message = 'API rate limit exceeded for user';
      
      const mockRepos = [{ id: 1, name: 'repo1' }];

      mockOctokit.repos.listForUser
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: mockRepos });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const sleepSpy = jest.spyOn(githubAPI, 'sleep').mockResolvedValue();

      const result = await githubAPI.getRepositories('testowner');

      expect(result).toEqual(mockRepos);
      expect(mockOctokit.repos.listForUser).toHaveBeenCalledTimes(2);
      expect(sleepSpy).toHaveBeenCalledWith(60000); // 1 minute wait
      
      consoleSpy.mockRestore();
      sleepSpy.mockRestore();
    });

    it('should retry on server error with exponential backoff', async () => {
      const serverError = new Error('Internal Server Error');
      serverError.status = 500;
      
      const mockRepos = [{ id: 1, name: 'repo1' }];

      mockOctokit.repos.listForUser
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ data: mockRepos });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const sleepSpy = jest.spyOn(githubAPI, 'sleep').mockResolvedValue();

      const result = await githubAPI.getRepositories('testowner');

      expect(result).toEqual(mockRepos);
      expect(sleepSpy).toHaveBeenCalledWith(1000); // 1 second exponential backoff
      
      consoleSpy.mockRestore();
      sleepSpy.mockRestore();
    });

    it('should fail after max retries', async () => {
      const persistentError = new Error('Persistent error');
      persistentError.status = 500;
      
      mockOctokit.repos.listForUser.mockRejectedValue(persistentError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const sleepSpy = jest.spyOn(githubAPI, 'sleep').mockResolvedValue();

      await expect(githubAPI.getRepositories('testowner')).rejects.toThrow(
        'GitHub API error after 3 attempts: Persistent error'
      );

      expect(mockOctokit.repos.listForUser).toHaveBeenCalledTimes(3);
      
      consoleSpy.mockRestore();
      sleepSpy.mockRestore();
    });
  });

  describe('getRepository', () => {
    it('should fetch single repository successfully', async () => {
      const mockRepo = { id: 1, name: 'test-repo', full_name: 'owner/test-repo' };
      mockOctokit.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await githubAPI.getRepository('owner', 'test-repo');

      expect(result).toEqual(mockRepo);
      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo'
      });
    });
  });

  describe('getPullRequests', () => {
    it('should fetch pull requests successfully', async () => {
      const mockPRs = [
        { id: 1, number: 1, title: 'PR 1', updated_at: '2023-01-01T00:00:00Z' },
        { id: 2, number: 2, title: 'PR 2', updated_at: '2023-01-02T00:00:00Z' }
      ];
      mockOctokit.pulls.list.mockResolvedValue({ data: mockPRs });

      const result = await githubAPI.getPullRequests('owner', 'repo');

      expect(result).toEqual(mockPRs);
      expect(mockOctokit.pulls.list).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        state: 'all',
        sort: 'updated',
        per_page: 100
      });
    });

    it('should filter pull requests by since date', async () => {
      const mockPRs = [
        { id: 1, number: 1, title: 'PR 1', updated_at: '2023-01-01T00:00:00Z' },
        { id: 2, number: 2, title: 'PR 2', updated_at: '2023-01-03T00:00:00Z' }
      ];
      mockOctokit.pulls.list.mockResolvedValue({ data: mockPRs });

      const result = await githubAPI.getPullRequests('owner', 'repo', '2023-01-02T00:00:00Z');

      expect(result).toEqual([mockPRs[1]]); // Only PR 2 should be included
    });
  });

  describe('getReadme', () => {
    it('should fetch README successfully', async () => {
      const mockReadme = {
        content: Buffer.from('# Test README').toString('base64'),
        path: 'README.md',
        sha: 'abc123'
      };
      mockOctokit.repos.getReadme.mockResolvedValue({ data: mockReadme });

      const result = await githubAPI.getReadme('owner', 'repo');

      expect(result).toEqual({
        content: '# Test README',
        path: 'README.md',
        sha: 'abc123'
      });
    });

    it('should return null for 404 (no README found)', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.status = 404;
      mockOctokit.repos.getReadme.mockRejectedValue(notFoundError);

      const result = await githubAPI.getReadme('owner', 'repo');

      expect(result).toBeNull();
    });

    it('should throw non-404 errors for retry logic', async () => {
      const serverError = new Error('Server Error');
      serverError.status = 500;
      mockOctokit.repos.getReadme.mockRejectedValue(serverError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const sleepSpy = jest.spyOn(githubAPI, 'sleep').mockResolvedValue();

      await expect(githubAPI.getReadme('owner', 'repo')).rejects.toThrow(
        'GitHub API error after 3 attempts: Server Error'
      );

      consoleSpy.mockRestore();
      sleepSpy.mockRestore();
    });
  });

  describe('retryWithBackoff', () => {
    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new Error('Bad Request');
      nonRetryableError.status = 400;
      
      const operation = jest.fn().mockRejectedValue(nonRetryableError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        githubAPI.retryWithBackoff(operation, 'test')
      ).rejects.toThrow('Bad Request');

      expect(operation).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });
  });
});
