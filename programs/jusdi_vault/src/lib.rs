use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

declare_id!("2HJod3PNRNfYzzgZHVM5TjCoZrFGJjPmYkRkUeJMKw9o");

/// Maximum number of supported assets in the vault
pub const MAX_ASSETS: usize = 4;

#[program]
pub mod jusdi_vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>, liquid_buffer_bps: u16) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.admin = ctx.accounts.admin.key();
        vault.base_mint = ctx.accounts.base_mint.key();
        vault.is_paused = false;
        vault.total_shares = 0;
        vault.bump = ctx.bumps.vault;
        vault.managed_assets = 0;
        vault.liquid_buffer_bps = liquid_buffer_bps;
        vault.asset_count = 0;
        vault.total_value_usd = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
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

        // 4. Update State
        let vault = &mut ctx.accounts.vault;
        vault.total_shares += shares_to_mint;
        vault.managed_assets += amount;
        
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        let (vault_bump, total_shares, total_assets) = {
            let vault = &ctx.accounts.vault;
            require!(!vault.is_paused, ErrorCode::VaultPaused);
            (vault.bump, vault.total_shares, vault.managed_assets)
        };

        require!(shares <= total_shares, ErrorCode::InsufficientFunds);
        
        let amount_out = (shares as u128)
            .checked_mul(total_assets as u128).unwrap()
            .checked_div(total_shares as u128).unwrap() as u64;

        // Burn shares
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.jusdi_mint.to_account_info(),
                from: ctx.accounts.user_shares_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, shares)?;

        // Transfer assets
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

        // Update state
        let vault = &mut ctx.accounts.vault;
        vault.total_shares -= shares;
        vault.managed_assets = vault.managed_assets.checked_sub(amount_out).unwrap();

        Ok(())
    }
    
    /// DEPRECATED: Legacy admin harvest function removed for security
    /// Use harvest_from_strategy instead which verifies yield via MockStrategy
    /// If you need emergency yield injection, deploy a new strategy
    // pub fn harvest_yield(...) - REMOVED: See security audit H-2

    // ═══════════════════════════════════════════════════════════════════════════════
    // STRATEGY INSTRUCTIONS (Mock Strategy for Yield Generation)
    // ═══════════════════════════════════════════════════════════════════════════════

    /// Initialize a mock strategy for testing yield generation
    pub fn initialize_mock_strategy(
        ctx: Context<InitializeMockStrategy>,
        simulated_apy_bps: u16,
    ) -> Result<()> {
        let strategy = &mut ctx.accounts.mock_strategy;
        strategy.vault = ctx.accounts.vault.key();
        strategy.deployed_amount = 0;
        strategy.simulated_apy_bps = simulated_apy_bps;
        strategy.last_harvest = 0;
        strategy.bump = ctx.bumps.mock_strategy;
        Ok(())
    }

    /// Deploy funds from vault to strategy (admin only)
    pub fn deploy_to_strategy(ctx: Context<DeployToStrategy>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.vault.is_paused, ErrorCode::VaultPaused);
        let vault_bump = ctx.accounts.vault.bump;
        
        // Transfer tokens from vault to strategy account
        let seeds = &[b"vault".as_ref(), &[vault_bump]];
        let signer = &[&seeds[..]];
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.strategy_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;
        
        // Update strategy state
        let clock = Clock::get()?;
        let strategy = &mut ctx.accounts.mock_strategy;
        if strategy.deployed_amount == 0 {
            strategy.last_harvest = clock.unix_timestamp;
        }
        strategy.deployed_amount += amount;
        
        Ok(())
    }

    /// Recall funds from strategy back to vault (admin only)
    pub fn recall_from_strategy(ctx: Context<RecallFromStrategy>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.vault.is_paused, ErrorCode::VaultPaused);
        let vault_key = ctx.accounts.vault.key();
        let strategy_bump = ctx.accounts.mock_strategy.bump;
        let deployed_amount = ctx.accounts.mock_strategy.deployed_amount;
        
        require!(amount <= deployed_amount, ErrorCode::InsufficientFunds);
        
        let strategy_seeds = &[
            b"mock_strategy".as_ref(),
            vault_key.as_ref(),
            &[strategy_bump],
        ];
        let strategy_signer = &[&strategy_seeds[..]];
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.strategy_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.mock_strategy.to_account_info(),
                },
                strategy_signer,
            ),
            amount,
        )?;
        
        let strategy = &mut ctx.accounts.mock_strategy;
        strategy.deployed_amount -= amount;
        
        Ok(())
    }

    /// Harvest pending yield from strategy (permissionless crank)
    pub fn harvest_from_strategy(ctx: Context<HarvestFromStrategy>) -> Result<()> {
        let clock = Clock::get()?;
        let pending_yield = ctx.accounts.mock_strategy.calculate_pending_yield(clock.unix_timestamp);
        
        if pending_yield > 0 {
            let vault = &mut ctx.accounts.vault;
            let strategy = &mut ctx.accounts.mock_strategy;
            
            vault.managed_assets += pending_yield;
            strategy.last_harvest = clock.unix_timestamp;
        }
        
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MULTI-ASSET INSTRUCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════

    /// Add a new supported stablecoin to the vault (admin only)
    pub fn add_supported_asset(
        ctx: Context<AddSupportedAsset>,
        pyth_price_feed: Pubkey,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.asset_count < MAX_ASSETS as u8, ErrorCode::MaxAssetsReached);
        
        let asset = &mut ctx.accounts.asset_config;
        asset.vault = vault.key();
        asset.mint = ctx.accounts.mint.key();
        asset.decimals = ctx.accounts.mint.decimals;
        asset.pyth_price_feed = pyth_price_feed;
        asset.is_active = true;
        asset.total_deposited = 0;
        asset.bump = ctx.bumps.asset_config;
        
        vault.asset_count += 1;
        
        Ok(())
    }

    /// Deposit any supported asset using oracle price for share calculation
    pub fn deposit_multi(ctx: Context<DepositMulti>, amount: u64) -> Result<()> {
        // Verify asset is active
        require!(ctx.accounts.asset_config.is_active, ErrorCode::AssetNotActive);
        
        let (vault_bump, total_shares, total_value_usd) = {
            let vault = &ctx.accounts.vault;
            require!(!vault.is_paused, ErrorCode::VaultPaused);
            (vault.bump, vault.total_shares, vault.total_value_usd)
        };

        // 1. Transfer tokens from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            amount,
        )?;

        // 2. Get price from Pyth oracle (simplified: for stablecoins, use 1:1 USD peg)
        // In production, you'd read from ctx.accounts.price_update
        let decimals = ctx.accounts.asset_config.decimals;
        let deposit_value_usd = amount; // Assuming stablecoin 1:1 with 6 decimals
        
        // Normalize to 6 decimals if different
        let normalized_value = if decimals > 6 {
            deposit_value_usd / 10u64.pow((decimals - 6) as u32)
        } else if decimals < 6 {
            deposit_value_usd * 10u64.pow((6 - decimals) as u32)
        } else {
            deposit_value_usd
        };

        // 3. Calculate shares based on total vault value
        let shares_to_mint = if total_shares == 0 || total_value_usd == 0 {
            normalized_value
        } else {
            (normalized_value as u128)
                .checked_mul(total_shares as u128).unwrap()
                .checked_div(total_value_usd as u128).unwrap() as u64
        };
        
        // 4. Mint shares
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

        // 5. Update state
        let vault = &mut ctx.accounts.vault;
        vault.total_shares += shares_to_mint;
        vault.total_value_usd += normalized_value;
        vault.managed_assets += normalized_value;
        
        let asset = &mut ctx.accounts.asset_config;
        asset.total_deposited += amount;
        
        Ok(())
    }

    /// Toggle asset active status (admin only)
    pub fn set_asset_active(ctx: Context<SetAssetActive>, is_active: bool) -> Result<()> {
        ctx.accounts.asset_config.is_active = is_active;
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // REBALANCING INSTRUCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════

    /// Swap assets for rebalancing (admin/keeper only)
    /// 
    /// This is a "trusted swap" pattern where:
    /// 1. Admin/keeper calculates optimal swap route offline (via Jupiter API)
    /// 2. Admin provides expected min_amount_out for slippage protection
    /// 3. Vault transfers tokens for swap and receives swapped tokens back
    /// 
    /// NOTE: In production, this would CPI to Jupiter or another DEX aggregator.
    /// For V1, we use a simplified pattern where admin provides the swapped tokens.
    pub fn swap_assets(
        ctx: Context<SwapAssets>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        let vault_bump = ctx.accounts.vault.bump;
        
        // 1. Transfer tokens FROM vault to admin (for swap execution)
        let seeds = &[b"vault".as_ref(), &[vault_bump]];
        let signer = &[&seeds[..]];
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_in.to_account_info(),
                    to: ctx.accounts.admin_token_in.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            amount_in,
        )?;
        
        // 2. Reload account to get fresh balance (prevents TOCTOU race - C-4 fix)
        ctx.accounts.admin_token_out.reload()?;
        let admin_out_balance = ctx.accounts.admin_token_out.amount;
        require!(admin_out_balance >= min_amount_out, ErrorCode::InsufficientSwapOutput);
        
        // 3. Transfer swapped tokens FROM admin to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.admin_token_out.to_account_info(),
                    to: ctx.accounts.vault_token_out.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            min_amount_out,
        )?;
        
        // 4. Update asset tracking (using checked_sub for accounting accuracy - M-2 fix)
        let asset_in = &mut ctx.accounts.asset_in;
        let asset_out = &mut ctx.accounts.asset_out;
        
        asset_in.total_deposited = asset_in.total_deposited
            .checked_sub(amount_in)
            .ok_or(ErrorCode::InsufficientFunds)?;
        asset_out.total_deposited += min_amount_out;
        
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init, 
        payer = admin, 
        space = 8 + VaultState::SPACE,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Box<Account<'info, VaultState>>,
    pub base_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Box<Account<'info, VaultState>>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == vault.base_mint
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault.key(),
        constraint = vault_token_account.mint == vault.base_mint
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        constraint = jusdi_mint.mint_authority.unwrap() == vault.key()
    )]
    pub jusdi_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        constraint = user_shares_account.owner == user.key(),
        constraint = user_shares_account.mint == jusdi_mint.key()
    )]
    pub user_shares_account: Box<Account<'info, TokenAccount>>,
    
    pub base_mint: Box<Account<'info, Mint>>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Box<Account<'info, VaultState>>,
    
    #[account(
        mut,
        constraint = jusdi_mint.mint_authority.unwrap() == vault.key()
    )]
    pub jusdi_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        constraint = user_shares_account.owner == user.key(),
        constraint = user_shares_account.mint == jusdi_mint.key()
    )]
    pub user_shares_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        constraint = vault_token_account.owner == vault.key(),
        constraint = vault_token_account.mint == vault.base_mint
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == vault.base_mint
    )]
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

