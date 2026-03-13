from pydantic import BaseModel

class SignupRequest(BaseModel):
    username: str
    password: str
    public_key: str


class LoginRequest(BaseModel):
    username: str
    password: str