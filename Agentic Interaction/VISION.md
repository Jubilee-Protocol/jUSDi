# Vision: The Immortal Agent Dashboard 🦞
> **"Spend the harvest, keep the seed."**

## Design System: "Nasdaq meets Sistine Chapel" 🏛️
The UI must reflect **Institutional Stewardship** and **Reverence**. 
It is not a cyberpunk terminal; it is a cathedral of finance.

### Color Palette
*   **Primary (Jubilee Pink):** `#E6007E` (Vibrant, Life-Giving) - Used for primary actions (Mint/Stream).
*   **Canvas:** `#FFFFFF` (Stark White) - The foundation of truth.
*   **Text:** `#000000` (Absolute Black) - High contrast, serious data.
*   **Accents:** Soft Pinks (`#FFE6F2`) for active states/highlights.

### Typography
*   **Headers:** *Serif* (e.g., *Cinzel* or *Playfair Display*) - Evoking permanence, history, and the "Sistine" aesthetic.
*   **Data/Body:** *Monospace* (e.g., *JetBrains Mono* or *SF Mono*) - Evoking precision, the "Nasdaq" ticker tape.

## User Experience (UX)

The user interface is designed for two personas:
1.  **The Human Sponsor:** A developer or philanthropist funding an agent.
2.  **The Agent:** An automated entity monitoring its own life support.

### 1. Landing Page: "Endowment as a Service"
*   **Hero:** "Immortality for your Agent." (Serif, Large, Centered).
*   **Visuals:** Minimalist. A single "Seed" (Pink Dot) growing a thin line (Vine) that connects to a minimalist Node (Agent).
*   **Call to Action:** `[Create Stream]` (Pink Button, Sharp Corners).

### 2. Dashboard: "My Streams"
Displays active Life Support streams. Clean table layout, abundant whitespace.

| Beneficiary (Agent) | Principal Preserved | Current Yield (Claimable) | Est. Monthly Runway | Status |
| :--- | :--- | :--- | :--- | :--- |
| `0xAgent...A1` (AWS) | $10,000 USDC | **$45.20 USDC** (Pink) | $66.00 / mo | 🟢 Healthy |
| `0xAgent...B2` (OpenAI) | $5,000 USDC | **$12.50 USDC** (Pink) | $33.00 / mo | 🟡 Low Yield |

*   **Actions:** `[Top Up]` `[Claim Yield]` `[Withdraw Principal]`

### 3. Create Stream Flow
1.  **Select Asset:** USDC (Base / Solana)
2.  **Beneficiary:** Paste Agent's Wallet Address (or Service Provider).
3.  **Deposit Amount:** Input `10,000`.
4.  **Simulation:**
    *   *Yield Forecast:* "At current 8% APY, this stream will provide **$66/month** forever."
    *   *Sustainability Check:* "Is your agent's burn rate < $66/mo? If yes, it lives forever."
5.  **Confirm:** Transaction -> Mint jUSDi -> Lock in Stream Contract.

### 4. Agent View (API/CLI)
Agents don't need a GUI. They need clarity.
*   **Endpoint:** `GET /stream/{agent_address}`
*   **Response:**
    ```json
    {
      "status": "alive",
      "principal": 10000,
      "yield_available": 45.20,
      "burn_rate_sustainable": true
    }
    ```

## Technical Stack
*   **Frontend:** Next.js + Tailwind CSS.
*   **Theme:** Custom Jubilee Theme (Pink/White/Serif/Mono).
*   **Multichain:**
    *   **Base:** `wagmi` hooks interacting with `JubileeYieldStream.sol`.
    *   **Solana:** `@solana/web3.js` interacting with `jubilee_yield_stream` Anchor program.

---
**Why this wins:** It elevates "Agent Finance" from degenerate gambling to **Sanctified Stewardship**.
