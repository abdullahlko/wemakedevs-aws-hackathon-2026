import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

type Location = {
    name: string
    lat: number
    lng: number
}

type RouteData = {
    distance_km: number
    duration_minutes: number
    traffic_delay_minutes: number
    coordinates: [number, number][]
}

type RouteMapProps = {
    fromLocation: Location | null
    destinationLocation: Location | null
    route: RouteData | null
}

function RouteMap({
    fromLocation,
    destinationLocation,
    route,
}: RouteMapProps) {
    const mapContainer = useRef<HTMLDivElement | null>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const markers = useRef<mapboxgl.Marker[]>([])

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

    useEffect(() => {
        if (!mapContainer.current || map.current || !token) {
            return
        }

        mapboxgl.accessToken = token

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [80.9462, 26.8467],
            zoom: 5,
        })

        map.current.addControl(
            new mapboxgl.NavigationControl(),
            "top-right",
        )

        return () => {
            map.current?.remove()
            map.current = null
        }
    }, [token])

    useEffect(() => {
        if (!map.current) {
            return
        }

        markers.current.forEach((marker) => marker.remove())
        markers.current = []

        if (fromLocation) {
            const popup = new mapboxgl.Popup({
                offset: 25,
            }).setHTML(
                `<strong>Starting location</strong><br />${fromLocation.name}`,
            )

            const marker = new mapboxgl.Marker()
                .setLngLat([fromLocation.lng, fromLocation.lat])
                .setPopup(popup)
                .addTo(map.current)

            markers.current.push(marker)
        }

        if (destinationLocation) {
            const popup = new mapboxgl.Popup({
                offset: 25,
            }).setHTML(
                `<strong>Destination</strong><br />${destinationLocation.name}`,
            )

            const marker = new mapboxgl.Marker()
                .setLngLat([
                    destinationLocation.lng,
                    destinationLocation.lat,
                ])
                .setPopup(popup)
                .addTo(map.current)

            markers.current.push(marker)
        }

        if (fromLocation && destinationLocation) {
            const bounds = new mapboxgl.LngLatBounds()

            bounds.extend([
                fromLocation.lng,
                fromLocation.lat,
            ])

            bounds.extend([
                destinationLocation.lng,
                destinationLocation.lat,
            ])

            map.current.fitBounds(bounds, {
                padding: 80,
                maxZoom: 10,
            })
        } else if (fromLocation) {
            map.current.flyTo({
                center: [
                    fromLocation.lng,
                    fromLocation.lat,
                ],
                zoom: 10,
            })
        } else if (destinationLocation) {
            map.current.flyTo({
                center: [
                    destinationLocation.lng,
                    destinationLocation.lat,
                ],
                zoom: 10,
            })
        }
    }, [fromLocation, destinationLocation])

    useEffect(() => {
        if (!map.current || !route?.coordinates.length) {
            return
        }

        const drawRoute = () => {
            if (!map.current) {
                return
            }

            const routeGeoJson = {
                type: "Feature",
                properties: {},
                geometry: {
                    type: "LineString",
                    coordinates: route.coordinates,
                },
            }

            const existingSource = map.current.getSource(
                "tomtom-route",
            )

            if (existingSource) {
                (
                    existingSource as mapboxgl.GeoJSONSource
                ).setData(routeGeoJson)

                return
            }

            map.current.addSource("tomtom-route", {
                type: "geojson",
                data: routeGeoJson,
            })

            map.current.addLayer({
                id: "tomtom-route-line",
                type: "line",
                source: "tomtom-route",
                layout: {
                    "line-join": "round",
                    "line-cap": "round",
                },
                paint: {
                    "line-width": 6,
                    "line-color": "#2563eb",
                },
            })
        }

        if (map.current.isStyleLoaded()) {
            drawRoute()
        } else {
            map.current.once("load", drawRoute)
        }
    }, [route])

    if (!token) {
        return (
            <div className="flex h-[620px] items-center justify-center bg-slate-100 p-6 text-center">
                <div>
                    <p className="font-semibold text-slate-900">
                        Mapbox access token is missing
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                        Add VITE_MAPBOX_ACCESS_TOKEN to frontend/.env
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={mapContainer}
            className="h-[620px] w-full"
        />
    )
}

export default RouteMap