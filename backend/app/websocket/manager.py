from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import asyncio
import json

class ConnectionManager:
    """Manager for WebSocket connections between frontend and backend."""
    
    def __init__(self):
        # Stores active connections, mapping session_id to a list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        print("ConnectionManager initialized")

    async def connect(self, websocket: WebSocket, session_id: str):
        """Add a WebSocket connection to the manager."""
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        print(f"WebSocket connected for session {session_id}. Total clients: {len(self.active_connections[session_id])}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        """Remove a WebSocket connection from the manager."""
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
                print(f"WebSocket disconnected for session {session_id}. Remaining clients: {len(self.active_connections[session_id])}")
                if not self.active_connections[session_id]: # Remove session_id if no clients left
                    del self.active_connections[session_id]
                    print(f"Removed session {session_id} from active connections.")
        else:
             print(f"Warning: Tried to disconnect WebSocket for unknown session {session_id}")

    async def send_personal_message(self, message, websocket: WebSocket):
        """Send a message to a specific client."""
        if isinstance(message, str):
            await websocket.send_text(message)
        elif isinstance(message, dict):
            await websocket.send_json(message)
        elif isinstance(message, bytes):
            await websocket.send_bytes(message)

    async def broadcast_to_session(self, message, session_id: str):
        """Broadcast a message to all connections for a particular session."""
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    if isinstance(message, str):
                        await connection.send_text(message)
                    elif isinstance(message, dict):
                        await connection.send_json(message)
                    elif isinstance(message, bytes):
                        await connection.send_bytes(message)
                except Exception as e:
                    print(f"Error broadcasting message to client: {e}")
        else:
            print(f"No active connections found for session {session_id}")

# Instantiate the manager (could use FastAPI dependency injection later)
manager = ConnectionManager() 