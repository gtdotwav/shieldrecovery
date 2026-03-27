import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { platformBrand } from "@/lib/platform";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: {
    default: `${platformBrand.name} | ${platformBrand.shortDescription}`,
    template: `%s | ${platformBrand.name}`,
  },
  description: platformBrand.longDescription,
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: platformBrand.name,
    title: `${platformBrand.name} | ${platformBrand.shortDescription}`,
    description: platformBrand.longDescription,
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${platformBrand.name} | ${platformBrand.shortDescription}`,
    description: platformBrand.longDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const themeScript = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch(e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      style={{
        "--accent": platformBrand.accent,
        "--accent-strong": platformBrand.accentStrong,
        "--accent-soft": `rgba(${platformBrand.accentRgb}, 0.10)`,
        "--accent-rgb": platformBrand.accentRgb,
      } as React.CSSProperties}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} bg-background text-foreground antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Pular para conteúdo
        </a>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
