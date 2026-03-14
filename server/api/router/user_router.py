from fastapi import APIRouter, HTTPException, Query
from server.db import User
from server.db import session
from server.api.router.schema import UserProfileResponse

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