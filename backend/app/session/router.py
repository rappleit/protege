from fastapi import APIRouter, HTTPException
from .service import session_service
from .models import SessionStartRequest, Session

router = APIRouter()

@router.post("/start-session", response_model=Session)
async def start_session_endpoint(request: SessionStartRequest):
    """Starts a new learning session."""
    try:
        session = await session_service.start_session(request)
        return session
    except Exception as e:
        # Log the exception details
        print(f"Error starting session: {e}")
        raise HTTPException(status_code=500, detail="Failed to start session")

@router.post("/end-session/{session_id}")
async def end_session_endpoint(session_id: str):
    """Ends an active learning session."""
    try:
        result = await session_service.end_session(session_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Log the exception details
        print(f"Error ending session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to end session")

@router.get("/get-lesson-report/{session_id}")
async def get_lesson_report_endpoint(session_id: str):
    """Retrieves the lesson report for a given session."""
    try:
        report = await session_service.get_lesson_report(session_id)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Log the exception details
        print(f"Error getting report for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve lesson report") 