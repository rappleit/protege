import os
import json
import secrets
import hmac
import hashlib
import time
import base64
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Header, status, HTTPException
from fastapi.responses import JSONResponse
from .manager import manager
from ..session.service import session_service
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Generate a random shared secret key for simple frontend validation
# In production, use a more secure method
FRONTEND_WS_SECRET = os.getenv("FRONTEND_WS_SECRET", secrets.token_hex(16))
print(f"WebSocket validation secret initialized")

router = APIRouter()

# Endpoint to get a short-lived token for WebSocket connections
@router.get("/ws-token")
async def get_ws_token():
    """Generate a short-lived token for WebSocket connection."""
    # Create a token valid for 5 minutes
    timestamp = int(time.time()) + 300  # 5 minutes
    token_data = f"{timestamp}"
    
    # Create signature
    signature = hmac.new(
        FRONTEND_WS_SECRET.encode(),
        token_data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return {"token": f"{timestamp}:{signature}", "expires": timestamp}

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    session_id: str,
    token: str = Query(...),
    origin: str = Header(None)
):
    """WebSocket endpoint for real-time communication between frontend and Gemini."""
    # Basic origin validation (optional, depends on your CORS needs)
    allowed_origins = ['http://localhost:3000', 'http://localhost:5173', 'https://your-production-domain.com']
    if origin and origin not in allowed_origins:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Validate token
    try:
        timestamp_str, signature = token.split(":")
        timestamp = int(timestamp_str)
        
        # Check if token has expired
        if timestamp < int(time.time()):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Verify signature
        expected_signature = hmac.new(
            FRONTEND_WS_SECRET.encode(),
            timestamp_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not secrets.compare_digest(signature, expected_signature):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception as e:
        print(f"Token validation error: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # First, check if the session exists
    session = session_service.get_session(session_id)
    if not session:
        # WebSockets can't return HTTP errors directly, so we need to connect first
        await websocket.accept()
        await websocket.send_json({"error": f"Session {session_id} not found"})
        await websocket.close()
        return

    # Accept the connection and add it to the manager
    await websocket.accept()
    await manager.connect(websocket, session_id)
    
    # Get the Gemini controller for this session
    controller = session_service.get_gemini_controller(session_id)
    if not controller:
        await websocket.send_json({"error": "No Gemini controller for this session"})
        await websocket.close()
        return
    
    try:
        # Bridge the frontend WebSocket to the Gemini WebSocket
        while True:
            # Wait for a message from the client
            message = await websocket.receive()
            
            # Check if it's a text or binary message
            if "text" in message:
                try:
                    # Try to parse as JSON
                    message_data = json.loads(message["text"])
                    message_type = message_data.get("type", "text")
                    
                    # Handle different message types
                    if message_type == "text":
                        content = message_data.get("content", "")
                        await controller.send_message_streaming(content, websocket)
                        
                    elif message_type == "image":
                        # Handle image messages (text + base64 image)
                        text = message_data.get("text", "")
                        image_data = message_data.get("image")
                        
                        if image_data:
                            await controller.send_multimodal_message(text, [image_data])
                        else:
                            await websocket.send_json({"error": "Invalid image data"})
                    
                    elif message_type == "activity":
                        # Handle activity signals
                        activity = message_data.get("activity")
                        if activity == "start":
                            await controller.websocket_client.send_activity_start()
                        elif activity == "end":
                            await controller.websocket_client.send_activity_end()
                    
                    else:
                        await websocket.send_json({"error": f"Unsupported message type: {message_type}"})
                
                except json.JSONDecodeError:
                    # Handle plain text messages
                    await controller.send_message_streaming(message["text"], websocket)
            
            # Handle binary messages (like audio)
            elif "bytes" in message:
                binary_data = message["bytes"]
                
                # Check for audio chunks
                await controller.send_audio(binary_data)
            
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")
        manager.disconnect(websocket, session_id)
    except Exception as e:
        print(f"Error in WebSocket for session {session_id}: {e}")
        manager.disconnect(websocket, session_id) 