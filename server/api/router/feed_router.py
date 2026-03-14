import jwt
from fastapi import APIRouter, Header, HTTPException, Depends

from server.api.router.auth_router import SECRET_KEY, ALGORITHM, get_user_id
from server.api.router.schema import FeedResponse, FeedUser
from server.db import session, User, Message_Queue

router = APIRouter(prefix="/feed", tags=["feed"])

@router.get("", response_model=FeedResponse)
def get_feed(user_id: int = Depends(get_user_id)):

    messages = (
        session.query(User)
        .join(Message_Queue, Message_Queue.sender_id == User.id)
        .filter(Message_Queue.recipient_id == user_id)
        .all()
    )

    users = [ FeedUser(username=u.username,created_at=u.created_at) for u in messages]

    return FeedResponse(users=users)