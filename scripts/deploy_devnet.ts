import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JusdiVault } from "../target/types/jusdi_vault";
import { PublicKey } from "@solana/web3.js";

import * as fs from "fs";
import * as path from "path";

const TARGET_ADMIN = "DpWpnNK6LbaTdv2Wvq3bfqMAcUXLQRYX8mJkfKKXotNm";

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Manual Program Loading to avoid workspace issues
    const idlPath = path.resolve(__dirname, "../target/idl/jusdi_vault.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    const programId = new PublicKey("2HJod3PNRNfYzzgZHVM5TjCoZrFGJjPmYkRkUeJMKw9o");
    // Explicitly set the address in the IDL to ensure Program uses the correct one
    idl.address = programId.toBase58();
    const program = new Program(idl, programId, provider);

    const wallet = provider.wallet;

    console.log("🚀 Starting Deployment to Devnet...");
    console.log(`Current Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`Target Admin:   ${wallet.publicKey.toBase58()}`); // Using current wallet as admin


    // Derive Vault PDA
    const [vaultPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("vault")],
        program.programId
    );

    console.log(`Vault PDA: ${vaultPDA.toBase58()}`);

    try {
        // 1. Initialize Vault
        // Note: You need to specify the Base Mint (USDC Devnet) here.
        // Replace this with the actual Devnet USDC mint address.
        const USDC_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

        const tx = await program.methods
            .initializeVault(1000) // 10% Liquid Buffer
            .accounts({
                vault: vaultPDA,
                baseMint: USDC_DEVNET,
                admin: wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        console.log(`✅ Vault Initialized! Tx: ${tx}`);
        console.log(`Admin set to: ${wallet.publicKey.toBase58()}`);

    } catch (e) {
        console.error("Deployment failed:", e);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
