import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs import Voice, VoiceSettings, play

# Load environment variables from .env file
load_dotenv()

# Attempt to load the API key from environment variables
# Use ELEVENLABS_API_KEY consistent with user example
api_key = os.environ.get("ELEVENLABS_API_KEY")
if not api_key:
    raise ValueError("ELEVENLABS_API_KEY environment variable not set.")

# Initialize ElevenLabs client
client = ElevenLabs(api_key=api_key)

# Import personas from the local file
# Assuming protege_personas.py is in the same directory
try:
    from backend.app.persona.protege_personas import PERSONAS
except ImportError:
    raise ImportError("Could not import PERSONAS from protege_personas.py. Make sure the file exists and is in the correct path.")

# --- Generated Voice ID Cache ---
# This dictionary will store the voice IDs generated during this script run.
# For persistence across runs, this would need to be saved/loaded from a file.
GENERATED_VOICE_IDS = {}

# Sample text for generating voice previews
# Needs to be at least 100 characters for create_previews
SAMPLE_PREVIEW_TEXT = (
    "This is a sample text used to generate a voice preview based on a provided description. "
    "It needs to be sufficiently long to capture the nuances and characteristics intended for the voice. "
    "Speaking clearly and naturally helps the system create the best possible audio representation."
)

# --- Audio Generation Function ---
def generate_persona_audio(persona_name: str, text_to_speak: str) -> bytes:
    """Generates audio for a given persona.

    Checks if a voice has already been generated and saved for this persona
    in the current session. If not, it generates previews based on the
    persona's description, saves the first preview to the Voice Lab,
    and stores the new voice ID. Then, generates the requested audio.

    Args:
        persona_name: The key of the persona in the PERSONAS dictionary (e.g., 'kai').
        text_to_speak: The text the persona should speak.

    Returns:
        The generated audio data as bytes.

    Raises:
        ValueError: If the persona_name is invalid or voice generation fails.
    """
    if persona_name not in PERSONAS:
        raise ValueError(f"Unknown persona name: {persona_name}")

    voice_id_to_use = GENERATED_VOICE_IDS.get(persona_name)

    if not voice_id_to_use:
        print(f"No voice ID found for '{persona_name}'. Generating and saving voice...")
        persona_info = PERSONAS[persona_name]
        description = persona_info.get("description")
        if not description:
            raise ValueError(f"Persona '{persona_name}' is missing a 'description' field.")

        try:
            # 1. Create previews based on description
            print(f"Generating previews for '{persona_name}'...")
            previews = client.text_to_voice.create_previews(
                voice_description=description,
                text=SAMPLE_PREVIEW_TEXT
            )

            if not previews.previews:
                raise RuntimeError(f"Failed to generate any previews for '{persona_name}'.")

            # 2. Select the first preview
            selected_preview_id = previews.previews[0].generated_voice_id
            print(f"Selected preview ID: {selected_preview_id}")

            # 3. Save the selected preview to Voice Lab
            print(f"Saving preview as new voice '{persona_name}' in Voice Lab...")
            # Use persona_name as the voice_name for easy identification
            saved_voice = client.text_to_voice.create_voice_from_preview(
                voice_name=persona_name, # Use persona name for the saved voice
                voice_description=description,
                generated_voice_id=selected_preview_id
            )

            voice_id_to_use = saved_voice.voice_id
            GENERATED_VOICE_IDS[persona_name] = voice_id_to_use
            print(f"Saved voice '{persona_name}' with ID: {voice_id_to_use}")

        except Exception as e:
            raise RuntimeError(f"Failed during voice generation/saving for '{persona_name}': {e}")

    # 4. Generate the actual audio using the determined voice ID
    print(f"Generating audio for '{persona_name}' (Voice ID: {voice_id_to_use}) with text: '{text_to_speak[:50]}...' ")
    try:
        audio_stream = client.generate(
            text=text_to_speak,
            voice=Voice(voice_id=voice_id_to_use),
            # You might want to configure model and settings here too
            model="eleven_multilingual_v2",
            voice_settings=VoiceSettings(stability=0.7, similarity_boost=0.75)
        )
        # Consume the iterator/generator yielding byte chunks
        audio_bytes = b"".join(audio_stream)

        if not isinstance(audio_bytes, bytes):
             # The generate function usually yields bytes chunks, handle this if needed
             # For simplicity here, assuming it returns a single bytes object
             # If it yields, you'd collect the chunks: audio_bytes = b"".join(audio)
             # Let's refine this if the API actually yields chunks.
             # Assuming direct bytes return for now based on simple usage patterns.
             # A quick check of elevenlabs v1.0 client shows generate returns bytes.
             # Update: It returns an iterator, so we join the chunks.
             # raise TypeError("Expected audio data as bytes.")
             raise TypeError("Failed to collect audio data as bytes from the stream.")

        return audio_bytes
    except Exception as e:
        raise RuntimeError(f"Failed to generate audio for '{persona_name}' using voice ID {voice_id_to_use}: {e}")

# --- Example Usage ---
if __name__ == "__main__":
    print("Running example usage...")
    try:
        # # Example 1: Generate audio for Kai
        # kai_audio = generate_persona_audio("kai", "Wow! Why is the sky blue? That's so cool!")
        # print(f"Generated {len(kai_audio)} bytes for Kai. Playing...")
        # play(kai_audio)

        # Example 2: Generate audio for Erik (will generate/save voice first)
        erik_audio = generate_persona_audio("erik", "By Odin! A warrior must understand this strategy!")
        print(f"Generated {len(erik_audio)} bytes for Erik. Playing...")
        play(erik_audio)

        # # Example 3: Generate for Kai again (should use cached voice ID)
        # kai_audio_2 = generate_persona_audio("kai", "Can we learn more?")
        # print(f"Generated {len(kai_audio_2)} bytes for Kai (second time). Playing...")
        # play(kai_audio_2)

    except (ValueError, RuntimeError, ImportError) as e:
        print(f"\nError: {e}")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")

# Remove the previous print statement and voice listing example
# print("ElevenLabs client initialized and personas loaded.")
# # Example: List available voices (optional, for user reference)
# # try:
# #     print("Fetching available voices...")
# #     voices = client.voices.get_all()
# #     print(voices)
# # except Exception as e:
# #     print(f"Could not fetch voices: {e}")
