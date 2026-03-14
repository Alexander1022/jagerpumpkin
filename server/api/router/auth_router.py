from fastapi import APIRouter, HTTPException
import bcrypt
import hashlib

from server.api.router.schema import SignupRequest, LoginRequest, SignupResponse, AuthResponse, TokenPair, \
    RefreshRequest
from server.db import session, User

import jwt
from datetime import datetime, timedelta

import os
SECRET_KEY = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
ACCESS_TOKEN_MIN = 1
REFRESH_TOKEN_DAYS = 1


def create_access_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_MIN),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_DAYS)
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

    access = create_access_token(user.id, user.username)
    refresh = create_refresh_token(user.id)

    return AuthResponse(
        user_id=user.id,
        username=user.username,
        tokens=TokenPair(access_token=access, refresh_token=refresh)
    )
@router.post("/refresh", response_model=TokenPair)
def refresh_token(req: RefreshRequest):

    try:
        payload = jwt.decode(req.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload["type"] != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")

        user_id = int(payload["sub"])

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")

    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = session.query(User).filter_by(id=user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access = create_access_token(user.id, user.username)

    return TokenPair(
        access_token=new_access,
        refresh_token=req.refresh_token
    )
