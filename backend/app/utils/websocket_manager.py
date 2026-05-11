from typing import Dict, List, Any
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # active_connections = {user_id: {"sockets": List[WebSocket], "name": str, "role": str}}
        self.active_connections: Dict[str, Dict[str, Any]] = {}

    async def connect(self, user_id: str, websocket: WebSocket, name: str, role: str):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {
                "sockets": [],
                "name": name,
                "role": role
            }
        self.active_connections[user_id]["sockets"].append(websocket)
        await self.broadcast_online_status()

    async def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]["sockets"]:
                self.active_connections[user_id]["sockets"].remove(websocket)
            
            if not self.active_connections[user_id]["sockets"]:
                del self.active_connections[user_id]
        
        await self.broadcast_online_status()

    async def broadcast_online_status(self):
        # Prepare payloads
        online_users = [
            {"id": uid, "name": data["name"], "role": data["role"]}
            for uid, data in list(self.active_connections.items())
        ]
        
        admin_payload = json.dumps({
            "type": "online_users",
            "data": online_users
        })
        
        standard_payload = json.dumps({
            "type": "connection_status",
            "data": "connected"
        })

        # Broadcast based on role
        for user_id, data in list(self.active_connections.items()):
            payload = admin_payload if data["role"] == "admin" else standard_payload
            for socket in list(data["sockets"]):
                try:
                    await socket.send_text(payload)
                except Exception as e:
                    print(f"Error broadcasting to {user_id}: {e}")
                    await self.disconnect(user_id, socket)

    async def broadcast_to_admin(self, payload: dict):
        message = json.dumps(payload)
        for user_id, data in list(self.active_connections.items()):
            if data["role"] in ["admin", "ceo", "sales", "accounts"]:
                for socket in list(data["sockets"]):
                    try:
                        await socket.send_text(message)
                    except Exception as e:
                        print(f"Error broadcasting to admin {user_id}: {e}")
                        await self.disconnect(user_id, socket)

manager = ConnectionManager()
