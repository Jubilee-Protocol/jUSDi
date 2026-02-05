import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { ModeProvider } from "@/context/ModeContext";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jubilee Yield Stream | Perpetual Funding for Agents & Causes",
  description: "Endowment-as-a-Service. Deposit USDC, stream yield forever to AI agents or charitable causes.",
  keywords: ["AI Agent", "USDC", "Yield", "DeFi", "Base", "Ethereum", "Perpetual Funding", "Charity", "Giving"],
  openGraph: {
    title: "Jubilee Yield Stream",
    description: "Endowment-as-a-Service: Perpetual funding for AI Agents and Causes",
    type: "website",
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
