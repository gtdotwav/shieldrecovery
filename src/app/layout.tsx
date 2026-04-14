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
  viewportFit: "cover",
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pagrecovery.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${platformBrand.name} | ${platformBrand.shortDescription}`,
    template: `%s | ${platformBrand.name}`,
  },
  description:
    "Recupere pagamentos falhados com IA em menos de 2 minutos. Recuperacao autonoma 24/7 via WhatsApp, Email e Voz. Sem custo fixo — pague apenas por resultado.",
  keywords: [
    "recuperação de pagamentos",
    "pagamentos falhos",
    "cobrança automática",
    "recuperação de receita",
    "SaaS",
    platformBrand.name,
  ],
  authors: [{ name: platformBrand.name }],
  creator: platformBrand.name,
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    url: baseUrl,
    siteName: platformBrand.name,
    title: `${platformBrand.name} — Recupere pagamentos falhados automaticamente`,
    description:
      "Recupere pagamentos falhados com IA em menos de 2 minutos. Recuperacao autonoma 24/7 via WhatsApp, Email e Voz. Sem custo fixo — pague apenas por resultado.",
    locale: "pt_BR",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${platformBrand.name} — ${platformBrand.shortDescription}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${platformBrand.name} — Recupere pagamentos falhados automaticamente`,
    description:
      "Recupere pagamentos falhados com IA em menos de 2 minutos. Recuperacao autonoma 24/7 via WhatsApp, Email e Voz. Sem custo fixo — pague apenas por resultado.",
    images: [`${baseUrl}/og-image.png`],
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
  alternates: {
    canonical: baseUrl,
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PagRecovery",
  applicationCategory: "BusinessApplication",
  description:
    "Plataforma de recuperacao autonoma de pagamentos falhados via IA",
  url: "https://pagrecovery.com",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
    description:
      "Sem custo fixo. Comissao apenas sobre pagamentos recuperados.",
  },
  publisher: {
    "@type": "Organization",
    name: platformBrand.name,
    url: baseUrl,
    logo: {
      "@type": "ImageObject",
      url: `${baseUrl}${platformBrand.logo}`,
    },
  },
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} bg-background text-foreground antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded"
        >
          Pular para conteudo
        </a>
        <ToastProvider>
          <div id="main">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
