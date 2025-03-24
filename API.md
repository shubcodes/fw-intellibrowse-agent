# IntelliBrowse API Documentation

This document describes the RESTful API endpoints provided by the IntelliBrowse agent server.

## Base URL

All endpoints are prefixed with `/api/agent`.

For local development: `http://localhost:3001/api/agent`

## Authentication

Authentication is not currently implemented. Future versions will include API key authentication.

## Endpoints

### Session Management

#### Create a New Session

```
POST /session
```

Creates a new agent session.

**Request Body**: None

**Response**:
```json
{
  "success": true,
  "sessionId": "session-1234567890"
}
```

#### Get Session Information

```
GET /session/:sessionId
```

Retrieves information about a specific session.

**Parameters**:
- `sessionId` (path parameter) - The session ID

**Response**:
```json
{
  "success": true,
  "sessionId": "session-1234567890",
  "messageHistory": [
    {
      "role": "system",
      "content": "System prompt..."
    },
    {
      "role": "user",
      "content": "User instruction..."
    },
    {
      "role": "assistant",
      "content": "Assistant response..."
    }
  ]
}
```

#### Delete a Session

```
DELETE /session/:sessionId
```

Cleans up resources associated with a session.

**Parameters**:
- `sessionId` (path parameter) - The session ID

**Response**:
```json
{
  "success": true,
  "message": "Session session-1234567890 cleaned up"
}
```

### Instruction Processing

#### Process an Instruction

```
POST /process
```

Processes a user instruction and returns a response.

**Request Body**:
```json
{
  "sessionId": "session-1234567890", // Optional, creates new session if not provided
  "instruction": "Search for the latest AI news"
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "session-1234567890",
  "response": "I searched for the latest AI news and found the following articles..."
}
```

#### Process an Instruction with Streaming

```
POST /process/stream
```

Processes a user instruction and returns a stream of Server-Sent Events (SSE).

**Request Body**:
```json
{
  "sessionId": "session-1234567890", // Optional, creates new session if not provided
  "instruction": "Search for the latest AI news"
}
```

**Response**: Server-Sent Events with the following format:

```
data: {"type":"session","sessionId":"session-1234567890"}

data: {"type":"assistant","content":"I'll search for the latest AI news."}

data: {"type":"toolCall","tool":"browser.search","params":{"query":"latest AI news"}}

data: {"type":"observation","content":"[Search results JSON]"}

data: {"type":"complete","content":"I searched for the latest AI news and found the following articles..."}
```

### Browser Interaction

#### Get Screenshot

```
GET /screenshot
```

Returns the current screenshot from the browser session.

**Response**: PNG image

## Response Formats

### Success Response

All successful responses will have a `success: true` field and relevant data.

### Error Response

All error responses will have a `success: false` field and an `error` message.

```json
{
  "success": false,
  "error": "Error message"
}
```

## Event Types for Streaming

When using the streaming endpoint, you will receive different event types:

- `session` - Session information (only if a new session is created)
- `assistant` - Thinking/reasoning from the agent
- `toolCall` - A tool being called by the agent
- `observation` - Results from a tool call
- `complete` - Final response from the agent
- `error` - Error message

## Rate Limiting

Rate limiting is not currently implemented, but will be added in future versions to prevent abuse.

## Webhooks

Webhook support for notification of completed tasks will be added in a future version.

## Examples

### Example: Creating a Session and Processing an Instruction

```javascript
// Create session
const sessionResponse = await fetch('http://localhost:3001/api/agent/session', {
  method: 'POST'
});
const { sessionId } = await sessionResponse.json();

// Process instruction
const instructionResponse = await fetch('http://localhost:3001/api/agent/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    instruction: 'Search for the latest AI news'
  })
});
const result = await instructionResponse.json();
console.log(result.response);
```

### Example: Processing an Instruction with Streaming

```javascript
const eventSource = new EventSource('/api/agent/process/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    instruction: 'Search for the latest AI news'
  })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'assistant':
      console.log('Agent thinking:', data.content);
      break;
    case 'toolCall':
      console.log('Agent using tool:', data.tool);
      break;
    case 'observation':
      console.log('Observation:', data.content);
      break;
    case 'complete':
      console.log('Final response:', data.content);
      eventSource.close();
      break;
    case 'error':
      console.error('Error:', data.content);
      eventSource.close();
      break;
  }
};
``` 