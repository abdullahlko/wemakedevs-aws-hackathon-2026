import httpx


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


async def search_locations(query: str):
    params = {
        "q": query,
        "format": "json",
        "limit": 5,
        "countrycodes": "in",
        "addressdetails": 1,
    }

    headers = {
        "User-Agent": "TruckView/1.0 (truck route planning project)",
        "Accept-Language": "en",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            NOMINATIM_URL,
            params=params,
            headers=headers,
        )

        response.raise_for_status()

    results = response.json()

    locations = []

    for result in results:
        locations.append(
            {
                "name": result.get("display_name", ""),
                "lat": float(result["lat"]),
                "lng": float(result["lon"]),
            }
        )

    return locations