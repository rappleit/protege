# Placeholder for Gemini API interaction client
# This class will handle the WebSocket connection to the Gemini Multimodal Live API
import asyncio
import os
import json
import uuid
import base64
from typing import Dict, List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from .websocket_client import GeminiWebSocketClient

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variables
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Check your .env file.")

# Configure the Gemini API
genai.configure(api_key=GOOGLE_API_KEY)

class GeminiSessionController:
    """
    Handles communication with Gemini API.
    This controller manages the session and integrates with the WebSocket client.
    """
    def __init__(self, session_id: str, persona_config: dict):
        self.session_id = session_id
        self.persona_config = persona_config
        self.websocket_client = None
        self.history = []  # To store conversation history
        print(f"GeminiSessionController initialized for session {session_id}")
        
        # Prepare system instruction from persona config

        print("print out all the persona config", persona_config)
        # self.system_instruction = f"""
        # You are a {persona_config.role}. 
        
        # Your capabilities include: {', '.join(persona_config.capabilities)}
        
        # Your goals are: {', '.join(persona_config.goals)}
        
        # Follow this workflow: {', '.join(persona_config.workflow)}
        
        # Maintain a {persona_config.behaviour.get('tone', 'neutral')} tone.
        
        # Topic for this session: {self.session_id}
        # """
        self.system_instruction = "You are a tutor"

    async def connect(self):
        """Connect to the Gemini API via WebSocket."""
        try:
            print(f"Connecting to Gemini API for session {self.session_id}...")
            
            # Create and connect the WebSocket client
            self.websocket_client = GeminiWebSocketClient(self.session_id)
            await self.websocket_client.connect(system_instruction=self.system_instruction)
            
            print(f"Connected to Gemini API for session {self.session_id}")
            return True
            
        except Exception as e:
            print(f"Failed to connect to Gemini API: {e}")
            self.websocket_client = None
            raise

    async def send_message(self, message: str):
        """Send a message to the Gemini API and get the response."""
        if not self.websocket_client:
            print("Error: Not connected to Gemini API.")
            return None
            
        try:
            # Add to history
            self.history.append({"role": "user", "parts": [message]})
            
            # Send message via WebSocket
            result = await self.websocket_client.send_message(message)
            
            # Note: Response will be handled asynchronously through the WebSocket connection
            # and forwarded to the frontend directly
            return "Message sent to Gemini. Response will be streamed."
            
        except Exception as e:
            print(f"Error sending message to Gemini: {e}")
            return None

    async def send_message_streaming(self, message: str, websocket=None):
        """
        Send a message and stream the response through the WebSocket.
        
        This method attaches the frontend WebSocket to the Gemini WebSocket client
        for direct streaming of responses.
        """
        if not self.websocket_client:
            print("Error: Not connected to Gemini API.")
            if websocket:
                await websocket.send_json({"error": "Not connected to Gemini API"})
            return
            
        try:
            # Add to history
            self.history.append({"role": "user", "parts": [message]})
            
            # Attach the frontend WebSocket to the Gemini WebSocket client
            await self.websocket_client.attach_frontend(websocket)
            
            # Send the message
            await self.websocket_client.send_message(message)
            
            # The WebSocket client will handle streaming the response to the frontend
            return "Streaming message to client"
            
        except Exception as e:
            print(f"Error streaming message from Gemini: {e}")
            if websocket:
                await websocket.send_json({"error": f"Gemini API error: {str(e)}"})
            return None

    async def send_multimodal_message(self, text: str, images: List[str] = None):
        """Send a multimodal message with text and images to Gemini."""
        if not self.websocket_client:
            print("Error: Not connected to Gemini API.")
            return None
            
        try:
            # Send image(s) with text
            if images and len(images) > 0:
                # Currently, we'll just send the first image
                # For multiple images, we'd need to handle them differently
                result = await self.websocket_client.send_image(text, images[0])
                
                # Add to history
                parts = [text] if text else []
                parts.extend(["[Image uploaded]" for _ in images])
                self.history.append({"role": "user", "parts": parts})
                
                # Note: Response will be handled through the WebSocket
                return "Image sent to Gemini. Response will be streamed."
            else:
                # Just send text if no images
                return await self.send_message(text)
            
        except Exception as e:
            print(f"Error sending multimodal message to Gemini: {e}")
            return None

    async def send_audio(self, audio_chunk: bytes):
        """Send audio data directly to Gemini."""
        if not self.websocket_client:
            print("Error: Not connected to Gemini API.")
            return False
            
        try:
            # Send the audio chunk
            return await self.websocket_client.send_audio(audio_chunk)
        except Exception as e:
            print(f"Error sending audio to Gemini: {e}")
            return False

    async def get_history(self):
        """Return the conversation history."""
        return self.history

    async def close(self):
        """Close the connection to the Gemini API."""
        print(f"Closing connection to Gemini API for session {self.session_id}")
        
        if self.websocket_client:
            await self.websocket_client.close()
            self.websocket_client = None
            
        print(f"Gemini API connection closed for session {self.session_id}")
        return True 