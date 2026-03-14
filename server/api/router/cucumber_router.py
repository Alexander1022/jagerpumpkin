from fastapi import APIRouter, HTTPException, Depends

from server.api.router.feed_router import get_user_id
from server.api.router.schema import EnqueueMessageRequest, EnqueueMessageResponse
from server.db import session, User, Message_Queue

router = APIRouter(prefix="/cucumber", tags=["cucumber"])

@router.post("/{user_id}", response_model=EnqueueMessageResponse)
def enqueue_message(user_id: int, req: EnqueueMessageRequest, sender_id: int = Depends(get_user_id)):
    recipient = session.query(User).filter_by(id=user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    msg = Message_Queue(
        sender_id=sender_id,
        recipient_id=user_id,
        content=req.content,
    )

    session.add(msg)
    session.commit()
    session.refresh(msg)

    return EnqueueMessageResponse(
        message_id=msg.id,
        sender_id=sender_id,
        recipient_id=user_id
    )
