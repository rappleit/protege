#!/usr/bin/env python
"""
Shortcut script to run the backend server.
"""
import uvicorn

if __name__ == "__main__":
    print("Starting Protege Backend...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 