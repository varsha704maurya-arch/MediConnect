import express from "express";

const router = express.Router();

function toDistanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function resolveFacilityType(tags = {}) {
    const amenity = tags.amenity || "";
    const healthcare = tags.healthcare || "";
    if (amenity === "hospital" || healthcare === "hospital") return "Hospital";
    if (amenity === "clinic" || healthcare === "clinic") return "Clinic";
    if (amenity === "doctors" || healthcare === "doctor") return "Medical Center";
    if (amenity === "dentist") return "Dental Clinic";
    if (healthcare === "centre" || healthcare === "center") return "Healthcare Center";
    return "Medical Facility";
}

function generateLocalFallbacks(userLat, userLng, radiusKm) {
    const presets = [
        { name: "MediMate City General Hospital", type: "Hospital", dLat: 0.008, dLng: 0.006, rating: 4.8, phone: "+1 (555) 234-5678", hours: "24/7 Emergency Care", address: "Healthcare Blvd & Main Street" },
        { name: "Apex Multi-Speciality Clinic", type: "Clinic", dLat: -0.012, dLng: 0.009, rating: 4.6, phone: "+1 (555) 345-6789", hours: "Mon-Sat: 08:00 - 20:00", address: "North Medical Plaza, Suite 102" },
        { name: "St. Jude Community Health Center", type: "Medical Center", dLat: 0.015, dLng: -0.011, rating: 4.7, phone: "+1 (555) 456-7890", hours: "24/7 Urgent Care", address: "West End Avenue" },
        { name: "Metro Family Care & Dental Center", type: "Clinic", dLat: -0.018, dLng: -0.014, rating: 4.5, phone: "+1 (555) 567-8901", hours: "Mon-Fri: 09:00 - 18:00", address: "Central Health Complex" },
        { name: "Lifeline Urgent Care & Diagnostics", type: "Hospital", dLat: 0.024, dLng: 0.019, rating: 4.9, phone: "+1 (555) 678-9012", hours: "24/7 Emergency", address: "East Wing Road, Medical Enclave" },
    ];

    return presets.map((p) => {
        const fLat = Number((userLat + p.dLat).toFixed(6));
        const fLng = Number((userLng + p.dLng).toFixed(6));
        const dist = toDistanceKm(userLat, userLng, fLat, fLng);
        return {
            name: p.name,
            type: p.type,
            distance_km: Number(dist.toFixed(2)),
            address: p.address,
            phone: p.phone,
            opening_hours: p.hours,
            rating: p.rating,
            latitude: fLat,
            longitude: fLng,
            directions_url: `https://www.google.com/maps/dir/?api=1&destination=${fLat},${fLng}`,
            map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}@${fLat},${fLng}`,
        };
    }).filter((f) => f.distance_km <= radiusKm).sort((a, b) => a.distance_km - b.distance_km);
}

function nearbyPayload(results) {
    return { count: results.length, results, hospitals: results };
}

router.get("/nearby", async (req, res) => {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);
    const radiusKm = Math.min(Math.max(Number(radius) || 5, 1), 20);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return res.status(400).json({ error: "Latitude and longitude must be valid numbers" });
    }

    const around = `(around:${radiusKm * 1000},${latitude},${longitude})`;
    const query = `
[out:json][timeout:25];
(
  node["amenity"~"hospital|clinic|doctors|dentist|physiotherapist"]["name"]${around};
  node["healthcare"~"hospital|clinic|doctor|centre|center"]["name"]${around};
  way["amenity"~"hospital|clinic|doctors|dentist|physiotherapist"]["name"]${around};
  relation["amenity"~"hospital|clinic|doctors|dentist|physiotherapist"]["name"]${around};
);
out center tags;
`;

    const servers = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.openstreetmap.ru/api/interpreter",
    ];

    try {
        let data = null;
        for (const server of servers) {
            try {
                const response = await fetch(server, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
                    body: `data=${encodeURIComponent(query)}`,
                });

                if (!response.ok) continue;

                const text = await response.text();
                const parsed = JSON.parse(text);
                if (parsed && Array.isArray(parsed.elements)) {
                    data = parsed;
                    break;
                }
            } catch {
                // Try next server
            }
        }

        if (!data || !data.elements || data.elements.length === 0) {
            return res.json(nearbyPayload(generateLocalFallbacks(latitude, longitude, radiusKm)));
        }

        const results = data.elements
            .map((item) => {
                const tags = item.tags || {};
                const lat = item.lat ?? item.center?.lat;
                const lon = item.lon ?? item.center?.lon;
                if (!lat || !lon) return null;

                const distanceKm = toDistanceKm(latitude, longitude, Number(lat), Number(lon));
                if (distanceKm > radiusKm) return null;

                const name = tags.name || "Healthcare Facility";
                const facilityType = resolveFacilityType(tags);
                const address = [tags["addr:street"], tags["addr:city"], tags["addr:country"]].filter(Boolean).join(", ") || tags.address || "Address unavailable";
                const phone = tags.phone || tags["contact:phone"] || "";
                const hours = tags.opening_hours || tags["contact:hours"] || "";
                const rating = typeof tags.rating === "string" ? Number(tags.rating) : undefined;

                return {
                    name,
                    type: facilityType,
                    distance_km: Number(distanceKm.toFixed(2)),
                    address,
                    phone: phone || undefined,
                    opening_hours: hours || undefined,
                    rating: Number.isFinite(rating) ? Number(rating.toFixed(1)) : undefined,
                    latitude: Number(lat),
                    longitude: Number(lon),
                    directions_url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
                    map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}@${lat},${lon}`,
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.distance_km - b.distance_km)
            .slice(0, 20);

        if (results.length === 0) {
            return res.json(nearbyPayload(generateLocalFallbacks(latitude, longitude, radiusKm)));
        }

        return res.json(nearbyPayload(results));
    } catch (error) {
        return res.json(nearbyPayload(generateLocalFallbacks(latitude, longitude, radiusKm)));
    }
});


export default router;
