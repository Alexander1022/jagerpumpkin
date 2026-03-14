from datetime import datetime
from pydantic import BaseModel

class SignupRequest(BaseModel):
    username: str
    password: str
    public_key: str


class LoginRequest(BaseModel):
    username: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class AuthResponse(BaseModel):
    user_id: int
    username: str
    tokens:TokenPair


class SignupResponse(BaseModel):
    user_id: int
    username: str
    created_at: str

class MeResponse(BaseModel):
    username: str

class FeedUser(BaseModel):
    username: str
    created_at: datetime

class FeedResponse(BaseModel):
    users: list[FeedUser]

class EnqueueMessageRequest(BaseModel):
    content: bytes

class EnqueueMessageResponse(BaseModel):
    message_id: int
    sender_id: int
    recipient_id: int

class DequeueMessageResponse(BaseModel):
    message_id: int
    content: bytes
    created_at: datetime