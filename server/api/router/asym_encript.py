from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from fastapi import APIRouter, Depends
from pydantic import BaseModel
import base64

from typing import Annotated

from server.api import router
from server.api.router.auth_router import get_current_user

class KeyExchangeRequest(BaseModel):
    client_id: str
    encrypted_key: str

def generate_keys():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    return private_key, public_key

keys = generate_keys()
session_keys = {}

router = APIRouter(prefix="/crypt", tags=["crypt"])

@router.get("/public_key")
def get_public_key():
    public_key_pem = keys[1].public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return public_key_pem.decode()

@router.post("/exchange_key")
def exchange_key(data: KeyExchangeRequest, user: Annotated[dict, Depends(get_current_user)]):
    encrypted_key_bytes = base64.b64decode(data.encrypted_key)
    symmetric_key = keys[0].decrypt(
        encrypted_key_bytes,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    session_keys[user["user_id"]] = symmetric_key
    return {"message": "Symmetric key received and decrypted successfully"}