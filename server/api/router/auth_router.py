from fastapi import APIRouter, HTTPException
import bcrypt
import hashlib

from server.api.router.schema import SignupRequest, LoginRequest
from server.db import session, User

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    digest = hashlib.sha256(password.encode()).digest()
    return bcrypt.hashpw(digest, bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    digest = hashlib.sha256(password.encode()).digest()
    return bcrypt.checkpw(digest, hashed.encode())


@router.post("/signup")
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

    return {"message": "user created"}


@router.post("/login")
def login(req: LoginRequest):
    user = session.query(User).filter_by(username=req.username).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"message": "login success", "user_id": user.id}
