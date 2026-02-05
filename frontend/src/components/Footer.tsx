'use client'

export function Footer() {
    return (
        <footer className="bg-background-elevated border-t border-border py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center text-text-secondary text-sm">
                    2026 © Jubilee Protocol · Governed by{' '}
                    <a
                        href="https://hundredfoldfoundation.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-primary hover:text-primary transition-colors"
                    >
                        Hundredfold Foundation
                    </a>
                </div>
            </div>
        </footer>
    )
}
