import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'jUSDi | Stablecoin Index on Base',
    description: 'The Jubilee USD Index on Base. Earn yield on diversified USDC and USDT exposure via Aave V3.',
    keywords: ['jUSDi', 'Stablecoin', 'Index Fund', 'Base', 'DeFi', 'Aave', 'USDC', 'USDT'],
    icons: {
        icon: '/jubilee-logo-pink.png',
        apple: '/jubilee-logo-pink.png',
    },
    openGraph: {
        title: 'jUSDi | Stablecoin Index on Base',
        description: 'The Jubilee USD Index on Base. Earn 3-6% APY on diversified stablecoin exposure.',
        url: 'https://base.jusdi.xyz',
        siteName: 'jUSDi',
        images: [
            {
                url: 'https://base.jusdi.xyz/og-image.png',
                width: 625,
                height: 625,
                alt: 'jUSDi - Stablecoin Index',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'jUSDi | Stablecoin Index on Base',
        description: 'The Jubilee USD Index on Base. Earn 3-6% APY on diversified stablecoin exposure.',
        images: ['https://base.jusdi.xyz/og-image.png'],
    },
    other: {
        'base:app_id': '6985fdf8785494a0fe86a54e',
        'talentapp:project_verification': '4608344c003cdc036fc772ef59f87d73dcbdbbd04cebc0dba222654f2a21291d6bb6084c8191f2f2dfa42912570cfdcee8cc55e26c9541ea869aeb9fe9cf36e8',
        'fc:miniapp': JSON.stringify({
            version: 'next',
            imageUrl: 'https://base.jusdi.xyz/og-image.png',
            button: {
                title: 'Open jUSDi',
                action: {
                    type: 'launch_frame',
                    url: 'https://base.jusdi.xyz',
                    name: 'jUSDi - Stablecoin Index',
                    splashImageUrl: 'https://base.jusdi.xyz/splash.png',
                    splashBackgroundColor: '#0a0a0a'
                }
            }
        }),
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="format-detection" content="telephone=no" />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
