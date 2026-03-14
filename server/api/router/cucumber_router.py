from fastapi import APIRouter, HTTPException, Depends

from server.api.router.feed_router import get_user_id
from server.api.router.schema import EnqueueMessageRequest, EnqueueMessageResponse, DequeueMessageResponse
from server.db import session, User, Message_Queue

router = APIRouter(prefix="/cucumber", tags=["cucumber"])

@router.post("/{recipient_id}", response_model=EnqueueMessageResponse)
def enqueue_message(recipient_id: int, req: EnqueueMessageRequest, sender_id: int = Depends(get_user_id)):
    recipient = session.query(User).filter_by(id=recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    msg = Message_Queue(
        sender_id=sender_id,
        recipient_id=recipient_id,
        content=req.content,
    )

    session.add(msg)
    session.commit()
    session.refresh(msg)

    return EnqueueMessageResponse(
        message_id=msg.id,
        sender_id=sender_id,
        recipient_id=recipient_id
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