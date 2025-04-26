from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Protege Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from .session.router import router as session_router
from .websocket.router import router as websocket_router

# Include routers
app.include_router(session_router, prefix="/api/v1")
app.include_router(websocket_router, prefix="/api/v1") # WebSocket endpoints and token endpoint

@app.get("/")
async def root():
    return {"message": "Welcome to the Protege Backend"}

if __name__ == "__main__":
    # For debugging purposes - use uvicorn command line for production
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

# Add other core configurations or middleware here if needed 