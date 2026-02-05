import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { ModeProvider } from "@/context/ModeContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://stream.jusdi.xyz"),
  title: "Jubilee Yield Stream | Perpetual Funding for Agents & Causes",
  description: "Endowment-as-a-Service. Deposit USDC, stream yield forever to AI agents or charitable causes.",
  keywords: ["AI Agent", "USDC", "Yield", "DeFi", "Base", "Ethereum", "Perpetual Funding", "Charity", "Giving"],
  openGraph: {
    title: "Jubilee Yield Stream",
    description: "Endowment-as-a-Service: Perpetual funding for AI Agents and Causes",
    type: "website",
    url: "https://stream.jusdi.xyz",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Jubilee Yield Stream",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jubilee Yield Stream",
    description: "Endowment-as-a-Service: Perpetual funding for AI Agents and Causes",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/jubilee-logo-pink.png",
    apple: "/jubilee-logo-pink.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/jubilee-logo-pink.png" type="image/png" />
        <link rel="apple-touch-icon" href="/jubilee-logo-pink.png" />
      </head>
      <body className="min-h-screen">
        <Providers>
          <ModeProvider>
            <Header />
            <main className="pt-16 min-h-[calc(100vh-120px)]">
              {children}
            </main>
            <Footer />
          </ModeProvider>
        </Providers>
      </body>
    </html>
  );
}
