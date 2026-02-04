import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    getAccount,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";

describe("jusdi_vault", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Manual Program Loading
    const idl = JSON.parse(fs.readFileSync("./target/idl/jusdi_vault.json", "utf8"));
    const programId = new anchor.web3.PublicKey("EB8cCayw4U8qtfxteJTdzVPgbNgFpDsSPP5vuPAzrvix");
    const program = new Program(idl, programId, provider);

    const admin = (provider.wallet as any).payer;

    let baseMint: anchor.web3.PublicKey;
    let jusdiMint: anchor.web3.PublicKey;
    let vaultPDA: anchor.web3.PublicKey;
    let vaultBump: number;
    let vaultTokenAccount: anchor.web3.PublicKey;

    let user: anchor.web3.Keypair;
    let userTokenAccount: anchor.web3.PublicKey;
    let userSharesAccount: anchor.web3.PublicKey;

    before(async () => {
        // Fund admin check? Provider usually ok.

        // Create Base Mint
        baseMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);

        // Derive Vault PDA
        [vaultPDA, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from("vault")],
            program.programId
        );

        // Create JUSDi Mint
        jusdiMint = await createMint(provider.connection, admin, vaultPDA, vaultPDA, 6);

        // Setup User
        user = anchor.web3.Keypair.generate();
        await provider.connection.requestAirdrop(user.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    });

    it("Is initialized!", async () => {
        await program.methods
            .initializeVault(1000)
            .accounts({
                vault: vaultPDA,
                baseMint: baseMint,
                admin: admin.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        const vaultState = await program.account.vaultState.fetch(vaultPDA);
        assert.ok(vaultState);
    });

    it("Deposits Assets and Mints Shares", async () => {
        // Setup ATAs
        const userTokenAcct = await getOrCreateAssociatedTokenAccount(provider.connection, user, baseMint, user.publicKey);
        userTokenAccount = userTokenAcct.address;

        const userSharesAcct = await getOrCreateAssociatedTokenAccount(provider.connection, user, jusdiMint, user.publicKey);
        userSharesAccount = userSharesAcct.address;

        const vaultTokenAcct = await getOrCreateAssociatedTokenAccount(provider.connection, admin, baseMint, vaultPDA, true);
        vaultTokenAccount = vaultTokenAcct.address;

        await mintTo(provider.connection, admin, baseMint, userTokenAccount, admin.publicKey, 1000_000000);

        await program.methods.deposit(new anchor.BN(100_000000))
            .accounts({
                vault: vaultPDA,
                userTokenAccount: userTokenAccount,
                vaultTokenAccount: vaultTokenAccount,
                jusdiMint: jusdiMint,
                userSharesAccount: userSharesAccount,
                baseMint: baseMint,
                user: user.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        const state = await program.account.vaultState.fetch(vaultPDA);
        assert.equal(state.totalShares.toNumber(), 100_000000);
    });

    it("Harvests Yield", async () => {
        await mintTo(provider.connection, admin, baseMint, vaultTokenAccount, admin.publicKey, 10_000000);

        await program.methods.harvestYield(new anchor.BN(10_000000))
            .accounts({
                vault: vaultPDA,
                admin: admin.publicKey,
            })
            .signers([admin])
            .rpc();

        const state = await program.account.vaultState.fetch(vaultPDA);
        assert.equal(state.managedAssets.toNumber(), 110_000000);
    });

    it("Withdraws", async () => {
        await program.methods.withdraw(new anchor.BN(100_000000))
            .accounts({
                vault: vaultPDA,
                jusdiMint: jusdiMint,
                userSharesAccount: userSharesAccount,
                vaultTokenAccount: vaultTokenAccount,
                userTokenAccount: userTokenAccount,
                user: user.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        const state = await program.account.vaultState.fetch(vaultPDA);
        assert.equal(state.totalShares.toNumber(), 0);
    });
});
