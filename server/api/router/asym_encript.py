from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import base64
import binascii
from pathlib import Path

from typing import Annotated

from server.api.router.auth_router import get_user_id
from server.db import session, User

class KeyExchangeRequest(BaseModel):
    client_id: str
    encrypted_key: str

def generate_keys():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    return private_key, public_key

def load_or_create_keys():
    api_dir = Path(__file__).resolve().parents[1]
    private_key_path = api_dir / "private_key.pem"
    public_key_path = api_dir / "public_key.pem"

    if private_key_path.exists() and public_key_path.exists():
        private_key = serialization.load_pem_private_key(
            private_key_path.read_bytes(),
            password=None,
        )
        public_key = serialization.load_pem_public_key(public_key_path.read_bytes())
        return private_key, public_key

    private_key, public_key = generate_keys()
    private_key_path.write_bytes(
        private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    public_key_path.write_bytes(
        public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )

    return private_key, public_key

keys = load_or_create_keys()
session_keys = {}

router = APIRouter(prefix="/crypt", tags=["crypt"])

@router.get("/public_key")
def get_public_key():
    public_key_pem = keys[1].public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return public_key_pem.decode()

@router.get("/public_key/{user_id}")
def get_user_public_key(user_id: int):
    user = session.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.public_key:
        raise HTTPException(status_code=404, detail="Public key not found")

    return user.public_key

@router.post("/exchange_key")
def exchange_key(data: KeyExchangeRequest, user: Annotated[str, Depends(get_user_id)]):
    try:
        encrypted_key_bytes = base64.b64decode(data.encrypted_key, validate=True)
        symmetric_key = keys[0].decrypt(
            encrypted_key_bytes,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid encrypted key") from exc

    session_keys[user] = symmetric_key
    return {"message": "Symmetric key received and decrypted successfully"}