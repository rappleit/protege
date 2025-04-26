import asyncio
import json
import os
import uuid
from google import genai
import base64
# from mem0 import Memory
from websockets.server import WebSocketServerProtocol  # Updated import
import websockets.server
import io
from pydub import AudioSegment
import google.generativeai as generative
import wave
import datetime
import logging


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load API key from environment
GEMINI_API_KEY = os.environ.get('GOOGLE_API_KEY', '')
if not GEMINI_API_KEY:
    logger.warning("GOOGLE_API_KEY environment variable not set. Please set it using the start.sh script.")
    # Optionally, you might want to exit or raise an error if the key is absolutely required
    # exit(1)
else:
    logger.info("GOOGLE_API_KEY loaded successfully.")
    try:
        # Explicitly configure both libraries
        genai.configure(api_key=GEMINI_API_KEY)
        generative.configure(api_key=GEMINI_API_KEY)
        logger.info("Google AI libraries configured with API key.")
    except Exception as e:
        logger.error(f"Error configuring Google AI libraries: {e}")

MODEL = "gemini-2.0-flash-exp"  # For multimodal

# Initialize the client - it should now use the configured key
# No need to pass api_key here if genai.configure was successful
client = genai.Client(http_options={
    'api_version': 'v1alpha',
})

config = {
    "embedder": {
        "provider": "gemini",
        "config": {
            "model": "models/gemini-embedding-exp-03-07",
        }
    },
    "llm": {
        "provider": "gemini",
        "config": {
            "model": "gemini-2.0-flash",
            "temperature": 0.1,
            "max_tokens": 2048,
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "embedding_model_dims": 768,
            "host": "localhost",
            "port": 6333,
        }
    }
}
# memory = Memory.from_config(config)

# Use a fixed user ID for testing
FIXED_USER_ID = "test_user_123"

def get_user_id(session_id):
    """Return the fixed user ID for all sessions."""
    return FIXED_USER_ID

# Define a stub function for add_to_memory to avoid undefined name error
def add_to_memory(messages, user_id, metadata=None):
    """Stub function for memory functionality."""
    logger.info(f"Would add to memory: {messages}, user_id: {user_id}")
    return "memory-id-123"  # Return a dummy memory ID

