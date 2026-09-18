from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="TruckView")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TripRequest(BaseModel):
    from_location: str
    destination: str
    departure_time: str


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/trip/plan")
def plan_trip(trip: TripRequest):
    return {
        "message": "Trip received successfully",
        "trip": {
            "from": trip.from_location,
            "destination": trip.destination,
            "departure_time": trip.departure_time,
        },
    }