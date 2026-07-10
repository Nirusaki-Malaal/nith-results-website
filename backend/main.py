from fastapi import FastAPI

app = FastAPI()

@app.post("/api/random")
async def help_message():
    pass