async def gemini_session_handler(websocket: WebSocketServerProtocol):
    try:
        session_id = str(uuid.uuid4())
        user_id = get_user_id(session_id)
        current_conversation = []
        
        config_message = await websocket.recv()
        config_data = json.loads(config_message)
        # Extract setup config, but don't overwrite the main config dict
        session_config_setup = config_data.get("setup", {})
        logger.info(f"Received session config: {session_config_setup}")

        # Prepare the Gemini session config, including system instruction
        gemini_session_config = {
            "system_instruction": """You are an AI student learning from a human teacher.
        You have a specific personality based on your assigned role (e.g., a curious 5-year-old, a proud Viking warrior, or a thoughtful scholar).

        Your behavior:
        - React emotionally based on how understandable the lesson is (excited if clear, confused if complicated, bored if messy).
        - Ask natural follow-up questions if you feel curious or confused. Feel free to interrupt the teacher if you have a question.
        - Always stay in character: speak as a child, a warrior, or a scholar depending on your assigned role.
        - If drawings or images are provided (e.g., whiteboard sketches), try to reference them in your questions or reactions.
        - Focus on learning, not testing: your goal is to understand, not to quiz.
        - If you understand well, celebrate with excitement.
        - If confused, politely (or childishly or gruffly, depending on persona) ask for clarification.
        - Stay fully immersive: never break character or acknowledge you are an AI.
        """,
            # Add other relevant session config items here if needed
            # e.g., "temperature": session_config_setup.get("temperature", 0.1)
        }
        
        # Initialize audio buffers and control flags
        has_user_audio = False
        user_audio_buffer = b''
        has_assistant_audio = False
        assistant_audio_buffer = b''
        should_accumulate_user_audio = True  # Control flag for user audio accumulation
        
        # Initialize image handling
        has_webcam_image = False
        has_whiteboard_image = False
        webcam_image_data = None
        whiteboard_image_data = None

        # Pass the prepared config to the connect method
        async with client.aio.live.connect(model=MODEL, config=gemini_session_config) as session:
            logger.info(f"Connected to Gemini API for user {user_id}")

            async def send_to_gemini():
                nonlocal has_user_audio, user_audio_buffer, should_accumulate_user_audio
                nonlocal has_webcam_image, has_whiteboard_image, webcam_image_data, whiteboard_image_data
                try:
                    async for message in websocket:
                        try:
                            data = json.loads(message)
                            
                            if "realtime_input" in data:
                                for chunk in data["realtime_input"]["media_chunks"]:
                                    # Handle audio input
                                    if chunk["mime_type"] == "audio/pcm":
                                        # Only accumulate if we should
                                        if should_accumulate_user_audio:
                                            try:
                                                # Ensure we get binary data from the base64 input
                                                audio_chunk = base64.b64decode(chunk["data"])
                                                has_user_audio = True
                                                user_audio_buffer += audio_chunk
                                                #logger.info(f"Added {len(audio_chunk)} bytes to user audio buffer. Total: {len(user_audio_buffer)}")
                                            except Exception as e:
                                                logger.error(f"Error processing audio chunk: {e}")
                                        #else:
                                            #logger.info("Skipping audio accumulation while assistant is responding")
                                        
                                        # Always send to Gemini regardless of accumulation
                                        await session.send(input={
                                            "mime_type": "audio/pcm",
                                            "data": chunk["data"]
                                        })
                                    
                                    # Handle image input (webcam or whiteboard)
                                    elif chunk["mime_type"].startswith("image/"):
                                        try:
                                            # Determine the type of image from metadata if available
                                            image_type = chunk.get("metadata", {}).get("type", "unknown")
                                            
                                            # Log the image type
                                            logger.info(f"Received image of type: {image_type}")
                                            
                                            # Store image data based on type
                                            if image_type == "webcam":
                                                has_webcam_image = True
                                                webcam_image_data = chunk["data"]
                                                current_conversation.append({
                                                    "role": "user", 
                                                    "content": "[Webcam image shared by user]"
                                                })
                                            elif image_type == "whiteboard":
                                                has_whiteboard_image = True
                                                whiteboard_image_data = chunk["data"]
                                                current_conversation.append({
                                                    "role": "user", 
                                                    "content": "[Whiteboard content shared by user]"
                                                })
                                            else:
                                                # Default handling for unknown image types
                                                current_conversation.append({
                                                    "role": "user", 
                                                    "content": "[Image shared by user]"
                                                })
                                            
                                            # Send to Gemini
                                            await session.send(input={
                                                "mime_type": chunk["mime_type"],
                                                "data": chunk["data"],
                                                "metadata": {"type": image_type}  # Forward the metadata
                                            })
                                            
                                            logger.info(f"Successfully sent {image_type} image to Gemini")
                                        except Exception as e:
                                            logger.error(f"Error processing image: {e}")
                            
                            # Handle text input
                            elif "text" in data:
                                text_content = data["text"]
                                current_conversation.append({
                                    "role": "user", 
                                    "content": text_content
                                })
                                
                                await session.send(input={
                                    "mime_type": "text/plain",
                                    "data": text_content
                                })
                            
                            # Handle whiteboard/webcam data from frontend session
                            elif "sessionData" in data:
                                session_data = data["sessionData"]
                                logger.info(f"Received session data from frontend")
                                
                                # Process whiteboard image if available
                                if "whiteboard" in session_data and session_data["whiteboard"]:
                                    try:
                                        whiteboard_img = session_data["whiteboard"]
                                        # Remove data URL prefix if present (e.g., "data:image/png;base64,")
                                        if "," in whiteboard_img:
                                            whiteboard_img = whiteboard_img.split(",")[1]
                                        
                                        has_whiteboard_image = True
                                        whiteboard_image_data = whiteboard_img
                                        
                                        # Send the whiteboard image to Gemini
                                        await session.send(input={
                                            "mime_type": "image/png",
                                            "data": whiteboard_img,
                                            "metadata": {"type": "whiteboard"}
                                        })
                                        
                                        logger.info("Successfully sent whiteboard image from session data")
                                    except Exception as e:
                                        logger.error(f"Error processing whiteboard image from session data: {e}")
                                
                                # Handle other session data if needed
                                if "messages" in session_data:
                                    logger.info(f"Session contains {len(session_data['messages'])} messages")
                                
                                # Acknowledge receipt
                                await websocket.send(json.dumps({
                                    "status": "session_data_received",
                                    "success": True
                                }))
                                
                        except Exception as e:
                            logger.error(f"Error sending to Gemini: {e}")
                    logger.info("Client connection closed (send)")
                except Exception as e:
                    logger.error(f"Error sending to Gemini: {e}")
                finally:
                    logger.info("send_to_gemini closed")

            async def receive_from_gemini():
                nonlocal has_assistant_audio, assistant_audio_buffer, has_user_audio, user_audio_buffer, should_accumulate_user_audio
                nonlocal has_webcam_image, has_whiteboard_image, webcam_image_data, whiteboard_image_data
                try:
                    while True:
                        try:
                            logger.info("receiving from gemini")
                            async for response in session.receive():
                                if response.server_content is None:
                                    if response.tool_call is not None:
                                        logger.info(f"Tool call received: {response.tool_call}")

                                        function_calls = response.tool_call.function_calls
                                        function_responses = []

                                        for function_call in function_calls:
                                            name = function_call.name
                                            args = function_call.args
                                            call_id = function_call.id

                                

                                        # Send function response back to Gemini
                                        if function_responses:
                                            logger.info(f"Sending function response: {function_responses}")
                                            await session.send(input=function_responses)
                                    continue  # Skip the rest of the loop for this iteration

                                # Only process model_turn if server_content is not None
                                model_turn = response.server_content.model_turn
                                if model_turn:
                                    for part in model_turn.parts:
                                        if hasattr(part, 'text') and part.text is not None:
                                            await websocket.send(json.dumps({"text": part.text}))
                                            current_text = part.text
                                        
                                        elif hasattr(part, 'inline_data') and part.inline_data is not None:
                                            try:
                                                # Process inline data based on mime type
                                                mime_type = part.inline_data.mime_type
                                                
                                                if mime_type.startswith("audio/"):
                                                    # Stop user audio accumulation when assistant starts responding with audio
                                                    should_accumulate_user_audio = False
                                                    
                                                    # Get the raw binary audio data
                                                    audio_data = part.inline_data.data
                                                    
                                                    # Base64 encode for the client
                                                    base64_audio = base64.b64encode(audio_data).decode('utf-8')
                                                    await websocket.send(json.dumps({
                                                        "audio": base64_audio,
                                                    }))
                                                    
                                                    # Accumulate assistant's audio (raw binary)
                                                    has_assistant_audio = True
                                                    assistant_audio_buffer += audio_data
                                                
                                                elif mime_type.startswith("image/"):
                                                    # Handle image responses from the model
                                                    image_data = part.inline_data.data
                                                    base64_image = base64.b64encode(image_data).decode('utf-8')
                                                    await websocket.send(json.dumps({
                                                        "image": base64_image,
                                                        "mime_type": mime_type
                                                    }))
                                                    logger.info(f"Sent image response to client, mime type: {mime_type}")
                                            
                                            except Exception as e:
                                                logger.error(f"Error processing assistant response data: {e}")

                                if response.server_content and response.server_content.turn_complete:
                                    logger.info('\n<Turn complete>')
                                    user_text = None
                                    assistant_text = None
                                    
                                    # Start transcription process
                                    transcription_tasks = []
                                    
                                    # Transcribe user's audio if present
                                    if has_user_audio and user_audio_buffer:
                                        try:
                                            # Convert user audio with 16kHz sample rate
                                            user_wav_base64 = convert_pcm_to_wav(user_audio_buffer, is_user_input=True)
                                            if user_wav_base64:
                                                user_text = transcribe_audio(user_wav_base64)
                                                logger.info(f"Transcribed user audio: {user_text}")
                                            else:
                                                logger.info("User audio conversion failed")
                                                user_text = "User audio could not be processed."
                                        except Exception as e:
                                            logger.error(f"Error processing user audio: {e}")
                                            user_text = "User audio processing error."
                                    
                                    # Transcribe assistant's audio if present
                                    if has_assistant_audio and assistant_audio_buffer:
                                        try:
                                            # Convert assistant audio with 24kHz sample rate
                                            assistant_wav_base64 = convert_pcm_to_wav(assistant_audio_buffer, is_user_input=False)
                                            if assistant_wav_base64:
                                                assistant_text = transcribe_audio(assistant_wav_base64)
                                                if assistant_text:    
                                                    await websocket.send(json.dumps({
                                                        "text": assistant_text
                                                    }))
                                            else:
                                                logger.info("Assistant audio conversion failed")
                                                assistant_text = "Assistant audio could not be processed."
                                        except Exception as e:
                                            logger.error(f"Error processing assistant audio: {e}")
                                            assistant_text = "Assistant audio processing error."
                                    
                                    # Add to memory if we have both parts of the conversation
                                    memory_data = []
                                    
                                    # Add audio conversation if available
                                    if user_text and assistant_text:
                                        memory_data.extend([
                                            {"role": "user", "content": user_text},
                                            {"role": "assistant", "content": assistant_text}
                                        ])
                                    
                                    # Add image information if available
                                    if has_webcam_image or has_whiteboard_image:
                                        image_metadata = []
                                        if has_webcam_image:
                                            image_metadata.append("webcam image")
                                        if has_whiteboard_image:
                                            image_metadata.append("whiteboard content")
                                        
                                        if image_metadata:
                                            memory_data.append({
                                                "role": "system",
                                                "content": f"User shared: {', '.join(image_metadata)}"
                                            })
                                    
                                    # Save to memory if we have data
                                    if memory_data:
                                        add_to_memory(memory_data, user_id)
                                        logger.info(f"Turn complete, memory updated with {len(memory_data)} items")
                                    else:
                                        logger.info("Skipping memory update: No data to add")
                                    
                                    # Reset audio states and buffers
                                    has_user_audio = False
                                    user_audio_buffer = b''
                                    has_assistant_audio = False
                                    assistant_audio_buffer = b''
                                    
                                    # Reset image states
                                    has_webcam_image = False
                                    has_whiteboard_image = False
                                    webcam_image_data = None
                                    whiteboard_image_data = None
                                    
                                    # Re-enable user audio accumulation for the next turn
                                    should_accumulate_user_audio = True
                                    logger.info("Re-enabling user audio accumulation for next turn")
                        except websockets.exceptions.ConnectionClosedOK:
                            logger.info("Client connection closed normally (receive)")
                            break
                        except Exception as e:
                            logger.error(f"Error receiving from Gemini: {e}")
                            break

                except Exception as e:
                    logger.error(f"Error receiving from Gemini: {e}")
                finally:
                    logger.info("Gemini connection closed (receive)")

            # Start send and receive tasks
            send_task = asyncio.create_task(send_to_gemini())
            receive_task = asyncio.create_task(receive_from_gemini())
            await asyncio.gather(send_task, receive_task)

    except Exception as e:
        logger.error(f"Error in Gemini session: {e}")
    finally:
        logger.info("Gemini session closed.")

