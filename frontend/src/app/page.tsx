'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useMode, modeContent } from '@/context/ModeContext'

export default function Home() {
  const { isConnected } = useAccount()
  const { mode, setMode, isAgentMode } = useMode()
  const content = modeContent[mode]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {/* Mode Toggle */}
            <div className="inline-flex items-center bg-background-card border border-border rounded-full p-1 mb-8">
              <button
                onClick={() => setMode('agent')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${isAgentMode
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                <span>🤖</span>
                <span>For Agents</span>
              </button>
              <button
                onClick={() => setMode('human')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${!isAgentMode
                  ? 'bg-accent text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                <span>⛪</span>
                <span>For Causes</span>
              </button>
            </div>

            {/* Live Badge + Faucet Link */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-5 py-2.5">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm text-primary font-medium">Live on Base Sepolia</span>
              </div>
              <a
                href="https://www.alchemy.com/faucets/base-sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-primary transition-colors underline"
              >
                Need testnet ETH? Get from faucet →
              </a>
            </div>

            {/* Hero Headline - Updates based on mode */}
            <h1 className="heading-display mb-8">
              <span className="block text-text-primary">{content.headline}</span>
              <span className="block text-gradient">{content.subheadline}</span>
            </h1>

            {/* Tagline */}
            <p className="text-2xl md:text-3xl text-text-secondary max-w-3xl mx-auto mb-6 font-serif italic">
              {content.tagline}
            </p>

            {/* Description */}
            <p className="text-lg text-text-muted max-w-2xl mx-auto mb-12">
              {content.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              {isConnected ? (
                <Link href="/create" className="btn-action w-full sm:w-auto">
                  {content.ctaButton}
                </Link>
              ) : (
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button onClick={openConnectModal} className="btn-action w-full sm:w-auto">
                      Connect Wallet
                    </button>
                  )}
                </ConnectButton.Custom>
              )}
              <Link href="/dashboard" className="btn-secondary w-full sm:w-auto">
                View Dashboard
              </Link>
            </div>

            {/* Visual Flow: Seed → Stream → Beneficiary */}
            <div className="flex items-center justify-center gap-4 md:gap-8">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-[24px] bg-accent/20 border border-accent/30 flex items-center justify-center animate-float">
                  <span className="text-4xl">{content.flowIcons.seed}</span>
                </div>
                <span className="text-sm font-mono text-text-secondary">{content.flowLabels.seed}</span>
                <span className="text-xs text-text-muted" suppressHydrationWarning>$10,000 USDC</span>
              </div>

              <div className="flex-1 max-w-[80px] h-0.5 bg-gradient-to-r from-accent to-primary rounded-full" />

              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-[24px] bg-primary/20 border border-primary/30 flex items-center justify-center animate-float" style={{ animationDelay: '0.5s' }}>
                  <span className="text-4xl">{content.flowIcons.stream}</span>
                </div>
                <span className="text-sm font-mono text-text-secondary">{content.flowLabels.stream}</span>
                <span className="text-xs text-text-muted" suppressHydrationWarning>~$66/mo yield</span>
              </div>

              <div className="flex-1 max-w-[80px] h-0.5 bg-gradient-to-r from-primary to-success rounded-full" />

              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-[24px] bg-success/20 border border-success/30 flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
                  <span className="text-4xl">{content.flowIcons.beneficiary}</span>
                </div>
                <span className="text-sm font-mono text-text-secondary">{content.flowLabels.beneficiary}</span>
                <span className="text-xs text-success font-semibold">{content.statusLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Economics Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card p-8 md:p-12">
            <div className="text-center mb-10">
              <h2 className="heading-display text-4xl mb-4">
                {isAgentMode ? 'Agent Economics' : 'Giving Economics'}
              </h2>
              <p className="text-text-secondary text-lg">
                {isAgentMode
                  ? 'If Yield ≥ Burn Rate → Agent Lives Forever'
                  : 'If Yield ≥ Monthly Need → Cause Funded Forever'
                }
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="label py-4 text-left">Principal</th>
                    <th className="label py-4 text-left">APY</th>
                    <th className="label py-4 text-left">Monthly Yield</th>
                    <th className="label py-4 text-left">{content.burnRateLabel}</th>
                    <th className="label py-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="data-value py-5" suppressHydrationWarning>$5,000</td>
                    <td className="py-5 text-text-secondary">8%</td>
                    <td className="data-highlight py-5" suppressHydrationWarning>~$33/mo</td>
                    <td className="py-5 text-text-secondary" suppressHydrationWarning>$20/mo</td>
                    <td className="py-5">
                      <span className="status-healthy">
                        <span className="w-2 h-2 bg-success rounded-full" />
                        {content.statusLabel}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="data-value py-5" suppressHydrationWarning>$10,000</td>
                    <td className="py-5 text-text-secondary">8%</td>
                    <td className="data-highlight py-5" suppressHydrationWarning>~$66/mo</td>
                    <td className="py-5 text-text-secondary" suppressHydrationWarning>$50/mo</td>
                    <td className="py-5">
                      <span className="status-healthy">
                        <span className="w-2 h-2 bg-success rounded-full" />
                        {content.statusLabel}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="data-value py-5" suppressHydrationWarning>$25,000</td>
                    <td className="py-5 text-text-secondary">10%</td>
                    <td className="data-highlight py-5" suppressHydrationWarning>~$208/mo</td>
                    <td className="py-5 text-text-secondary" suppressHydrationWarning>$150/mo</td>
                    <td className="py-5">
                      <span className="status-healthy">
                        <span className="w-2 h-2 bg-success rounded-full" />
                        {content.statusLabel}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* jUSDi Yield Explanation Section */}
      <section className="py-24 bg-background-elevated">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card p-8 md:p-12 border border-accent/30">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <span className="text-3xl">💵</span>
              </div>
              <div>
                <h2 className="heading-display text-3xl text-text-primary">Powered by jUSDi</h2>
                <p className="text-lg text-text-secondary">The Jubilee USD Index</p>
              </div>
            </div>

            <p className="text-text-secondary text-lg mb-8">
              Your deposits are allocated to <span className="text-accent font-semibold">jUSDi</span>, a diversified USD stablecoin index vault that maximizes yield while minimizing risk. Here's how it works:
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-background-card rounded-[16px] border border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <span>🏦</span> Diversified Lending
                </h3>
                <p className="text-text-secondary text-sm">
                  Deposits are allocated across top DeFi protocols like Aave, Morpho, and Compound to earn optimized lending yields.
                </p>
              </div>

              <div className="p-6 bg-background-card rounded-[16px] border border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <span>⚖️</span> Risk-Adjusted Allocation
                </h3>
                <p className="text-text-secondary text-sm">
                  Smart rebalancing engine continuously optimizes allocation based on yield and protocol risk metrics.
                </p>
              </div>

              <div className="p-6 bg-background-card rounded-[16px] border border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <span>🔒</span> Principal Protection
                </h3>
                <p className="text-text-secondary text-sm">
                  Only yield is distributed—your principal stays locked in the vault, generating returns forever.
                </p>
              </div>

              <div className="p-6 bg-background-card rounded-[16px] border border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <span>📈</span> 6-10% Target APY
                </h3>
                <p className="text-text-secondary text-sm">
                  Yield compounds automatically. Current estimated APY ranges from 6-10% depending on market conditions.
                </p>
              </div>
            </div>

            <div className="p-5 bg-primary/10 border border-primary/30 rounded-[16px]">
              <p className="text-primary text-sm">
                <strong>🔍 Transparency:</strong> All jUSDi vault positions and allocations are visible on-chain. Track your yield in real-time on the Dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-background-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="heading-display text-4xl mb-4">How It Works</h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              {isAgentMode
                ? 'Three simple steps to immortalize your AI agent'
                : 'Three simple steps to create perpetual giving'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card p-8 text-center">
              <div className="w-16 h-16 rounded-[24px] bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">1️⃣</span>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">
                Deposit USDC
              </h3>
              <p className="text-text-secondary">
                Deposit your principal into the yield-generating vault. This is your "seed" that will never be spent.
              </p>
            </div>

            <div className="card p-8 text-center">
              <div className="w-16 h-16 rounded-[24px] bg-accent/20 border border-accent/30 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">2️⃣</span>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">
                {isAgentMode ? 'Set Agent Address' : 'Set Recipient'}
              </h3>
              <p className="text-text-secondary">
                {isAgentMode
                  ? 'Specify your AI agent\'s wallet address. The yield will be claimable by this address.'
                  : 'Specify the charity or ministry wallet. They can claim the yield anytime.'
                }
              </p>
            </div>

            <div className="card p-8 text-center">
              <div className="w-16 h-16 rounded-[24px] bg-success/20 border border-success/30 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">3️⃣</span>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">
                {isAgentMode ? 'Agent Lives Forever' : 'Give Forever'}
              </h3>
              <p className="text-text-secondary">
                {isAgentMode
                  ? 'Your agent claims yield as needed. As long as yield ≥ burn rate, your agent is immortal.'
                  : 'Your chosen cause receives yield forever. The principal stays intact, giving perpetually.'
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="heading-display text-4xl mb-6">
            Ready to {isAgentMode ? 'Immortalize Your Agent' : 'Start Giving Forever'}?
          </h2>
          <p className="text-text-secondary text-lg mb-10 max-w-2xl mx-auto">
            {isAgentMode
              ? 'Join the Jubilee Protocol and give your AI agent the gift of perpetual life.'
              : 'Join the Jubilee Protocol and give your favorite cause the gift of perpetual support.'
            }
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isConnected ? (
              <Link href="/create" className="btn-action">
                {content.ctaButton}
              </Link>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button onClick={openConnectModal} className="btn-action">
                    Connect Wallet
                  </button>
                )}
              </ConnectButton.Custom>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
