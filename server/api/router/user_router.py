from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from server.api.router.auth_router import get_user_id
from server.api.router.websocket_router import manager
from server.db import User, ConnectionDB
from server.db import session
from server.api.router.schema import UserProfileResponse, UserStatus, UsersStatusResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}", response_model=UserProfileResponse)
def get_user_profile(user_id: int):
    user = session.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfileResponse(
        user_id=user.id,
        username=user.username,
        created_at=user.created_at
    )

@router.get("/status", response_model=UsersStatusResponse)
def get_connected_users_status(user_id: int = Depends(get_user_id)) -> UsersStatusResponse:
    rows = (
        session.query(ConnectionDB.friend_id)
        .filter(ConnectionDB.user_id == user_id)
        .all()
    )

    friends_id = [r.friend_id for r in rows]
    result : dict[int, UserStatus] = {}
    now = datetime.utcnow()
    for friend_id in friends_id:
        if manager.is_user_connected(friend_id):
            result[friend_id] = UserStatus(user_id=friend_id, timestamp=now)

    return UsersStatusResponse(users_status=result)

