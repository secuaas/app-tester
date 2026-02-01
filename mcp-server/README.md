# TestForge MCP Server

Model Context Protocol (MCP) server for TestForge - enables AI assistants like Claude to interact with TestForge's testing platform.

## Features

The MCP server provides the following tools to AI assistants:

### Application Management
- `list_applications` - List all registered applications
- `create_application` - Create a new application

### Test Suite Management
- `list_tests` - List test suites (with optional filters)
- `create_test` - Create a new test suite
- `add_test_step` - Add steps to a test suite

### Test Execution
- `execute_test` - Run a test suite
- `get_execution_results` - Retrieve execution results
- `list_executions` - List recent executions

### Credentials
- `create_credential` - Store encrypted credentials (API keys, passwords, tokens)

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

Set environment variables:

```bash
export TESTFORGE_API_URL="http://localhost:3000/api/v1"
export TESTFORGE_API_KEY="your-api-key-here"
```

Or create a `.env` file:

```env
TESTFORGE_API_URL=http://localhost:3000/api/v1
TESTFORGE_API_KEY=your-api-key-here
```

## Usage

### Running the Server

```bash
npm start
```

### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "testforge": {
      "command": "node",
      "args": ["/path/to/app-tester/mcp-server/dist/index.js"],
      "env": {
        "TESTFORGE_API_URL": "https://testforge-backend.k8s-dev.secuaas.ca/api/v1",
        "TESTFORGE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Using with Claude

Once configured, you can ask Claude to interact with TestForge:

**Example prompts:**

- "List all applications in TestForge"
- "Create a new application called 'My API' with URL https://api.example.com"
- "Create an API test suite for the application"
- "Add an HTTP request step to check the /health endpoint"
- "Execute the test suite and show me the results"
- "List recent test executions"

## Tool Examples

### Create Application
```typescript
{
  "name": "My REST API",
  "description": "Production REST API",
  "url": "https://api.example.com"
}
```

### Create Test Suite
```typescript
{
  "name": "Health Check Tests",
  "description": "Verify all endpoints are healthy",
  "applicationId": "app-id-here",
  "type": "API",
  "tags": ["health", "smoke"]
}
```

### Add HTTP Request Step
```typescript
{
  "testId": "test-id-here",
  "name": "Check /health endpoint",
  "type": "HTTP_REQUEST",
  "order": 0,
  "config": {
    "method": "GET",
    "url": "/health",
    "headers": {
      "Accept": "application/json"
    }
  }
}
```

### Add Assertion Step
```typescript
{
  "testId": "test-id-here",
  "name": "Verify 200 status",
  "type": "ASSERTION",
  "order": 1,
  "config": {
    "type": "equals",
    "expected": "200",
    "actual": "${response.status}"
  }
}
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## Architecture

The MCP server acts as a bridge between AI assistants and the TestForge API:

```
Claude Desktop → MCP Server → TestForge API → Database
```

All communication uses the Model Context Protocol (MCP) standard defined by Anthropic.

## Security

- API keys are stored securely in environment variables
- All credentials created through the server are encrypted with AES-256-GCM
- HTTPS is recommended for production deployments

## License

Proprietary - SecuAAS © 2026
