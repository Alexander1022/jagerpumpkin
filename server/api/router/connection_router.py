from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from datetime import datetime
import json

from server.api.router.auth_router import get_user_id
from server.api.router.websocket_router import manager
from server.api.router.schema import ConnectionsResponse, Connection, AddConnectionRequest, ConnectionCodeResponse
from server.db import session, User, ConnectionDB
router = APIRouter(prefix="/connections", tags=["connections"])

@router.get("/code", response_model=ConnectionCodeResponse)
def get_connection_code(user_id: int = Depends(get_user_id)):
    user = session.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ConnectionCodeResponse(connection_code=user.connection_code)

@router.get("", response_model=ConnectionsResponse)
def list_connections(user_id: int = Depends(get_user_id)):
    rows = (
        session.query(ConnectionDB, User)
        .join(User, User.id == ConnectionDB.friend_id)
        .filter(ConnectionDB.user_id == user_id)
        .all()
    )

    result = [
        Connection(
            friend_id=u.id,
            friend_username=u.username,
            created_at=c.created_at
        )
        for c, u in rows
    ]

    return ConnectionsResponse(connections=result)

@router.post("/add")
async def add_connection(req: AddConnectionRequest, user_id: int = Depends(get_user_id)):
    user = session.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    friend = session.query(User).filter_by(connection_code=req.connection_code).first()

    if not friend:
        raise HTTPException(status_code=404, detail="User with this code not found")

    if friend.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot connect to yourself")

    existing = (
        session.query(ConnectionDB)
        .filter(
            ConnectionDB.user_id == user_id,
            ConnectionDB.friend_id == friend.id
        )
        .first()
    )

    if existing:
        raise HTTPException(status_code=400, detail="Already connected")

    c1 = ConnectionDB(user_id=user_id, friend_id=friend.id)
    c2 = ConnectionDB(user_id=friend.id, friend_id=user_id)

    session.add(c1)
    session.add(c2)
    session.commit()
    session.refresh(c1)

    created_at = c1.created_at.isoformat()

    notification_for_user = json.dumps(
        {
            "type": "CONNECTIONS_UPDATED",
            "action": "added",
            "friend_id": friend.id,
            "friend_username": friend.username,
            "connected_at": created_at,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    )
    notification_for_friend = json.dumps(
        {
            "type": "CONNECTIONS_UPDATED",
            "action": "added",
            "friend_id": user.id,
            "friend_username": user.username,
            "connected_at": created_at,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    )

    await manager.send_personal_message(notification_for_user, user_id)
    await manager.send_personal_message(notification_for_friend, friend.id)

    return {"message": "connection created"}

@router.delete("/{friend_id}")
async def remove_connection(
    friend_id: int,
    user_id: int = Depends(get_user_id)
):

    rows = (
        session.query(ConnectionDB)
        .filter(
            or_(
                (ConnectionDB.user_id == user_id) &
                (ConnectionDB.friend_id == friend_id),

                (ConnectionDB.user_id == friend_id) &
                (ConnectionDB.friend_id == user_id)
            )
        )
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail="Connection not found")

    for r in rows:
        session.delete(r)

    session.commit()

    notification_for_user = json.dumps(
        {
            "type": "CONNECTIONS_UPDATED",
            "action": "removed",
            "friend_id": friend_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    )
    notification_for_friend = json.dumps(
        {
            "type": "CONNECTIONS_UPDATED",
            "action": "removed",
            "friend_id": user_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    )
    await manager.send_personal_message(notification_for_user, user_id)
    await manager.send_personal_message(notification_for_friend, friend_id)

    return {"message": "connection removed"}