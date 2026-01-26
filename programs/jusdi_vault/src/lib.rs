use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn};
use pyth_sdk_solana::load_price_feed_from_account_info;

declare_id!("EB8cCayw4U8qtfxteJTdzVPgbNgFpDsSPP5vuPAzrvix");

#[program]
pub mod jusdi_vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>, liquid_buffer_bps: u16) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.admin = ctx.accounts.admin.key();
        vault.is_paused = false;
        vault.total_shares = 0;
        vault.bump = ctx.bumps.vault;
        vault.managed_balance = 0;
        vault.liquid_buffer_bps = liquid_buffer_bps;
        Ok(())
    }

    pub fn add_stablecoin(
        ctx: Context<AddStablecoin>,
        pyth_feed: Pubkey,
        risk_score: u8,
        max_allocation: u16
    ) -> Result<()> {
        let metadata = &mut ctx.accounts.metadata;
        metadata.mint = ctx.accounts.stable_mint.key();
        metadata.pyth_feed = pyth_feed;
        metadata.risk_score = risk_score;
        metadata.max_allocation = max_allocation;
        metadata.is_active = true;
        metadata.bump = ctx.bumps.metadata;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(!vault.is_paused, ErrorCode::VaultPaused);
        require!(ctx.accounts.metadata.is_active, ErrorCode::AssetNotActive);

        // 1. Fetch Pyth Price
        let price_account_info = &ctx.accounts.pyth_price_feed;
        let price_feed = load_price_feed_from_account_info(price_account_info).map_err(|_| ErrorCode::PythError)?;
        let current_price = price_feed.get_price_no_older_than(Clock::get()?.unix_timestamp, 60).ok_or(ErrorCode::PythStalePrice)?;
        require!(current_price.price > 0, ErrorCode::InvalidPrice);
        
        // 2. Transfer stablecoin from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts), amount)?;

        // 3. Mint jUSDi shares: (amount * price) / 10^shares_decimals (simplified example)
        // 3. Mint jUSDi shares: (amount * price) / 10^stable_decimals (assuming shares are 1:1 with target USD value)
        // Adjust for stablecoin decimals
        let stable_decimals = ctx.accounts.stable_mint.decimals;
        let price_u128 = current_price.price as u128;
        let expo_abs = current_price.expo.abs() as u32;
        
        // shares = amount * price / 10^expo / 10^(stable_decimals - share_decimals)
        // Simplified: amount * price / 10^(expo + stable_decimals - 6) -- assuming 6 decimals for jUSDi
        let shares_to_mint = (amount as u128 * price_u128 / 10u128.pow(expo_abs)) as u64;
        
        let seeds = &[b"vault".as_ref(), &[vault.bump]];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.jusdi_mint.to_account_info(),
                    to: ctx.accounts.user_shares_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            shares_to_mint,
        )?;

        let vault_mut = &mut ctx.accounts.vault;
        vault_mut.total_shares += shares_to_mint;
        // SECURITY: Track managed balance internally
        vault_mut.managed_balance += amount;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(!vault.is_paused, ErrorCode::VaultPaused);

        // 1. Fetch Pyth Price
        let price_account_info = &ctx.accounts.pyth_price_feed;
        let price_feed = load_price_feed_from_account_info(price_account_info).map_err(|_| ErrorCode::PythError)?;
        let current_price = price_feed.get_price_no_older_than(Clock::get()?.unix_timestamp, 60).ok_or(ErrorCode::PythStalePrice)?;
        require!(current_price.price > 0, ErrorCode::InvalidPrice);

        // 2. Burn user shares
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.jusdi_mint.to_account_info(),
                from: ctx.accounts.user_shares_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, shares)?;

        // 3. Transfer stablecoin back to user: (shares * 10^shares_decimals) / price (simplified example)
        // 3. Transfer stablecoin back to user: (shares * 10^expo) / price
        let amount_out = (shares as u128 * 10u128.pow(current_price.expo.abs() as u32) / current_price.price as u128) as u64;
        
        let seeds = &[b"vault".as_ref(), &[vault.bump]];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, amount_out)?;

        let vault_mut = &mut ctx.accounts.vault;
        vault_mut.total_shares -= shares;
        // SECURITY: Track managed balance internally
        vault_mut.managed_balance = vault_mut.managed_balance.saturating_sub(amount_out);
        Ok(())
    }

    pub fn rebalance_jupiter(ctx: Context<RebalanceJupiter>, amount_in: u64, min_amount_out: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(ctx.accounts.admin.key() == vault.admin, ErrorCode::Unauthorized);
        require!(!vault.is_paused, ErrorCode::VaultPaused);

        // 1. Oracle Guard (Optional but recommended for Production)
        // Ensure min_amount_out is at least 97% of market value
        let price_in_feed = load_price_feed_from_account_info(&ctx.accounts.pyth_price_in).map_err(|_| ErrorCode::PythError)?;
        let price_out_feed = load_price_feed_from_account_info(&ctx.accounts.pyth_price_out).map_err(|_| ErrorCode::PythError)?;
        let current_in = price_in_feed.get_price_no_older_than(Clock::get()?.unix_timestamp, 60).ok_or(ErrorCode::PythStalePrice)?;
        let current_out = price_out_feed.get_price_no_older_than(Clock::get()?.unix_timestamp, 60).ok_or(ErrorCode::PythStalePrice)?;
        
        require!(current_in.price > 0 && current_out.price > 0, ErrorCode::InvalidPrice);

        // Normalize amount_in to target decimals (simplified)
        // expected_out = amount_in * (price_in / 10^expo_in) / (price_out / 10^expo_out)
        // Adjust for decimals (assuming both are same for simplicity, or we'd pull from mints)
        let expected_out = (amount_in as u128 * current_in.price as u128 / current_out.price as u128) as u64; 
        let floor_out = expected_out * 97 / 100;
        require!(min_amount_out >= floor_out, ErrorCode::SlippageTooHigh);

        let seeds = &[b"vault".as_ref(), &[vault.bump]];
        let signer = &[&seeds[..]];

        // 2. CPI to Jupiter
        let jupiter_program = ctx.accounts.jupiter_program.to_account_info();
        anchor_lang::solana_program::program::invoke_signed(
            &anchor_lang::solana_program::instruction::Instruction {
                program_id: *jupiter_program.key,
                accounts: ctx.remaining_accounts
                    .iter()
                    .map(|acc| anchor_lang::solana_program::instruction::AccountMeta {
                        pubkey: *acc.key,
                        is_signer: acc.is_signer,
                        is_writable: acc.is_writable,
                    })
                    .collect(),
                data: vec![], // Instruction data from client
            },
            &ctx.remaining_accounts
                .iter()
                .map(|acc| acc.to_account_info())
                .collect::<Vec<AccountInfo>>(),
            signer,
        )?;

        Ok(())
    }

    pub fn supply_to_lending(ctx: Context<LendingAction>, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(ctx.accounts.admin.key() == vault.admin, ErrorCode::Unauthorized);
        
        let seeds = &[b"vault".as_ref(), &[vault.bump]];
        let signer = &[&seeds[..]];

        // CPI to Kamino/Solend: This would use the specific lending program's instructions
        // Typically involves depositing tokens into a reserve and receiving collateral tokens
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.lending_reserve_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn withdraw_from_lending(ctx: Context<LendingAction>, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(ctx.accounts.admin.key() == vault.admin, ErrorCode::Unauthorized);

        let seeds = &[b"vault".as_ref(), &[vault.bump]];
        let signer = &[&seeds[..]];

        // CPI to Kamino/Solend: Withdraw from reserve back to vault
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.lending_reserve_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init, 
        payer = admin, 
        space = 8 + 32 + 1 + 8 + 1 + 8 + 2,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, VaultState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddStablecoin<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 1 + 2 + 1 + 1,
        seeds = [b"metadata", stable_mint.key().as_ref()],
        bump
    )]
    pub metadata: Account<'info, StablecoinMetadata>,
    pub stable_mint: Account<'info, Mint>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    #[account(seeds = [b"metadata", stable_mint.key().as_ref()], bump = metadata.bump)]
    pub metadata: Account<'info, StablecoinMetadata>,
    
    /// CHECK: Pyth price account
    pub pyth_price_feed: AccountInfo<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub jusdi_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_shares_account: Account<'info, TokenAccount>,
    
    pub stable_mint: Account<'info, Mint>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    #[account(seeds = [b"metadata", stable_mint.key().as_ref()], bump = metadata.bump)]
    pub metadata: Account<'info, StablecoinMetadata>,
    
    /// CHECK: Pyth price account
    pub pyth_price_feed: AccountInfo<'info>,
    
    #[account(mut)]
    pub jusdi_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_shares_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub stable_mint: Account<'info, Mint>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct LendingAction<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// CHECK: Lending program (Kamino/Solend)
    pub lending_program: AccountInfo<'info>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lending_reserve_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RebalanceJupiter<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// CHECK: Jupiter program
    pub jupiter_program: AccountInfo<'info>,
    
    /// CHECK: Pyth price in
    pub pyth_price_in: AccountInfo<'info>,
    /// CHECK: Pyth price out
    pub pyth_price_out: AccountInfo<'info>,
    
    #[account(mut)]
    pub vault_token_account_in: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account_out: Account<'info, TokenAccount>,
    
    /// CHECK: Jupiter swap accounts (packed according to JUP instructions)
    pub jupiter_swap_accounts: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct VaultState {
    pub admin: Pubkey,
    pub is_paused: bool,
    pub total_shares: u64,
    pub bump: u8,
    /// SECURITY: Internally tracked balance to prevent donation attacks
    pub managed_balance: u64,
    /// Target liquid buffer in BPS (e.g., 1000 = 10%)
    pub liquid_buffer_bps: u16,
}

#[account]
pub struct StablecoinMetadata {
    pub mint: Pubkey,
    pub pyth_feed: Pubkey,
    pub risk_score: u8,
    pub max_allocation: u16, // in BPS
    pub is_active: bool,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The vault is currently paused")]
    VaultPaused,
    #[msg("Asset is not active for deposits")]
    AssetNotActive,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Pyth oracle error")]
    PythError,
    #[msg("Pyth price is stale")]
    PythStalePrice,
    #[msg("Invalid price from oracle")]
    InvalidPrice,
    #[msg("Slippage too high against oracle")]
    SlippageTooHigh,
}
