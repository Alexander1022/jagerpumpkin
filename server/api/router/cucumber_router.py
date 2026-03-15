from fastapi import APIRouter, HTTPException, Depends
import base64
import binascii
import json
from sqlalchemy import or_
from sqlalchemy.orm import aliased

from server.api.router.websocket_router import manager

from server.api.router.feed_router import get_user_id
from server.api.router.schema import (
    DequeueMessageResponse,
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
    received_message_ids: list[int] = []

    for row, sender_username, recipient_username in records:
        try:
            payload = json.loads((row.content or b"{}").decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            payload = {}

        if row.recipient_id == user_id:
            received_message_ids.append(row.id)

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

    if received_message_ids:
        session.query(Message_Queue).filter(
            Message_Queue.id.in_(received_message_ids)
        ).delete(synchronize_session=False)
        session.commit()

    return MessageListResponse(messages=messages)

@router.post("/{recipient_id}", response_model=EnqueueMessageResponse)
async def enqueue_message(recipient_id: int, req: EnqueueMessageRequest, sender_id: int = Depends(get_user_id)):
    recipient = session.query(User).filter_by(id=recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    try:
        base64.b64decode(req.encrypted_message, validate=True)
        base64.b64decode(req.encrypted_key, validate=True)
        base64.b64decode(req.iv, validate=True)
    except binascii.Error:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")
    
    content_payload = json.dumps({
        "encrypted_message": req.encrypted_message,
        "encrypted_key": req.encrypted_key,
        "iv": req.iv
    }).encode("utf-8")

    msg = Message_Queue(
        sender_id=sender_id,
        recipient_id=recipient_id,
        content=content_payload
    )

    session.add(msg)
    session.commit()
    session.refresh(msg)

    notification = json.dumps({
        "type": "NEW_MESSAGE",
        "sender_id": sender_id
    })
    await manager.send_personal_message(notification, recipient_id)

    return EnqueueMessageResponse(
        message_id=msg.id,
        sender_id=sender_id,
        recipient_id=recipient_id,
        created_at=msg.created_at,
    )

@router.get("/{sender_id}", response_model=DequeueMessageResponse)
def dequeue_message(sender_id: int, recipient_id: int = Depends(get_user_id)):
    msg = session.query(Message_Queue).filter(
        Message_Queue.sender_id == sender_id,
        Message_Queue.recipient_id == recipient_id
    ).order_by(Message_Queue.created_at).first()

    if not msg:
        raise HTTPException(status_code=404, detail="No message found")

    response = DequeueMessageResponse(
        message_id=msg.id,
        content=msg.content,
        created_at=msg.created_at
    )

    session.delete(msg)
    session.commit()

    return response