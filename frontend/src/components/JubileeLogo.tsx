'use client'

interface JubileeLogoProps {
    className?: string
    size?: number
}

/**
 * Jubilee Protocol Logo - The iconic arch with house/shelter motif
 * Represents the "doorway to shelter" - protecting agents and causes
 */
export function JubileeLogo({ className = '', size = 36 }: JubileeLogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="jubileeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E6007E" />
                    <stop offset="50%" stopColor="#e91e63" />
                    <stop offset="100%" stopColor="#da77f2" />
                </linearGradient>
            </defs>

            {/* Outer arch */}
            <path
                d="M10 95 L10 40 C10 18 30 5 50 5 C70 5 90 18 90 40 L90 95"
                stroke="url(#jubileeGradient)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
            />

            {/* Middle arch */}
            <path
                d="M22 95 L22 45 C22 28 35 18 50 18 C65 18 78 28 78 45 L78 95"
                stroke="url(#jubileeGradient)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
            />

            {/* Inner roof/chevron */}
            <path
                d="M35 60 L50 45 L65 60"
                stroke="url(#jubileeGradient)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* House base */}
            <path
                d="M35 60 L35 85 L45 85 L45 72 C45 68 55 68 55 72 L55 85 L65 85 L65 60"
                stroke="url(#jubileeGradient)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
