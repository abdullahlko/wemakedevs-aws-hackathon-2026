from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.routing import calculate_route

from services.geocoding import search_locations


app = FastAPI(title="TruckView")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TripRequest(BaseModel):
    from_location: str
    destination: str
    departure_time: str
    from_lat: float
    from_lng: float
    destination_lat: float
    destination_lng: float


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/locations/search")
async def location_search(query: str = Query(min_length=2)):
    try:
        return await search_locations(query)
    except Exception as error:
        print(f"Location search error: {error}")
        return []


@app.post("/api/trip/plan")
def plan_trip(trip: TripRequest):
    return {
        "message": "Trip received successfully",
        "trip": {
            "from": trip.from_location,
            "destination": trip.destination,
            "departure_time": trip.departure_time,
            "from_lat": trip.from_lat,
            "from_lng": trip.from_lng,
            "destination_lat": trip.destination_lat,
            "destination_lng": trip.destination_lng,
        },
    }

@app.post("/api/route")
async def create_route(trip: TripRequest):
    try:
        route = await calculate_route(
            origin_lat=trip.from_lat,
            origin_lng=trip.from_lng,
            destination_lat=trip.destination_lat,
            destination_lng=trip.destination_lng,
            departure_time=trip.departure_time,
        )

        return {
            "origin": {
                "name": trip.from_location,
                "lat": trip.from_lat,
                "lng": trip.from_lng,
            },
            "destination": {
                "name": trip.destination,
                "lat": trip.destination_lat,
                "lng": trip.destination_lng,
            },
            "route": route,
        }

    except Exception as error:
        print(f"Route calculation error: {error}")
        return {
            "error": str(error)
        }