#[derive(Accounts)]
pub struct InitializeMockStrategy<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + MockStrategy::SPACE,
        seeds = [b"mock_strategy", vault.key().as_ref()],
        bump
    )]
    pub mock_strategy: Account<'info, MockStrategy>,
    
    #[account(seeds = [b"vault"], bump = vault.bump, has_one = admin)]
    pub vault: Account<'info, VaultState>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeployToStrategy<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump, has_one = admin)]
    pub vault: Account<'info, VaultState>,
    
    #[account(
        mut, 
        seeds = [b"mock_strategy", vault.key().as_ref()],
        bump = mock_strategy.bump,
        constraint = mock_strategy.vault == vault.key()
    )]
    pub mock_strategy: Account<'info, MockStrategy>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub strategy_token_account: Account<'info, TokenAccount>,
    
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RecallFromStrategy<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump, has_one = admin)]
    pub vault: Account<'info, VaultState>,
    
    #[account(
        mut,
        seeds = [b"mock_strategy", vault.key().as_ref()],
        bump = mock_strategy.bump,
        constraint = mock_strategy.vault == vault.key()
    )]
    pub mock_strategy: Account<'info, MockStrategy>,
    
    #[account(mut)]
    pub strategy_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct HarvestFromStrategy<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    
    #[account(
        mut,
        seeds = [b"mock_strategy", vault.key().as_ref()],
        bump = mock_strategy.bump,
        constraint = mock_strategy.vault == vault.key()
    )]
    pub mock_strategy: Account<'info, MockStrategy>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-ASSET ACCOUNT CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct AddSupportedAsset<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump, has_one = admin)]
    pub vault: Account<'info, VaultState>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + AssetConfig::SPACE,
        seeds = [b"asset_config", vault.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub asset_config: Account<'info, AssetConfig>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositMulti<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Box<Account<'info, VaultState>>,
    
    #[account(
        mut,
        seeds = [b"asset_config", vault.key().as_ref(), mint.key().as_ref()],
        bump = asset_config.bump,
        constraint = asset_config.vault == vault.key(),
        constraint = asset_config.mint == mint.key()
    )]
    pub asset_config: Account<'info, AssetConfig>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == mint.key()
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault.key(),
        constraint = vault_token_account.mint == mint.key()
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        mut,
        constraint = jusdi_mint.mint_authority.unwrap() == vault.key()
    )]
    pub jusdi_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        constraint = user_shares_account.owner == user.key(),
        constraint = user_shares_account.mint == jusdi_mint.key()
    )]
    pub user_shares_account: Box<Account<'info, TokenAccount>>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetAssetActive<'info> {
    #[account(seeds = [b"vault"], bump = vault.bump, has_one = admin)]
    pub vault: Account<'info, VaultState>,
    
    #[account(
        mut,
        seeds = [b"asset_config", vault.key().as_ref(), asset_config.mint.as_ref()],
        bump = asset_config.bump,
        constraint = asset_config.vault == vault.key()
    )]
    pub asset_config: Account<'info, AssetConfig>,
    
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct SwapAssets<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump, has_one = admin)]
    pub vault: Account<'info, VaultState>,
    
    // Asset being sold
    #[account(
        mut,
        seeds = [b"asset_config", vault.key().as_ref(), mint_in.key().as_ref()],
        bump = asset_in.bump,
        constraint = asset_in.vault == vault.key()
    )]
    pub asset_in: Account<'info, AssetConfig>,
    pub mint_in: Account<'info, Mint>,
    
    // Asset being bought
    #[account(
        mut,
        seeds = [b"asset_config", vault.key().as_ref(), mint_out.key().as_ref()],
        bump = asset_out.bump,
        constraint = asset_out.vault == vault.key()
    )]
    pub asset_out: Account<'info, AssetConfig>,
    pub mint_out: Account<'info, Mint>,
    
    // Vault token accounts
    #[account(mut)]
    pub vault_token_in: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_out: Account<'info, TokenAccount>,
    
    // Admin token accounts (for swap execution)
    #[account(mut)]
    pub admin_token_in: Account<'info, TokenAccount>,
    #[account(mut)]
    pub admin_token_out: Account<'info, TokenAccount>,
    
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════

