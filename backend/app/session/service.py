# Business logic for session management
import uuid
from .models import SessionStartRequest, Session
from ..gemini.client import GeminiSessionController # Import GeminiSessionController
from ..persona.service import persona_service # Import persona service

# In-memory storage for active sessions (replace with DB later)
active_sessions = {}

class SessionService:

    def __init__(self):
        # self.persona_service = PersonaService() # Instantiate persona service
        print("SessionService initialized")

    async def start_session(self, request: SessionStartRequest) -> Session:
        session_id = str(uuid.uuid4())
        print(f"Starting session {session_id} for topic '{request.topic}' with persona '{request.persona_type}'")

        # 1. Configure Persona (using PersonaService)
        persona_config = persona_service.get_config(request.persona_type)

        # 2. Instantiate Gemini Session Controller
        gemini_controller = GeminiSessionController(session_id, persona_config)
        await gemini_controller.connect() # Connect to Gemini API

        # 3. Create and store session details
        new_session = Session(
            session_id=session_id,
            topic=request.topic,
            persona_type=request.persona_type,
            is_active=True
        )
        active_sessions[session_id] = {"session": new_session, "controller": gemini_controller}

        print(f"Session {session_id} started successfully.")
        return new_session

    async def end_session(self, session_id: str):
        print(f"Attempting to end session {session_id}")
        session_data = active_sessions.get(session_id)
        if session_data and session_data["session"].is_active:
            controller = session_data.get("controller")
            if controller:
                await controller.close() # Close Gemini WebSocket
                print(f"Gemini connection closed for session {session_id}")

            session_data["session"].is_active = False
            # Optionally remove from active_sessions or mark as inactive in DB
            # del active_sessions[session_id]
            print(f"Session {session_id} ended.")
            return {"message": f"Session {session_id} ended successfully."}
        elif session_data:
            print(f"Session {session_id} was already inactive.")
            return {"message": f"Session {session_id} was already inactive."}
        else:
            print(f"Session {session_id} not found.")
            raise ValueError(f"Session {session_id} not found") # Or use HTTPException

    def get_session(self, session_id: str) -> Session:
        session_data = active_sessions.get(session_id)
        return session_data["session"] if session_data else None
    
    def get_gemini_controller(self, session_id: str) -> GeminiSessionController:
        session_data = active_sessions.get(session_id)
        return session_data["controller"] if session_data else None

    async def get_lesson_report(self, session_id: str):
        session = self.get_session(session_id)
        if not session:
             raise ValueError(f"Session {session_id} not found") # Or use HTTPException

        print(f"Generating lesson report for session {session_id}")
        # Logic to retrieve history from the session/controller and generate a report
        controller = active_sessions.get(session_id, {}).get("controller")
        if controller:
            history = await controller.get_history() # Get conversation history
            report = f"Report for session {session_id} on topic '{session.topic}'. History: {history}"
        else:
            report = f"Report for session {session_id} on topic '{session.topic}'. (History retrieval not implemented)"
        return {"report": report}

# Instantiate the service (could use FastAPI dependency injection later)
session_service = SessionService() 