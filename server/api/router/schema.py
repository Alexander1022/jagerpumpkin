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