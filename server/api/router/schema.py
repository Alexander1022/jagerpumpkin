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
    encrypted_message: str
    encrypted_key: str
    iv: str

class EnqueueMessageResponse(BaseModel):
    message_id: int
    sender_id: int
    recipient_id: int


class MessageItemResponse(BaseModel):
    message_id: int
    sender_id: int
    sender_username: str
    recipient_id: int
    recipient_username: str
    encrypted_message: str
    encrypted_key: str
    iv: str
    created_at: datetime


class MessageListResponse(BaseModel):
    messages: list[MessageItemResponse]


class DequeueMessageResponse(BaseModel):
    message_id: int
    content: bytes
    created_at: datetime