#[account]
pub struct VaultState {
    pub admin: Pubkey,
    pub base_mint: Pubkey,         // Primary asset (USDC)
    pub is_paused: bool,
    pub total_shares: u64,
    pub bump: u8,
    pub managed_assets: u64,       // Total value in base asset units (e.g., USDC decimals)
    pub liquid_buffer_bps: u16,
    pub asset_count: u8,           // Number of supported assets
    pub total_value_usd: u64,      // Cached total USD value (updated on deposit/withdraw)
}

impl VaultState {
    // admin(32) + base_mint(32) + is_paused(1) + total_shares(8) + bump(1) + 
    // managed_assets(8) + liquid_buffer_bps(2) + asset_count(1) + total_value_usd(8)
    pub const SPACE: usize = 32 + 32 + 1 + 8 + 1 + 8 + 2 + 1 + 8;
}

/// Configuration for a supported asset in the vault
#[account]
pub struct AssetConfig {
    pub vault: Pubkey,             // Parent vault
    pub mint: Pubkey,              // Token mint address
    pub decimals: u8,              // Token decimals (6 for USDC/USDT)
    pub pyth_price_feed: Pubkey,   // Pyth price feed account
    pub is_active: bool,           // Whether deposits are accepted
    pub total_deposited: u64,      // Raw amount deposited in this asset
    pub bump: u8,
}

