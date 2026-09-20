"use client";

import { useCallback, useMemo, useState } from "react";
import { MapPin, Navigation, LocateFixed, Map, List } from "lucide-react";
import { apiRequest } from "../../lib/api";

type Facility = {
    name: string;
    type: string;
    distance_km: number;
    address?: string;
    phone?: string;
    opening_hours?: string;
    rating?: number;
    latitude: number;
    longitude: number;
    directions_url: string;
    map_url: string;
};

const radiusOptions = [1, 2, 5, 10];

export default function NearbyHealthcare() {
    const [radius, setRadius] = useState<number>(5);
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error" | "denied">("idle");
    const [message, setMessage] = useState<string>("");
    const [results, setResults] = useState<Facility[]>([]);
    const [viewMode, setViewMode] = useState<"list" | "map">("list");
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    const mapEmbedUrl = useMemo(() => {
        if (!userLocation) return "";
        const lat = userLocation.lat;
        const lng = userLocation.lng;
        const delta = 0.08;
        const bbox = `${(lng - delta).toFixed(5)},${(lat - delta).toFixed(5)},${(lng + delta).toFixed(5)},${(lat + delta).toFixed(5)}`;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
    }, [userLocation]);

    const findNearby = useCallback(async () => {
        if (!navigator.geolocation) {
            setStatus("error");
            setMessage("This browser does not support location services.");
            return;
        }

        setStatus("loading");
        setMessage("Requesting your location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setUserLocation({ lat, lng });

                try {
                    const data = await apiRequest<{ count: number; results: Facility[] }>(`/maps/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
                    const nextResults = data.results || [];
                    setResults(nextResults);

                    if (nextResults.length === 0) {
                        setStatus("empty");
                        setMessage("No hospitals or clinics were found within the selected radius.");
                        return;
                    }

                    setStatus("ready");
                    setMessage(`Found ${nextResults.length} facilities within ${radius} km.`);
                } catch (error) {
                    setStatus("error");
                    setMessage(error instanceof Error ? error.message : "Nearby healthcare request failed.");
                }
            },
            () => {
                setStatus("denied");
                setMessage("Location permission was denied. Please allow access to find nearby healthcare.");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
            }
        );
    }, [radius]);

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-[var(--brand)]">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Nearby Healthcare</span>
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">Find Healthcare Near Me</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {radiusOptions.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setRadius(option)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${radius === option
                                    ? "border-[var(--brand)] bg-teal-50 text-[var(--brand-deep)]"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {option} km
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={findNearby}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--brand-deep)]"
                >
                    <LocateFixed className="h-4 w-4" />
                    {status === "loading" ? "Locating..." : "Find Healthcare Near Me"}
                </button>

                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                            }`}
                    >
                        <List className="h-3.5 w-3.5" /> List
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("map")}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${viewMode === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                            }`}
                    >
                        <Map className="h-3.5 w-3.5" /> Map
                    </button>
                </div>
            </div>

            {message && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {message}
                </div>
            )}

            {viewMode === "map" && userLocation && mapEmbedUrl && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <iframe title="Nearby healthcare map" src={mapEmbedUrl} className="h-[280px] w-full border-0" loading="lazy" />
                </div>
            )}

            {viewMode === "list" && results.length > 0 && (
                <div className="mt-5 space-y-3">
                    {results.map((facility, index) => (
                        <article key={`${facility.name}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-base font-bold text-slate-900">{facility.name}</h4>
                                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--brand)]">
                                            {facility.type}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {facility.distance_km.toFixed(1)} km away</span>
                                        {facility.rating && <span>⭐ {facility.rating.toFixed(1)}</span>}
                                    </div>

                                    {facility.address && <p className="mt-2 text-sm text-slate-600">{facility.address}</p>}
                                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                                        {facility.phone && <p>Phone: {facility.phone}</p>}
                                        {facility.opening_hours && <p>Hours: {facility.opening_hours}</p>}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 md:items-end">
                                    <a
                                        href={facility.directions_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--brand-deep)]"
                                    >
                                        <Navigation className="h-3.5 w-3.5" /> Get Directions
                                    </a>
                                    <a
                                        href={facility.map_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-bold text-slate-600 underline underline-offset-2"
                                    >
                                        View Map
                                    </a>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {status === "empty" && (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No healthcare facilities matched your search in this area. Try a wider radius.
                </div>
            )}

            {status === "denied" || status === "error" ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {message}
                </div>
            ) : null}
        </section>
    );
}
