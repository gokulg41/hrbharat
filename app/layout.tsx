import "./globals.css";
import "./theme.css";

export const metadata = {
  title: "HRBharat | Enterprise",
  description: "Premium HR Management SaaS Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HRBharat",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
        
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