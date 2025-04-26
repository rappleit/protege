# Protege Backend

A FastAPI backend providing session management for interacting with Google's Gemini API. This backend handles WebSocket connections with the frontend for real-time communication.

## Setup

1. **Environment Setup**

   Create a `.env` file in the backend directory with the following variables:

   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   FRONTEND_WS_SECRET=some_random_string  # Will be generated automatically if not provided
   WS_HOST=0.0.0.0
   WS_PORT=9084
   ```

2. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Server**

   ```bash
   # Method 1: Using the start script
   python app/start.py

   # Method 2: Using uvicorn directly
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

- **Session Management**

  - `POST /api/v1/start-session` - Start a new Gemini session
  - `POST /api/v1/end-session/{session_id}` - End an active session
  - `GET /api/v1/get-lesson-report/{session_id}` - Get a report for the session

- **WebSocket**
  - `GET /api/v1/ws-token` - Get a token for WebSocket authentication
  - `WS /api/v1/ws/{session_id}?token=...` - WebSocket endpoint for real-time communication

## WebSocket Communication Protocol

1. **Authentication**

   - First get a token from `/api/v1/ws-token`
   - Connect to WebSocket with the token: `ws://localhost:8000/api/v1/ws/{session_id}?token=...`

2. **Message Types**

   - **Text Message**

     ```json
     {
       "type": "text",
       "content": "Your message here"
     }
     ```

   - **Image Message**
     ```json
     {
       "type": "image",
       "text": "Optional text to accompany the image",
       "image": "base64_encoded_image_data"
     }
     ```

3. **Response Format**

   The server will stream responses:

   ```json
   {"text": "Response chunk 1"}
   {"text": "Response chunk 2"}
   ```

   Error responses:

   ```json
   { "error": "Error message" }
   ```

## Frontend Connection Example

```javascript
// Get token first
const tokenResponse = await fetch("http://localhost:8000/api/v1/ws-token");
const { token } = await tokenResponse.json();

// Connect to WebSocket
const ws = new WebSocket(
  `ws://localhost:8000/api/v1/ws/${sessionId}?token=${token}`
);

ws.onopen = () => {
  console.log("Connected to WebSocket");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle response data
  if (data.text) {
    console.log("Received text:", data.text);
  } else if (data.error) {
    console.error("Error:", data.error);
  }
};

// Send a message
ws.send(
  JSON.stringify({
    type: "text",
    content: "Hello, Gemini!",
  })
);
```
