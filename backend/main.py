from fastapi import FastAPI

app = FastAPI()

@app.post("/")
async def help_message():
    return {"hello" : "dosto"}


