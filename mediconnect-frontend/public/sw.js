const CACHE_NAME = "mediconnect-cache-v1";
const STATIC_ASSETS = [
    "/",
    "/manifest.webmanifest",
    "/icons/icon-192.svg",
    "/icons/icon-512.svg",
    "/icons/icon-maskable.svg"
];

// 1. Install: Pre-cache core PWA shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn("PWA precache warning:", err);
            });
        }).then(() => self.skipWaiting())
    );
});

// 2. Activate: Clean up older cache versions
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch: Offline-resilient routing
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and cross-origin or API calls
    if (request.method !== "GET" || url.pathname.startsWith("/api")) {
        return;
    }

    // HTML Navigation: Network-first with cache fallback
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match(request).then((cached) => {
                    return cached || caches.match("/");
                });
            })
        );
        return;
    }

    // Static assets (CSS, JS, images, icons): Stale-while-revalidate
    if (
        request.destination === "style" ||
        request.destination === "script" ||
        request.destination === "image" ||
        request.destination === "font"
    ) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    const fetchPromise = fetch(request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                cache.put(request, networkResponse.clone());
                            }
                            return networkResponse;
                        })
                        .catch(() => cachedResponse);
                    return cachedResponse || fetchPromise;
                });
            })
        );
    }
});

// 4. Web Push Notification Handler
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { title: "MediConnect", body: event.data ? event.data.text() : "Health update available" };
    }

    const title = data.title || "MediConnect Healthcare";
    const options = {
        body: data.body || "You have a health notification.",
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
        tag: data.reminderId ? `reminder-${data.reminderId}` : "mediconnect-alert",
        data: {
            url: data.appointmentId ? "/patient" : data.patientId ? "/guardian" : "/patient",
            ...data
        },
        requireInteraction: true,
        vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Handler
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/patient";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
            const matched = windows.find((window) => window.url.includes(targetUrl));
            if (matched && "focus" in matched) {
                return matched.focus();
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
