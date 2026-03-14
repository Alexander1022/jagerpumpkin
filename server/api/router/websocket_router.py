from fastapi import APIRouter, Websocket, Depends, WebsocketDisconnect
from typing import Annotated

from server.api.router.auth_router import get_user_id

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, Websocket] = {}
        self.room_connections: dict[str, set[int]] = {}

    async def connect(self, user_id: int, websocket: Websocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    def is_user_connected(self, user_id: int) -> bool:
        return user_id in self.active_connections

    async def send_personal_message(self, message: str, user_id: int):
        Websocket = self.active_connections.get(user_id)
        if Websocket:
            await Websocket.send_text(message)


router = APIRouter(prefix="/websocket", tags=["websocket"])

manager = ConnectionManager()

@router.websocket("/{user_id}")
async def websocket_endpoint(websocket: Websocket, user_id: Annotated[int, Depends(get_user_id)]):
    await manager.connect(user_id, websocket)
    manager.room_connections.setdefault("global", set()).add(user_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message(data, user_id)
    except WebsocketDisconnect:
        manager.disconnect(user_id)
        manager.room_connections["global"].discard(user_id)
