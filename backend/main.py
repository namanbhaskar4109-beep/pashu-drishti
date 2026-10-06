from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import db
from backend.routers import auth, analyses, upload, predict, model_status

ROOT_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = ROOT_DIR / "public" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Pashu Drishti - Animal Disease Detection Backend",
    description="FastAPI backend powered by MongoDB Atlas and custom MobileNetV2 image classification.",
    version="2.0.0"
)

# Enable CORS for React frontend (development and production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory so /uploads/filename serves images
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include API Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(analyses.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(predict.router, prefix="/api")
app.include_router(model_status.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """
    Test MongoDB Atlas connection on FastAPI server startup.
    Prints 'MongoDB Atlas connected successfully' or error details.
    """
    print("\n[Server Startup] Testing MongoDB Atlas connection...")
    db.connect()


@app.get("/")
async def root():
    return {
        "service": "Pashu Drishti Animal Disease Detection API",
        "version": "2.0.0",
        "engine": "MobileNetV2 Image Classifier",
        "database": "MongoDB Atlas",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/api/health")
@app.get("/health")
async def health_check():
    """
    Health/status endpoint that confirms whether MongoDB Atlas is connected.
    """
    status = db.get_status()
    is_connected = status.get("connected", False)
    return {
        "status": "healthy" if is_connected else "degraded",
        "mongodb_connected": is_connected,
        "database": "MongoDB Atlas",
        "database_name": db.db_name,
        "engine": "MobileNetV2",
        "collections": ["users", "analyses"],
        "details": status
    }
