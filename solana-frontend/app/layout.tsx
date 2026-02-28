import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
    title: 'jUSDi on Solana - Stablecoin Index Fund',
    description: 'Deposit USDC or USDT and receive jUSDi — a yield-bearing stablecoin index token on Solana.',
    metadataBase: new URL('https://solana.jusdi.xyz'),
    openGraph: {
        title: 'jUSDi on Solana - Stablecoin Index Fund',
        description: 'Deposit USDC or USDT and receive jUSDi — a yield-bearing stablecoin index token on Solana.',
        images: ['/og-image.png'],
    },
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/icon.png" />
            </head>
            <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
