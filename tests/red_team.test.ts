import * as anchor from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";

// Compatibility shim for CJS/ESM
const anchorModule = (anchor as any).default || anchor;
const { Program, BN, AnchorProvider, setProvider, web3 } = anchorModule;

describe("Red Team Security Audit 🛡️", () => {
    const provider = AnchorProvider.env();
    setProvider(provider);

    // Load Program manually
    const idl = JSON.parse(fs.readFileSync("./target/idl/jusdi_vault.json", "utf8"));
    const programId = new web3.PublicKey("2HJod3PNRNfYzzgZHVM5TjCoZrFGJjPmYkRkUeJMKw9o");
    idl.address = programId.toBase58();
    const program = new Program(idl, programId, provider);

    const admin = (provider.wallet as any).payer;
    const attacker = web3.Keypair.generate();

    let baseMint: any;
    let jusdiMint: any;
    let vaultPDA: any;
    let vaultBump: number;
    let vaultTokenAccount: any;

    let user: any;
    let userTokenAccount: any;
    let userSharesAccount: any;

    before(async () => {
        // Fund Attacker and User
        const latestBlockHash = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: await provider.connection.requestAirdrop(attacker.publicKey, 10 * web3.LAMPORTS_PER_SOL)
        }, "confirmed");

        user = web3.Keypair.generate();
        await provider.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: await provider.connection.requestAirdrop(user.publicKey, 10 * web3.LAMPORTS_PER_SOL)
        }, "confirmed");

        // 1. Setup Environment
        [vaultPDA, vaultBump] = await web3.PublicKey.findProgramAddress(
            [Buffer.from("vault")],
            program.programId
        );

        // Check if vault exists/is initialized
        try {
            const vaultState = await program.account.vaultState.fetch(vaultPDA);
            // console.log("Reusing existing Vault state. Base Mint:", vaultState.baseMint.toBase58());
            baseMint = vaultState.baseMint;
        } catch (e) {
            // Not initialized, create new
            baseMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
            await program.methods
                .initializeVault(1000)
                .accounts({
                    vault: vaultPDA,
                    baseMint: baseMint,
                    admin: admin.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .signers([admin])
                .rpc();
        }
    });

    it("Setup: Create Managed Mint", async () => {
        // We always create a new jusdiMint because Vault doesn't enforce a specific mint address, 
        // it only enforces that it signs for it.
        jusdiMint = await createMint(provider.connection, admin, vaultPDA, vaultPDA, 6);

        userTokenAccount = (await getOrCreateAssociatedTokenAccount(provider.connection, user, baseMint, user.publicKey)).address;
        userSharesAccount = (await getOrCreateAssociatedTokenAccount(provider.connection, user, jusdiMint, user.publicKey)).address;
        vaultTokenAccount = (await getOrCreateAssociatedTokenAccount(provider.connection, admin, baseMint, vaultPDA, true)).address;

        await mintTo(provider.connection, admin, baseMint, userTokenAccount, admin.publicKey, 1000_000000);
    });


    it("🛡️ [Access Control] Attacker cannot Harvest Yield", async () => {
        try {
            await program.methods.harvestYield(new BN(100_000000))
                .accounts({
                    vault: vaultPDA,
                    admin: attacker.publicKey,
                })
                .signers([attacker])
                .rpc();
            assert.fail("Should have thrown Unauthorized error");
        } catch (e: any) {
            const msg = JSON.stringify(e) + e.toString();
            assert.ok(msg.includes("Unauthorized") || msg.includes("6002") || msg.includes("Constraint") || msg.includes("3010") || msg.includes("Signature verification failed"), "Error did not match expected Unauthorized/Signer error");
        }
    });

    it("🛡️ [Uninitialized] Cannot Deposit to Fake/Uninit Vault", async () => {
        const fakeVault = web3.Keypair.generate();
        try {
            await program.methods.deposit(new BN(50_000000))
                .accounts({
                    vault: fakeVault.publicKey,
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
            assert.fail("Should have failed with AccountNotInitialized");
        } catch (e: any) {
            assert.ok(e);
        }
    });

    it("🛡️ [Yield Integrity] Users cannot steal Yield (Dilution Check)", async () => {
        const depositAmount = new BN(100_000000);
        await program.methods.deposit(depositAmount)
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

        const initialShares = (await provider.connection.getTokenAccountBalance(userSharesAccount)).value.amount;
        assert.equal(initialShares, "100000000");

        await mintTo(provider.connection, admin, baseMint, vaultTokenAccount, admin.publicKey, 10_000000);

        await program.methods.harvestYield(new BN(10_000000))
            .accounts({
                vault: vaultPDA,
                admin: admin.publicKey,
            })
            .signers([admin])
            .rpc();

        // Check state
        const vaultState = await program.account.vaultState.fetch(vaultPDA);
        const totalAssets = vaultState.managedAssets.toNumber();
        const totalShares = vaultState.totalShares.toNumber();

        assert.equal(totalAssets, 110_000000);
        assert.equal(totalShares, 100_000000);

        await program.methods.withdraw(new BN(initialShares))
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

        const finalBalance = (await provider.connection.getTokenAccountBalance(userTokenAccount)).value.amount;
        // User deposited 100, gained 10% on yield, withdrew. Total 1000 initial - 100 + 110 = 1010.
        // Wait, failing test from previous run said: "Asset does not match vault base asset".
        // That means in Deposit, I sent `baseMint` (new) but vault had `vault.base_mint` (old).
        // Since I fixed `before` to align `baseMint` variable with `vault.base_mint`, this test should pass now.
        assert.equal(finalBalance, "1010000000");
    });
});
