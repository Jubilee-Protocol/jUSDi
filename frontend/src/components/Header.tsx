'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
    const [isDark, setIsDark] = useState(true)

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <Image
                            src="/jubilee-logo-pink.png"
                            alt="Jubilee Protocol"
                            width={36}
                            height={36}
                            className="w-9 h-9"
                        />
                        <div className="hidden sm:flex flex-col">
                            <span className="font-serif text-lg font-semibold text-text-primary leading-tight">
                                Jubilee
                            </span>
                            <span className="text-xs text-text-secondary leading-tight">
                                Yield Stream
                            </span>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link href="/" className="btn-ghost">
                            Home
                        </Link>
                        <Link href="/dashboard" className="btn-ghost">
                            Dashboard
                        </Link>
                        <Link href="/create" className="btn-ghost">
                            Create Stream
                        </Link>
                        <a
                            href="https://github.com/Jubilee-Protocol/jUSDi"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost"
                        >
                            Docs
                        </a>
                    </nav>

                    {/* Right side - Theme + Wallet */}
                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>

                        {/* Connect Wallet - Custom Magenta Button */}
                        <ConnectButton.Custom>
                            {({
                                account,
                                chain,
                                openAccountModal,
                                openChainModal,
                                openConnectModal,
                                mounted,
                            }) => {
                                const ready = mounted
                                const connected = ready && account && chain

                                return (
                                    <div
                                        {...(!ready && {
                                            'aria-hidden': true,
                                            style: {
                                                opacity: 0,
                                                pointerEvents: 'none',
                                                userSelect: 'none',
                                            },
                                        })}
                                    >
                                        {(() => {
                                            if (!connected) {
                                                return (
                                                    <button onClick={openConnectModal} className="btn-accent">
                                                        Connect Wallet
                                                    </button>
                                                )
                                            }

                                            if (chain.unsupported) {
                                                return (
                                                    <button onClick={openChainModal} className="btn-accent bg-error hover:bg-red-600">
                                                        Wrong network
                                                    </button>
                                                )
                                            }

                                            return (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={openChainModal}
                                                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                                                    >
                                                        {chain.hasIcon && (
                                                            <div
                                                                className="w-5 h-5 rounded-full overflow-hidden"
                                                                style={{ background: chain.iconBackground }}
                                                            >
                                                                {chain.iconUrl && (
                                                                    <img
                                                                        alt={chain.name ?? 'Chain icon'}
                                                                        src={chain.iconUrl}
                                                                        className="w-5 h-5"
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={openAccountModal}
                                                        className="btn-accent"
                                                    >
                                                        {account.displayName}
                                                    </button>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )
                            }}
                        </ConnectButton.Custom>
                    </div>
                </div>
            </div>
        </header>
    )
}
