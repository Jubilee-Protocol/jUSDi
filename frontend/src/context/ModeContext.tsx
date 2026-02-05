'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type UserMode = 'agent' | 'human'

interface ModeContextType {
    mode: UserMode
    setMode: (mode: UserMode) => void
    isAgentMode: boolean
    isHumanMode: boolean
}

const ModeContext = createContext<ModeContextType | undefined>(undefined)

export function ModeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<UserMode>('agent')

    return (
        <ModeContext.Provider
            value={{
                mode,
                setMode,
                isAgentMode: mode === 'agent',
                isHumanMode: mode === 'human',
            }}
        >
            {children}
        </ModeContext.Provider>
    )
}

export function useMode() {
    const context = useContext(ModeContext)
    if (context === undefined) {
        throw new Error('useMode must be used within a ModeProvider')
    }
    return context
}

// Mode-specific content helpers
export const modeContent = {
    agent: {
        headline: 'Immortality',
        subheadline: 'for your Agent',
        tagline: '"Spend the harvest, keep the seed."',
        description: 'Deposit USDC into a yield-generating vault. Your agent receives the yield forever. The principal is preserved. When yield ≥ burn rate, your agent lives forever.',
        beneficiaryLabel: 'Agent Wallet Address',
        beneficiaryPlaceholder: '0x... your agent\'s wallet',
        flowIcons: {
            seed: '🌱',
            stream: '💧',
            beneficiary: '🤖',
        },
        flowLabels: {
            seed: 'THE SEED',
            stream: 'THE STREAM',
            beneficiary: 'THE AGENT',
        },
        statusLabel: 'IMMORTAL',
        burnRateLabel: 'Burn Rate',
        ctaButton: 'Create Stream →',
    },
    human: {
        headline: 'Perpetual',
        subheadline: 'Giving',
        tagline: '"Plant once, give forever."',
        description: 'Deposit USDC into a yield-generating vault. Your chosen cause receives the yield forever. The principal is preserved. Support ministries, charities, and causes in perpetuity.',
        beneficiaryLabel: 'Recipient Wallet Address',
        beneficiaryPlaceholder: '0x... charity or ministry wallet',
        flowIcons: {
            seed: '🌱',
            stream: '💧',
            beneficiary: '⛪',
        },
        flowLabels: {
            seed: 'THE SEED',
            stream: 'THE STREAM',
            beneficiary: 'THE CAUSE',
        },
        statusLabel: 'GIVING FOREVER',
        burnRateLabel: 'Monthly Need',
        ctaButton: 'Start Giving →',
    },
}
