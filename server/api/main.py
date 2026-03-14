from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.api.router.auth_router import router as auth_rt
import os

app = FastAPI()

origins_env = os.getenv("CORS_ALLOW_ORIGINS", "")
origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]

if not origins:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$|https?://[a-z2-7]{16,56}\.onion(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "TaraTOR"}

app.include_router(auth_rt, prefix="/api")