import "./globals.css";
import "./theme.css";

import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Footer from "@/components/footer";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// TODO: set NEXT_PUBLIC_SITE_URL in your environment (e.g. https://hrbharat.com)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hrbharat.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "HRBharat — HR & Payroll Software for Growing Businesses",
    template: "%s | HRBharat",
  },
  description:
    "HRBharat simplifies HR, payroll, attendance and employee management for growing businesses in India and the UAE.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "HRBharat",
    title: "HRBharat — HR & Payroll Software for Growing Businesses",
    description:
      "HRBharat simplifies HR, payroll, attendance and employee management for growing businesses in India and the UAE.",
    images: [
      {
        // TODO: add a real 1200x630 OG image at public/og-image.png
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HRBharat — HR & Payroll Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HRBharat — HR & Payroll Software for Growing Businesses",
    description:
      "HRBharat simplifies HR, payroll, attendance and employee management for growing businesses in India and the UAE.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HRBharat",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
        <Footer />

        {/* PWA Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((reg) => console.log('Service Worker registered: ', reg.scope))
                    .catch((err) => console.log('Service Worker registration failed: ', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
