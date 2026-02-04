use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn};
// pyth import removed

declare_id!("2HJod3PNRNfYzzgZHVM5TjCoZrFGJjPmYkRkUeJMKw9o");

#[program]
pub mod jusdi_vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>, liquid_buffer_bps: u16) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.admin = ctx.accounts.admin.key();
        vault.base_mint = ctx.accounts.base_mint.key(); // Set Base Asset (e.g. USDC)
        vault.is_paused = false;
        vault.total_shares = 0;
        vault.bump = ctx.bumps.vault;
        vault.managed_assets = 0; // Tracks Principal + Harvested Yield
        vault.liquid_buffer_bps = liquid_buffer_bps;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Scope the borrow to read values
        let (vault_bump, total_shares, total_assets) = {
            let vault = &ctx.accounts.vault;
            require!(!vault.is_paused, ErrorCode::VaultPaused);
            require!(ctx.accounts.base_mint.key() == vault.base_mint, ErrorCode::InvalidAsset);
            (vault.bump, vault.total_shares, vault.managed_assets)
        };

        // 1. Transfer base asset from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts), amount)?;

        // 2. Calculate Shares
        let shares_to_mint = if total_shares == 0 || total_assets == 0 {
            amount
        } else {
            (amount as u128)
                .checked_mul(total_shares as u128).unwrap()
                .checked_div(total_assets as u128).unwrap() as u64
        };
        
        // 3. Mint Shares
        let seeds = &[b"vault".as_ref(), &[vault_bump]];
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

        // 4. Update State (Re-borrow mutably)
        let vault = &mut ctx.accounts.vault;
        vault.total_shares += shares_to_mint;
        vault.managed_assets += amount;
        
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        // Scope borrow
        let (vault_bump, total_shares, total_assets) = {
            let vault = &ctx.accounts.vault;
            require!(!vault.is_paused, ErrorCode::VaultPaused);
            (vault.bump, vault.total_shares, vault.managed_assets)
        };

        // 1. Calculate Amount Out
        require!(shares <= total_shares, ErrorCode::InsufficientFunds);
        
        let amount_out = (shares as u128)
            .checked_mul(total_assets as u128).unwrap()
            .checked_div(total_shares as u128).unwrap() as u64;

        // 2. Burn User Shares
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.jusdi_mint.to_account_info(),
                from: ctx.accounts.user_shares_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, shares)?;

        // 3. Transfer Assets to User
        let seeds = &[b"vault".as_ref(), &[vault_bump]];
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

        // 4. Update State (Re-borrow)
        let vault = &mut ctx.accounts.vault;
        vault.total_shares -= shares;
        vault.managed_assets = vault.managed_assets.checked_sub(amount_out).unwrap();

        Ok(())
    }
    
    // Admin function to inject yield (simulating harvest)
    pub fn harvest_yield(ctx: Context<HarvestYield>, amount: u64) -> Result<()> {
         let vault = &mut ctx.accounts.vault;
         require!(ctx.accounts.admin.key() == vault.admin, ErrorCode::Unauthorized);
         
         // In a real scenario, this would pull tokens from a reserve into the vault
         // For now, we assume tokens were sent to vault_token_account directly (donation/yield)
         // And we strictly update managed_assets to recognize them.
         
         vault.managed_assets += amount;
         Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init, 
        payer = admin, 
        space = 8 + 32 + 32 + 1 + 8 + 1 + 8 + 2, // Added base_mint pubkey
        seeds = [b"vault"],
        bump
    )]
    pub vault: Box<Account<'info, VaultState>>,
    pub base_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// NOTE: AddStablecoin removed in Single-Asset Parity Model

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Box<Account<'info, VaultState>>,
    
    #[account(mut)]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub jusdi_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub user_shares_account: Box<Account<'info, TokenAccount>>,
    
    pub base_mint: Box<Account<'info, Mint>>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Box<Account<'info, VaultState>>,
    
    #[account(mut)]
    pub jusdi_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub user_shares_account: Box<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct HarvestYield<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    pub admin: Signer<'info>,
}

#[account]
pub struct VaultState {
    pub admin: Pubkey,
    pub base_mint: Pubkey,
    pub is_paused: bool,
    pub total_shares: u64,
    pub bump: u8,
    /// SECURITY: Internally tracked assets (Principal + Yield)
    pub managed_assets: u64,
    /// Target liquid buffer in BPS (e.g., 1000 = 10%)
    pub liquid_buffer_bps: u16,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The vault is currently paused")]
    VaultPaused,
    #[msg("Asset does not match vault base asset")]
    InvalidAsset,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
}
