self.addEventListener("push", (event) => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(self.registration.showNotification(data.title || "MediConnect reminder", {
        body: data.body || "You have a medicine reminder.",
        tag: data.reminderId ? `reminder-${data.reminderId}` : "mediconnect-reminder",
        data: { url: "/patient" },
        requireInteraction: true,
    }));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
        const patientWindow = windows.find((window) => window.url.includes("/patient"));
        if (patientWindow) return patientWindow.focus();
        return clients.openWindow(event.notification.data?.url || "/patient");
    }));
});
