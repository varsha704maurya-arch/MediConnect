const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:5000/api` : "http://localhost:5000/api");

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
        ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data as T;
}

export async function apiDownload(path: string, defaultFilename = "download"): Promise<void> {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    const response = await fetch(`${API_URL}${path}`, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "File download failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export { API_URL };
