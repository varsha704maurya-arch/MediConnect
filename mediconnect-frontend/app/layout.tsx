import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "./components/Navbar";
import ActiveReminderBanner from "./components/ActiveReminderBanner";
import PwaRegister from "./components/PwaRegister";
import { AuthProvider } from "../lib/authContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f766e",
};

export const metadata: Metadata = {
  title: "MediConnect | Connected Healthcare, Consultations & Medicine Management",
  description: "MediConnect is a comprehensive healthcare platform connecting patients, licensed doctors, and family guardians for seamless online and offline consultations, 2-minute recurring medicine reminders, health records, and 5km nearby hospital locator.",
  keywords: [
    "MediConnect",
    "MediConnect Healthcare",
    "MediConnect System",
    "Online Doctor Consultation",
    "Offline Doctor Appointment",
    "Medicine Reminder 2 Minute",
    "Guardian Health Monitor",
    "Upload Medical Records",
    "Nearby Hospitals Within 5 km",
    "Doctor Consultation Chat and Call"
  ],
  authors: [{ name: "MediConnect Health Systems" }],
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://mediconnect.health"),
  alternates: {
    canonical: "https://mediconnect.health",
  },
  openGraph: {
    title: "MediConnect — Connected Healthcare, Consultations & Medicine Management",
    description: "Book online and offline doctor consultations, manage daily medications with 2-minute recurring reminders, and find nearby hospitals within 5 km.",
    url: "https://mediconnect.health",
    siteName: "MediConnect",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MediConnect — Connected Care Platform",
    description: "Real-time doctor consultations, 2-minute medicine reminders, and family health monitoring.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://mediconnect.health/#website",
      "url": "https://mediconnect.health",
      "name": "MediConnect",
      "description": "Comprehensive healthcare platform for online/offline doctor consultations, 2-minute recurring medicine reminders, and medical records.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://mediconnect.health/nearby?search={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "MedicalOrganization",
      "@id": "https://mediconnect.health/#organization",
      "name": "MediConnect Health Systems",
      "url": "https://mediconnect.health",
      "logo": "https://mediconnect.health/favicon.ico",
      "medicalSpecialty": ["PrimaryCare", "Emergency", "CommunityHealth"],
      "description": "Connecting patients, doctors, and family guardians for coordinated healthcare delivery and timely medication adherence.",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="app-shell min-h-full text-[var(--foreground)] bg-[#f8faf9] flex flex-col">
        <AuthProvider>
          <PwaRegister />
          <ActiveReminderBanner />
          <Navbar />
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

