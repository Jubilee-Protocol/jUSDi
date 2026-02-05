import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { ModeProvider } from "@/context/ModeContext";
import { Header } from "@/components/Header";
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
      <body className="min-h-screen">
        <Providers>
          <ModeProvider>
            <Header />
            <main className="pt-16">
              {children}
            </main>
          </ModeProvider>
        </Providers>
      </body>
    </html>
  );
}
