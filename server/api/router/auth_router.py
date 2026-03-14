from fastapi import APIRouter, HTTPException
import bcrypt
import hashlib

from server.api.router.schema import SignupRequest, LoginRequest, SignupResponse, AuthResponse
from server.db import session, User

import jwt
from datetime import datetime, timedelta

import os
SECRET_KEY = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60


def create_access_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    digest = hashlib.sha256(password.encode()).digest()
    return bcrypt.hashpw(digest, bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    digest = hashlib.sha256(password.encode()).digest()
    return bcrypt.checkpw(digest, hashed.encode())


@router.post("/signup", response_model=SignupResponse)
def signup(req: SignupRequest):
    existing = session.query(User).filter_by(username=req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed = hash_password(req.password)

    user = User(
        username=req.username,
        password=hashed,
        public_key=req.public_key
    )

    session.add(user)
    session.commit()

    return SignupResponse(
        user_id=user.id,
        username=user.username,
        created_at=user.created_at.isoformat()
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user = session.query(User).filter_by(username=req.username).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id, user.username)

    return AuthResponse(
        user_id=user.id,
        username=user.username,
        access_token=token
    )