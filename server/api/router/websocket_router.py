from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import jwt

from server.api.router.auth_router import ALGORITHM, SECRET_KEY

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}
        self.room_connections: dict[str, set[int]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

        for room_users in self.room_connections.values():
            room_users.discard(user_id)

    def is_user_connected(self, user_id: int) -> bool:
        return user_id in self.active_connections

    async def send_personal_message(self, message: str, user_id: int):
        websocket = self.active_connections.get(user_id)
        if not websocket:
            return

        try:
            await websocket.send_text(message)
        except Exception:
            self.disconnect(user_id)


router = APIRouter(prefix="/websocket", tags=["websocket"])

manager = ConnectionManager()


async def authenticate_websocket_user(websocket: WebSocket, path_user_id: int) -> int | None:
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=1008)
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "access":
            await websocket.close(code=1008)
            return None

        token_user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        await websocket.close(code=1008)
        return None

    if token_user_id != path_user_id:
        await websocket.close(code=1008)
        return None

    return token_user_id


@router.websocket("/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    authenticated_user_id = await authenticate_websocket_user(websocket, user_id)
    if authenticated_user_id is None:
        return

    user_id = authenticated_user_id
    await manager.connect(user_id, websocket)
    manager.room_connections.setdefault("global", set()).add(user_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message(data, user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
