from pydantic import BaseModel

class SignupRequest(BaseModel):
    username: str
    password: str
    public_key: str


class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    user_id: int
    username: str
    access_token: str
    token_type: str = "bearer"


class SignupResponse(BaseModel):
    user_id: int
    username: str
    created_at: str