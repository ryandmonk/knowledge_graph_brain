# 🔑 Connector Credential Testing Guide

This guide walks you through setting up and running comprehensive connector tests with real API credentials.

## 🚀 Quick Start

### 1. Setup Your Credentials

Choose one of these methods:

**Interactive Setup (Recommended):**
```bash
cd tests/e2e
./setup-credentials.sh --interactive
```

**Manual Environment Variables:**
```bash
# GitHub Credentials
export GITHUB_TOKEN="your_github_personal_access_token"
export GITHUB_REPOSITORIES="owner/repo1,owner/repo2"  # Optional

# Confluence Credentials  
export CONFLUENCE_BASE_URL="https://your-domain.atlassian.net"
export CONFLUENCE_EMAIL="your-email@company.com"
export CONFLUENCE_API_TOKEN="your_confluence_api_token"

# Slack Credentials (Optional)
export SLACK_BOT_TOKEN="xoxb-your-slack-bot-token"
```

**Manual .env File:**
```bash
# Edit the .env file directly
nano ../../.env
```

### 2. Verify Your Setup

```bash
./verify-credentials.sh
```

### 3. Run the Tests

```bash
# Run all production connector tests
npm run test:production:headed

# Or run individual connectors
npm run test:headed github-integration.spec.ts
npm run test:headed confluence-integration.spec.ts
npm run test:headed production-workflow.spec.ts
```

## 📋 Detailed Setup Instructions

### GitHub Personal Access Token Setup

1. **Go to GitHub Settings**
   - Navigate to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token**
   - Click "Generate new token (classic)"
   - Give it a descriptive name like "Knowledge Graph Brain Testing"
   - Select expiration (recommend 90 days for testing)

3. **Required Scopes**
   ```
   ✅ repo                    # Access to repositories
   ✅ read:org               # Read organization data
   ✅ read:user              # Read user profile data
   ```

4. **Add to Configuration**
   ```bash
   export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export GITHUB_REPOSITORIES="your-username/repo1,your-org/repo2"
   ```

### Confluence API Token Setup

1. **Go to Atlassian Account Settings**
   - Navigate to https://id.atlassian.com/manage-profile/security/api-tokens

2. **Create API Token**
   - Click "Create API token"
   - Give it a label like "Knowledge Graph Brain Testing"
   - Copy the generated token immediately

3. **Required Information**
   ```bash
   export CONFLUENCE_BASE_URL="https://your-company.atlassian.net"
   export CONFLUENCE_EMAIL="your-email@company.com"  
   export CONFLUENCE_API_TOKEN="ATATT3xFfGF0T...your_token_here"
   ```

### Slack Bot Token Setup (Optional)

1. **Create Slack App**
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"

2. **Configure Bot Scopes**
   - Go to OAuth & Permissions → Scopes → Bot Token Scopes
   - Add required scopes:
     ```
     channels:read
     channels:history  
     groups:read
     groups:history
     im:read
     im:history
     mpim:read
     mpim:history
     users:read
     ```

3. **Install to Workspace**
   - Go to Install App → Install to Workspace
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)

4. **Add to Configuration**
   ```bash
   export SLACK_BOT_TOKEN="xoxb-your-bot-token-here"
   ```

## 🧪 Testing Commands Reference

### Production Tests with Credentials
```bash
# All production tests
npm run test:production           # Headless mode
npm run test:production:headed    # With browser UI

# Individual connector tests
npm run test:github              # GitHub integration
npm run test:confluence          # Confluence integration
npm run test:workflow            # Complete workflow

# With specific browsers
npm run test:github -- --project=firefox
npm run test:confluence -- --project=webkit
```

### Development and Debug Tests
```bash
# Smoke tests (no credentials needed)
npm run test:smoke
npm run test:smoke:headed

# UI tests (no connectors needed)
npm run test:ui-comprehensive

# Debug mode
npm run test:debug -- tests/github-integration.spec.ts

# Interactive UI mode
npm run test:ui
```

### Credential Management
```bash
# Setup credentials interactively
npm run setup:credentials:interactive

# Verify current credentials
npm run verify:credentials

# Complete setup and verification
npm run setup:all
```

## 🔍 Troubleshooting

### Common Issues

**❌ "GITHUB_TOKEN not provided"**
```bash
# Solution: Set the environment variable
export GITHUB_TOKEN="your_token_here"
# Or run: ./setup-credentials.sh --interactive
```

**❌ "Connection failed: Authentication failed"**
- Check token is valid and not expired
- Verify token has required scopes
- For GitHub: Ensure token has `repo` and `read:org` scopes
- For Confluence: Verify email and API token are correct

**❌ "Confluence API access failed"**
- Check the domain URL format: `https://company.atlassian.net` (no trailing slash)
- Verify email address matches your Atlassian account
- Ensure API token is current (tokens don't expire but can be revoked)

**❌ "Rate limit exceeded"**
- GitHub: Wait for rate limit reset (5000 requests/hour)
- Confluence: Standard Atlassian limits (1000 requests/hour)
- Use `./verify-credentials.sh` to check current limits

### Debug Information

**Check Current Configuration:**
```bash
# View current environment variables
env | grep -E "(GITHUB|CONFLUENCE|SLACK)_"

# Test individual connector health
curl http://localhost:3002/health  # GitHub
curl http://localhost:3004/health  # Confluence
curl http://localhost:3003/health  # Slack
```

**Manual API Testing:**
```bash
# Test GitHub token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Test Confluence access
curl -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" \
  "$CONFLUENCE_BASE_URL/wiki/api/v2/spaces?limit=1"

# Test Slack token
curl -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  https://slack.com/api/auth.test
```

## 📊 Test Reports and Results

### Viewing Test Results
```bash
# Show latest test report
npm run show-report

# View test results in browser
open playwright-report/index.html
```

### Understanding Test Output

**✅ Successful Tests:**
- Connection established
- Authentication verified  
- Data ingestion completed
- Knowledge graph populated

**❌ Failed Tests:**
- Check console output for specific errors
- Review credential configuration
- Verify connector services are running
- Check API rate limits and permissions

### Expected Test Coverage

**GitHub Integration Tests:**
- ✅ Token authentication
- ✅ Repository access
- ✅ Data ingestion workflow
- ✅ Error handling

**Confluence Integration Tests:**
- ✅ API token authentication
- ✅ Space and page access
- ✅ Content ingestion
- ✅ Error handling

**Production Workflow Tests:**
- ✅ Complete setup wizard
- ✅ Multi-connector configuration
- ✅ End-to-end data flow
- ✅ Dashboard functionality

## 🔐 Security Best Practices

### Token Management
- **Never commit tokens** to version control
- **Use environment variables** or secure credential stores
- **Rotate tokens regularly** (every 90 days recommended)
- **Use minimal required scopes** for testing

### Local Development
- Store credentials in `.env` file (already gitignored)
- Use separate tokens for testing vs production
- Revoke testing tokens when no longer needed

### CI/CD Integration
- Use encrypted environment variables in CI
- Consider using GitHub Actions secrets
- Implement token rotation automation

## 📚 Additional Resources

- [GitHub Personal Access Tokens Guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Confluence API Token Guide](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
- [Slack Bot Token Guide](https://api.slack.com/authentication/token-types#bot)
- [Playwright Testing Documentation](https://playwright.dev/docs/intro)

---

**Need Help?** 
- Run `./verify-credentials.sh` for diagnostic information
- Check the main README.md for architecture details
- Review test logs in the `test-results/` directory