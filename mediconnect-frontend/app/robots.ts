import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/patient/", "/doctor/", "/guardian/", "/api/"],
        },
        sitemap: "https://mediconnect.health/sitemap.xml",
    };
}
