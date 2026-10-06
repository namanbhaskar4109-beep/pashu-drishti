import re
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any

from backend.database import db, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    confirmPassword: str
    role: Optional[str] = "vet"


class LoginRequest(BaseModel):
    email: str
    password: str
    rememberMe: Optional[bool] = True


def sanitize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    safe = dict(user)
    safe.pop("passwordHash", None)
    return safe


def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header[7:].strip()
    session = db.get_session(token)
    if not session:
        return None
    return db.find_user_by_id(session["userId"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    name = body.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Full name is required (at least 2 characters).")

    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(email_regex, body.email.strip()):
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    if body.password != body.confirmPassword:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    existing = db.find_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email address already exists.")

    password_hash = hash_password(body.password)
    new_user = db.create_user(
        name=name,
        email=body.email,
        password_hash=password_hash,
        role=body.role or "vet"
    )

    session = db.create_session(new_user["id"], remember_me=True)

    return {
        "message": "Account successfully registered.",
        "user": sanitize_user(new_user),
        "token": session["token"]
    }


@router.post("/login")
async def login(body: LoginRequest):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    user = db.find_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(body.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    session = db.create_session(user["id"], remember_me=body.rememberMe is not False)

    return {
        "message": "Authentication successful.",
        "user": sanitize_user(user),
        "token": session["token"]
    }


@router.post("/logout")
async def logout(request: Request):
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        db.delete_session(token)
    return {"message": "Logged out successfully."}


@router.get("/me")
async def get_me(request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized. Invalid or expired session.")
    return {"user": sanitize_user(user)}
