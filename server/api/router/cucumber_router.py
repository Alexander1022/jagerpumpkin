from fastapi import APIRouter, HTTPException, Depends
import base64
import binascii
import json
from sqlalchemy import or_
from sqlalchemy.orm import aliased

from server.api.router.feed_router import get_user_id
from server.api.router.schema import (
    EnqueueMessageRequest,
    EnqueueMessageResponse,
    MessageItemResponse,
    MessageListResponse,
)
from server.db import session, User, Message_Queue

router = APIRouter(prefix="/cucumber", tags=["cucumber"])


@router.get("/messages", response_model=MessageListResponse)
def get_messages(user_id: int = Depends(get_user_id)):
    sender_user = aliased(User)
    recipient_user = aliased(User)

    records = (
        session.query(Message_Queue, sender_user.username, recipient_user.username)
        .join(sender_user, sender_user.id == Message_Queue.sender_id)
        .join(recipient_user, recipient_user.id == Message_Queue.recipient_id)
        .filter(
            or_(
                Message_Queue.sender_id == user_id,
                Message_Queue.recipient_id == user_id,
            )
        )
        .order_by(Message_Queue.created_at.asc())
        .all()
    )

    messages: list[MessageItemResponse] = []

    for row, sender_username, recipient_username in records:
        try:
            payload = json.loads((row.content or b"{}").decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            payload = {}

        messages.append(
            MessageItemResponse(
                message_id=row.id,
                sender_id=row.sender_id,
                sender_username=sender_username,
                recipient_id=row.recipient_id,
                recipient_username=recipient_username,
                encrypted_message=str(payload.get("encrypted_message", "")),
                encrypted_key=str(payload.get("encrypted_key", "")),
                iv=str(payload.get("iv", "")),
                created_at=row.created_at,
            )
        )

    return MessageListResponse(messages=messages)

@router.post("/{user_id}", response_model=EnqueueMessageResponse)
def enqueue_message(user_id: int, req: EnqueueMessageRequest, sender_id: int = Depends(get_user_id)):
    recipient = session.query(User).filter_by(id=user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    try:
        base64.b64decode(req.encrypted_message, validate=True)
        base64.b64decode(req.encrypted_key, validate=True)
        base64.b64decode(req.iv, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid encrypted payload") from exc

    content_payload = json.dumps(
        {
            "encrypted_message": req.encrypted_message,
            "encrypted_key": req.encrypted_key,
            "iv": req.iv,
        }
    ).encode("utf-8")

    msg = Message_Queue(
        sender_id=sender_id,
        recipient_id=user_id,
        content=content_payload,
    )

    session.add(msg)
    session.commit()
    session.refresh(msg)

    return EnqueueMessageResponse(
        message_id=msg.id,
        sender_id=sender_id,
        recipient_id=user_id
    )