impl AssetConfig {
    // vault(32) + mint(32) + decimals(1) + pyth_price_feed(32) + is_active(1) + total_deposited(8) + bump(1)
    pub const SPACE: usize = 32 + 32 + 1 + 32 + 1 + 8 + 1;
}

/// Mock strategy for testing yield generation
#[account]
pub struct MockStrategy {
    pub vault: Pubkey,
    pub deployed_amount: u64,
    pub simulated_apy_bps: u16,
    pub last_harvest: i64,
    pub bump: u8,
}

impl MockStrategy {
    pub const SPACE: usize = 32 + 8 + 2 + 8 + 1;
    
    /// Calculate simulated yield based on time elapsed
    pub fn calculate_pending_yield(&self, current_timestamp: i64) -> u64 {
        if self.deployed_amount == 0 || self.last_harvest == 0 {
            return 0;
        }
        
        let seconds_elapsed = (current_timestamp - self.last_harvest) as u64;
        let seconds_per_year: u64 = 365 * 24 * 60 * 60;
        
        (self.deployed_amount as u128)
            .checked_mul(self.simulated_apy_bps as u128).unwrap()
            .checked_mul(seconds_elapsed as u128).unwrap()
            .checked_div(10000u128).unwrap()
            .checked_div(seconds_per_year as u128).unwrap() as u64
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum ErrorCode {
    #[msg("The vault is currently paused")]
    VaultPaused,
    #[msg("Asset is not supported by this vault")]
    InvalidAsset,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
    #[msg("Maximum number of assets reached")]
    MaxAssetsReached,
    #[msg("Asset is not active for deposits")]
    AssetNotActive,
    #[msg("Invalid oracle price")]
    InvalidOraclePrice,
    #[msg("Oracle price is stale")]
    StaleOraclePrice,
    #[msg("Insufficient swap output amount")]
    InsufficientSwapOutput,
}