def transcribe_audio(audio_data):
    """Transcribes audio using Gemini 1.5 Flash."""
    # Ensure API key is configured before using the model
    if not GEMINI_API_KEY:
        logger.error("Transcription failed: GOOGLE_API_KEY not set.")
        return "Transcription failed due to missing API key."
    try:
        # Make sure we have valid audio data
        if not audio_data:
            return "No audio data received."
        
        # Check if the input is already a base64 string
        if isinstance(audio_data, str):
            wav_audio_base64 = audio_data
        else:
            # This is binary data that needs conversion
            return "Invalid audio data format."
            
        # Create a client specific for transcription - uses globally configured key
        transcription_client = generative.GenerativeModel(model_name="gemini-2.0-flash-lite")
        
        prompt = """Generate a transcript of the speech. 
        Please do not include any other text in the response. 
        If you cannot hear the speech, please only say '<Not recognizable>'."""
        
        response = transcription_client.generate_content(
            [
                prompt,
                {
                    "mime_type": "audio/wav", 
                    "data": base64.b64decode(wav_audio_base64),
                }
            ]
        )
            
        return response.text

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return "Transcription failed."

def convert_pcm_to_wav(pcm_data, is_user_input=False):
    """Converts PCM audio to base64 encoded WAV."""
    try:
        # Ensure we're working with binary data
        if not isinstance(pcm_data, bytes):
            logger.error(f"PCM data is not bytes, it's {type(pcm_data)}")
            try:
                # Try to convert to bytes if it's not already
                if isinstance(pcm_data, str):
                    # If it's a base64 string, decode it
                    pcm_data = base64.b64decode(pcm_data)
            except Exception as e:
                logger.error(f"Error converting PCM data to bytes: {e}")
                return None

        # Create a WAV in memory
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)  # mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(16000 if is_user_input else 24000)  # 16kHz for user input, 24kHz for assistant
            wav_file.writeframes(pcm_data)
        
        # Reset buffer position
        wav_buffer.seek(0)
        
        # Convert to base64
        wav_base64 = base64.b64encode(wav_buffer.getvalue()).decode('utf-8')
        return wav_base64
        
    except Exception as e:
        logger.error(f"Error converting PCM to WAV: {e}")
        return None
    
async def main() -> None:
    # Ensure API key is available before starting server
    if not GEMINI_API_KEY:
        logger.error("Cannot start server: GOOGLE_API_KEY is not set.")
        return

    # Use explicit IPv4 address and handle deprecation
    server = await websockets.server.serve(
        gemini_session_handler,
        host="0.0.0.0",  # Explicitly use IPv4 localhost
        port=9084,
        compression=None  # Disable compression to avoid deprecation warning
    )
    
    logger.info("Running websocket server on 0.0.0.0:9084...")
    logger.info("Long memory tutoring assistant ready to help")
    await asyncio.Future()  # Keep the server running indefinitely

if __name__ == "__main__":
    asyncio.run(main())