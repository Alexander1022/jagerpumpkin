from fastapi import FastAPI
from server.api.router.auth_router import router as auth_rt

app = FastAPI()
@app.get("/")
def root():
    return {"message": "TaraTOR"}
app.include_router(auth_rt, prefix="/api")