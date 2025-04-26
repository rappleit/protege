import os
import json
import asyncio
import websockets
import base64
from typing import Dict, Optional, List, Any, Callable
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variables
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Check your .env file.")

# Configure the Gemini API
genai.configure(api_key=GOOGLE_API_KEY)

class GeminiWebSocketClient:
    """Client for interacting with Gemini's WebSocket API using the official Python client"""
    
    def __init__(self, session_id: str, model_name: str = "gemini-1.5-pro"):
        self.session_id = session_id
        self.model_name = model_name
        self.model = genai.GenerativeModel(model_name=self.model_name)
        self.chat_session = None
        self.is_connected = False
        self.frontend_ws = None
        self.close_event = asyncio.Event()
        self.listener_task = None
        
    async def connect(self, system_instruction: str = None, tools: List[Dict] = None):
        """Connect to Gemini API using the GenerativeModel class"""
        try:
            print(f"[{self.session_id}] Connecting to Gemini API...")
            
            # Configure generation settings
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
            
            # Set the model's generation config
            self.model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config=generation_config
            )
            
            # Create a chat session with system instructions if provided
            if system_instruction:
                self.chat_session = self.model.start_chat(
                    history=[
                        {"role": "user", "parts": [system_instruction]},
                        {"role": "model", "parts": ["I'll help you with that."]}
                    ]
                )
            else:
                self.chat_session = self.model.start_chat(history=[])
            
            print(f"[{self.session_id}] Connected to Gemini API with model {self.model_name}.")
            
            self.is_connected = True
            
            return True
        except Exception as e:
            print(f"Failed to connect to Gemini API: {e}")
            self.is_connected = False
            raise
    
    async def attach_frontend(self, frontend_ws):
        """Attach a frontend WebSocket for bidirectional communication"""
        self.frontend_ws = frontend_ws
        
    async def send_message(self, message: str, end_turn: bool = True):
        """Send a text message to Gemini"""
        if not self.is_connected or not self.chat_session:
            print("Error: Not connected to Gemini API.")
            return
            
        try:
            # Send message and get response - directly await the coroutine
            response = await self.chat_session.send_message_async(
                message,
                stream=True
            )
            
            print(f"Sent message to Gemini: {message}")
            
            # Process streaming response
            asyncio.create_task(self._process_response_stream(response))
                
            return True
        except Exception as e:
            print(f"Error sending message to Gemini: {e}")
            if self.frontend_ws:
                await self.frontend_ws.send_json({"error": str(e)})
            return False
    
    async def send_image(self, text: str, image_base64: str, mime_type: str = "image/jpeg", end_turn: bool = True):
        """Send an image with optional text to Gemini"""
        if not self.is_connected or not self.chat_session:
            print("Error: Not connected to Gemini API.")
            return
            
        try:
            # Create parts array with text and image
            parts = []
            
            # Add text if provided
            if text:
                parts.append({"text": text})
            
            # Add image
            if "base64," in image_base64:
                # Remove data URL prefix if present
                image_base64 = image_base64.split("base64,")[1]
                
            # Create image part using the Generative AI format
            image_part = {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": image_base64
                }
            }
            parts.append(image_part)
            
            # Send multimodal content - directly await the coroutine
            response = await self.chat_session.send_message_async(
                parts,
                stream=True
            )
            
            print(f"Sent image to Gemini with text: {text}")

            print(f"Response: {response}")
            
            # Process streaming response
            asyncio.create_task(self._process_response_stream(response))
                
            return True
        except Exception as e:
            print(f"Error sending image to Gemini: {e}")
            if self.frontend_ws:
                await self.frontend_ws.send_json({"error": str(e)})
            return False
    
    async def _process_response_stream(self, response_stream):
        """Process streaming responses from Gemini"""
        try:
            full_response = ""
            
            # Directly iterate through the response stream without awaiting it
            # AsyncGenerateContentResponse is already an async iterator
            async for chunk in response_stream:
                try:
                    if hasattr(chunk, 'text'):
                        # Get text from chunk
                        chunk_text = chunk.text
                        full_response += chunk_text
                        
                        # Send to frontend if connected
                        if self.frontend_ws:
                            await self.frontend_ws.send_json({
                                "text": chunk_text,
                                "chunk": True
                            })
                    
                except Exception as e:
                    print(f"Error processing chunk: {e}")
            
            # Send complete response
            if self.frontend_ws:
                await self.frontend_ws.send_json({
                    "text": full_response,
                    "complete": True
                })
                
        except Exception as e:
            print(f"Error in response stream processing: {e}")
            if self.frontend_ws:
                await self.frontend_ws.send_json({"error": str(e)})
    
    def _format_for_frontend(self, response) -> Dict:
        """Format Gemini's response for the frontend"""
        try:
            # Check for text in response
            if hasattr(response, "text"):
                return {"text": response.text}
                
            # Handle model content
            if hasattr(response, "parts"):
                for part in response.parts:
                    if hasattr(part, "text") and part.text:
                        return {"text": part.text}
                    elif hasattr(part, "inline_data"):
                        # Format inline data (images, audio, etc.)
                        return {
                            part.inline_data.mime_type.split("/")[0]: part.inline_data.data,
                            "mime_type": part.inline_data.mime_type
                        }
            
            # Default case - convert to dict and return
            return {"raw_gemini_message": str(response)}
        except Exception as e:
            print(f"Error formatting response: {e}")
            return {"error": f"Failed to format response: {str(e)}"}
    
    async def close(self):
        """Close the Gemini connection"""
        print(f"Closing Gemini connection for session {self.session_id}")
        
        # Signal listener to stop
        self.close_event.set()
        
        # No explicit close needed for chat session in this API
        self.chat_session = None
            
        self.is_connected = False
        print(f"Gemini connection closed for session {self.session_id}")
        return True 