#!/usr/bin/env python
"""
Run script for Pashu Drishti FastAPI Backend.

Usage:
    python run_backend.py
"""

import sys
import uvicorn

if __name__ == "__main__":
    print("=" * 65)
    print("  Starting Pashu Drishti FastAPI Backend (Port 8000)")
    print("  Architecture: React -> FastAPI -> Custom MobileNetV2 Model")
    print("=" * 65)
    try:
        uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
    except KeyboardInterrupt:
        print("\nFastAPI server shut down cleanly.")
        sys.exit(0)
