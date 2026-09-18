from fastapi import FastAPI

app = FastAPI(title="TruckRoute")


@app.get("/health")
def health_check():
    return {"status": "ok"}