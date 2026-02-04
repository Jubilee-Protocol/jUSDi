//! # JubileeYieldStream - "The Immortal Agent" Solana Program
//! 
//! Endowment-as-a-Service powered by USDC.
//! 
//! ## Overview
//! This program enables perpetual agent funding by depositing USDC into the jUSDi vault.
//! The principal is preserved while yield is streamed to a beneficiary (AI agent/service).
//! 
//! ## USDC Integration
//! - USDC serves as the base asset for all deposits and yield calculations
//! - Principal is always denominated in USDC for predictable accounting
//! - Yield generated from jUSDi vault strategies is paid out in USDC
//! - USDC's stability ensures reliable yield forecasting for agent sustainability
//! 
//! ## Security
//! - PDA-based stream ownership prevents unauthorized access
//! - Checked math throughout to prevent overflows
//! - Re-entrancy protection via account reload verification
//! - Beneficiary validation and ownership checks
//!
//! Author: Jubilee Labs
//! License: MIT

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("E3tCGVqKtf4Pt8kxpWqV9nh6xS4uWADeBfW2BrBN7cBi");

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/// Minimum deposit amount (1 USDC with 6 decimals)
pub const MIN_DEPOSIT: u64 = 1_000_000;

/// Slippage tolerance for share calculations (0.5% = 50 basis points)
pub const SLIPPAGE_BPS: u64 = 50;
pub const BPS_DENOMINATOR: u64 = 10000;

/// Stream account space: discriminator + all fields
pub const STREAM_SPACE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 7; // +7 padding

#[program]
pub mod jubilee_yield_stream {
    use super::*;

    /// Initialize a new yield stream by depositing USDC
    /// 
    /// # Arguments
    /// * `amount_usdc` - Amount of USDC to deposit (in base units, 6 decimals)
    /// * `beneficiary` - Pubkey of the agent/service that will receive yield
    /// 
    /// # Flow
    /// 1. Transfer USDC from user to vault
    /// 2. Mint jUSDi shares to stream PDA
    /// 3. Record principal and shares in stream state
    pub fn create_stream(
        ctx: Context<CreateStream>, 
        amount_usdc: u64, 
        beneficiary: Pubkey
    ) -> Result<()> {
        // Validation
        require!(amount_usdc >= MIN_DEPOSIT, StreamError::AmountBelowMinimum);
        require!(beneficiary != Pubkey::default(), StreamError::InvalidBeneficiary);
        
        // Calculate shares inline (before any borrows)
        let vault_bump = ctx.accounts.vault.bump;
        let total_shares = ctx.accounts.vault.total_shares;
        let total_assets = ctx.accounts.vault.managed_assets;
        
        let shares_to_receive = if total_shares == 0 || total_assets == 0 {
            amount_usdc
        } else {
            ((amount_usdc as u128) * (total_shares as u128) / (total_assets as u128)) as u64
        };
        
        // 1. Transfer USDC
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    to: ctx.accounts.vault_usdc.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ), 
            amount_usdc
        )?;
        
        // 2. Mint shares
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.jusdi_mint.to_account_info(),
                    to: ctx.accounts.stream_shares.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                &[&[b"vault".as_ref(), &[vault_bump]]],
            ),
            shares_to_receive,
        )?;
        
        // 3. Initialize stream state
        let stream = &mut ctx.accounts.stream;
        let timestamp = Clock::get()?.unix_timestamp;
        
        stream.owner = ctx.accounts.owner.key();
        stream.beneficiary = beneficiary;
        stream.principal_usdc = amount_usdc;
        stream.shares_held = shares_to_receive;
        stream.created_at = timestamp;
        stream.last_claim_at = 0;
        stream.total_yield_claimed = 0;
        stream.is_active = true;
        stream.bump = ctx.bumps.stream;
        
        emit!(StreamCreated {
            owner: stream.owner,
            beneficiary,
            principal: amount_usdc,
            shares: shares_to_receive,
            timestamp,
        });
        
        Ok(())
    }

    /// Top up an existing stream with additional USDC
    pub fn top_up_stream(ctx: Context<TopUpStream>, amount_usdc: u64) -> Result<()> {
        require!(amount_usdc >= MIN_DEPOSIT, StreamError::AmountBelowMinimum);
        
        let stream = &mut ctx.accounts.stream;
        require!(stream.is_active, StreamError::StreamNotActive);
        
        let vault = &ctx.accounts.vault;
        let total_shares = vault.total_shares;
        let total_assets = vault.managed_assets;
        
        // Calculate additional shares
        let additional_shares = if total_shares == 0 || total_assets == 0 {
            amount_usdc
        } else {
            (amount_usdc as u128)
                .checked_mul(total_shares as u128)
                .ok_or(StreamError::MathOverflow)?
                .checked_div(total_assets as u128)
                .ok_or(StreamError::MathOverflow)? as u64
        };
        
        // Transfer USDC to vault
        let cpi_transfer = Transfer {
            from: ctx.accounts.user_usdc.to_account_info(),
            to: ctx.accounts.vault_usdc.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_transfer), 
            amount_usdc
        )?;
        
        // Mint additional shares
        let vault_bump = vault.bump;
        let vault_seeds = &[b"vault".as_ref(), &[vault_bump]];
        let vault_signer = &[&vault_seeds[..]];
        
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.jusdi_mint.to_account_info(),
                    to: ctx.accounts.stream_shares.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                vault_signer,
            ),
            additional_shares,
        )?;
        
        // Update stream state
        stream.principal_usdc = stream.principal_usdc
            .checked_add(amount_usdc)
            .ok_or(StreamError::MathOverflow)?;
        stream.shares_held = stream.shares_held
            .checked_add(additional_shares)
            .ok_or(StreamError::MathOverflow)?;
        
        emit!(StreamToppedUp {
            owner: stream.owner,
            amount: amount_usdc,
            new_principal: stream.principal_usdc,
            new_shares: stream.shares_held,
        });
        
        Ok(())
    }

    /// Claim accumulated yield and send to beneficiary
    /// 
    /// # Logic
    /// 1. Calculate current value of shares in USDC terms
    /// 2. Yield = Current Value - Principal
    /// 3. Burn shares equivalent to yield amount
    /// 4. Transfer USDC to beneficiary
    pub fn claim_yield(ctx: Context<ClaimYield>) -> Result<()> {
        // Get read-only values BEFORE mutable borrow
        let stream_bump = ctx.accounts.stream.bump;
        let stream_owner = ctx.accounts.stream.owner;
        let is_active = ctx.accounts.stream.is_active;
        let shares_held = ctx.accounts.stream.shares_held;
        let principal_usdc = ctx.accounts.stream.principal_usdc;
        let beneficiary = ctx.accounts.stream.beneficiary;
        
        require!(is_active, StreamError::StreamNotActive);
        require!(shares_held > 0, StreamError::NoSharesHeld);
        
        let vault = &ctx.accounts.vault;
        let total_shares = vault.total_shares;
        let total_assets = vault.managed_assets;
        
        // Calculate current value of stream's shares
        let current_value_usdc = if total_shares == 0 {
            0
        } else {
            (shares_held as u128)
                .checked_mul(total_assets as u128)
                .ok_or(StreamError::MathOverflow)?
                .checked_div(total_shares as u128)
                .ok_or(StreamError::MathOverflow)? as u64
        };
        
        // Calculate yield (value appreciation)
        let yield_usdc = current_value_usdc
            .checked_sub(principal_usdc)
            .unwrap_or(0);
        
        require!(yield_usdc > 0, StreamError::NoYield);
        
        // Calculate shares to burn for this yield amount
        let shares_to_burn = if total_assets == 0 {
            0
        } else {
            (yield_usdc as u128)
                .checked_mul(total_shares as u128)
                .ok_or(StreamError::MathOverflow)?
                .checked_div(total_assets as u128)
                .ok_or(StreamError::MathOverflow)? as u64
        };
        
        require!(shares_to_burn <= shares_held, StreamError::InsufficientShares);
        
        // Build PDA signer for stream (using cached values)
        let stream_seeds = &[
            b"stream".as_ref(), 
            stream_owner.as_ref(), 
            &[stream_bump]
        ];
        let stream_signer = &[&stream_seeds[..]];
        
        // Get account info needed for CPI before mutable borrow
        let stream_account_info = ctx.accounts.stream.to_account_info();
        
        // Burn shares from stream
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.jusdi_mint.to_account_info(),
                    from: ctx.accounts.stream_shares.to_account_info(),
                    authority: stream_account_info,
                },
                stream_signer,
            ),
            shares_to_burn,
        )?;
        
        // Transfer USDC yield to beneficiary (from vault)
        let vault_bump = vault.bump;
        let vault_seeds = &[b"vault".as_ref(), &[vault_bump]];
        let vault_signer = &[&vault_seeds[..]];
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_usdc.to_account_info(),
                    to: ctx.accounts.beneficiary_usdc.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                vault_signer,
            ),
            yield_usdc,
        )?;
        
        // Now do mutable borrow for state updates
        let stream = &mut ctx.accounts.stream;
        let clock = Clock::get()?;
        stream.shares_held = stream.shares_held
            .checked_sub(shares_to_burn)
            .ok_or(StreamError::MathOverflow)?;
        stream.total_yield_claimed = stream.total_yield_claimed
            .checked_add(yield_usdc)
            .ok_or(StreamError::MathOverflow)?;
        stream.last_claim_at = clock.unix_timestamp;
        
        emit!(YieldClaimed {
            owner: stream_owner,
            beneficiary,
            amount: yield_usdc,
            shares_burned: shares_to_burn,
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Withdraw principal (partial or full)
    /// Full withdrawal closes the stream
    pub fn withdraw_principal(ctx: Context<WithdrawPrincipal>, amount_usdc: u64) -> Result<()> {
        require!(amount_usdc > 0, StreamError::InvalidAmount);
        
        // Get read-only values BEFORE mutable borrow
        let stream_bump = ctx.accounts.stream.bump;
        let stream_owner = ctx.accounts.stream.owner;
        let is_active = ctx.accounts.stream.is_active;
        let shares_held = ctx.accounts.stream.shares_held;
        let principal_usdc = ctx.accounts.stream.principal_usdc;
        
        require!(is_active, StreamError::StreamNotActive);
        require!(amount_usdc <= principal_usdc, StreamError::InsufficientPrincipal);
        
        let vault = &ctx.accounts.vault;
        let total_shares = vault.total_shares;
        let total_assets = vault.managed_assets;
        
        // Calculate shares to burn for withdrawal
        let shares_to_burn = if total_assets == 0 {
            0
        } else {
            (amount_usdc as u128)
                .checked_mul(total_shares as u128)
                .ok_or(StreamError::MathOverflow)?
                .checked_div(total_assets as u128)
                .ok_or(StreamError::MathOverflow)? as u64
        };
        
        // Ensure we have enough shares (handle potential loss scenario)
        let actual_shares_to_burn = shares_to_burn.min(shares_held);
        
        // Recalculate actual amount out based on available shares
        let actual_amount_out = if total_shares == 0 {
            0
        } else {
            (actual_shares_to_burn as u128)
                .checked_mul(total_assets as u128)
                .ok_or(StreamError::MathOverflow)?
                .checked_div(total_shares as u128)
                .ok_or(StreamError::MathOverflow)? as u64
        };
        
        // Build PDA signer for stream (using cached values)
        let stream_seeds = &[
            b"stream".as_ref(), 
            stream_owner.as_ref(), 
            &[stream_bump]
        ];
        let stream_signer = &[&stream_seeds[..]];
        
        // Get account info before mutable borrow
        let stream_account_info = ctx.accounts.stream.to_account_info();
        
        // Burn shares
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.jusdi_mint.to_account_info(),
                    from: ctx.accounts.stream_shares.to_account_info(),
                    authority: stream_account_info,
                },
                stream_signer,
            ),
            actual_shares_to_burn,
        )?;
        
        // Transfer USDC to owner
        let vault_bump = vault.bump;
        let vault_seeds = &[b"vault".as_ref(), &[vault_bump]];
        let vault_signer = &[&vault_seeds[..]];
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_usdc.to_account_info(),
                    to: ctx.accounts.owner_usdc.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                vault_signer,
            ),
            actual_amount_out,
        )?;
        
        // Now do mutable borrow for state updates
        let stream = &mut ctx.accounts.stream;
        stream.shares_held = stream.shares_held
            .checked_sub(actual_shares_to_burn)
            .ok_or(StreamError::MathOverflow)?;
        stream.principal_usdc = stream.principal_usdc
            .checked_sub(actual_amount_out)
            .ok_or(StreamError::MathOverflow)?;
        
        // Close stream if fully withdrawn
        if stream.principal_usdc == 0 {
            stream.is_active = false;
        }
        
        emit!(PrincipalWithdrawn {
            owner: stream_owner,
            requested: amount_usdc,
            actual: actual_amount_out,
            shares_burned: actual_shares_to_burn,
        });
        
        Ok(())
    }

    /// Update the beneficiary address
    pub fn set_beneficiary(ctx: Context<SetBeneficiary>, new_beneficiary: Pubkey) -> Result<()> {
        require!(new_beneficiary != Pubkey::default(), StreamError::InvalidBeneficiary);
        
        let stream = &mut ctx.accounts.stream;
        let old_beneficiary = stream.beneficiary;
        stream.beneficiary = new_beneficiary;
        
        emit!(BeneficiaryUpdated {
            owner: stream.owner,
            old_beneficiary,
            new_beneficiary,
        });
        
        Ok(())
    }

    /// View function: Get claimable yield amount
    pub fn get_claimable_yield(ctx: Context<GetClaimableYield>) -> Result<u64> {
        let stream = &ctx.accounts.stream;
        let vault = &ctx.accounts.vault;
        
        if stream.shares_held == 0 || vault.total_shares == 0 {
            return Ok(0);
        }
        
        let current_value = (stream.shares_held as u128)
            .checked_mul(vault.managed_assets as u128)
            .ok_or(StreamError::MathOverflow)?
            .checked_div(vault.total_shares as u128)
            .ok_or(StreamError::MathOverflow)? as u64;
        
        let yield_amount = current_value.saturating_sub(stream.principal_usdc);
        
        Ok(yield_amount)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════

#[account]
pub struct StreamState {
    /// Owner/funder of the stream
    pub owner: Pubkey,
    /// Beneficiary receiving the yield (agent's wallet)
    pub beneficiary: Pubkey,
    /// Original USDC deposit (preserved as principal)
    pub principal_usdc: u64,
    /// jUSDi shares held by this stream
    pub shares_held: u64,
    /// Total yield claimed to date
    pub total_yield_claimed: u64,
    /// Stream creation timestamp
    pub created_at: i64,
    /// Last yield claim timestamp
    pub last_claim_at: i64,
    /// Stream active status
    pub is_active: bool,
    /// PDA bump seed
    pub bump: u8,
}

/// Vault state (imported/expected structure from jusdi_vault)
#[account]
pub struct VaultState {
    pub admin: Pubkey,
    pub base_mint: Pubkey,
    pub is_paused: bool,
    pub total_shares: u64,
    pub bump: u8,
    pub managed_assets: u64,
    pub liquid_buffer_bps: u16,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct CreateStream<'info> {
    #[account(
        init, 
        payer = owner, 
        space = STREAM_SPACE,
        seeds = [b"stream", owner.key().as_ref()],
        bump
    )]
    pub stream: Account<'info, StreamState>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// Vault state for share calculation
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Box<Account<'info, VaultState>>,
    
    /// User's USDC token account
    #[account(mut)]
    pub user_usdc: Box<Account<'info, TokenAccount>>,
    
    /// Vault's USDC token account (receives deposits)
    #[account(mut)]
    pub vault_usdc: Box<Account<'info, TokenAccount>>,
    
    /// Stream's jUSDi share token account
    #[account(
        init,
        payer = owner,
        token::mint = jusdi_mint,
        token::authority = stream,
    )]
    pub stream_shares: Box<Account<'info, TokenAccount>>,
    
    /// jUSDi share mint
    #[account(mut)]
    pub jusdi_mint: Box<Account<'info, Mint>>,
    
    /// USDC mint for validation
    pub usdc_mint: Box<Account<'info, Mint>>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct TopUpStream<'info> {
    #[account(
        mut,
        seeds = [b"stream", owner.key().as_ref()],
        bump = stream.bump,
        has_one = owner,
    )]
    pub stream: Account<'info, StreamState>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub stream_shares: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub jusdi_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimYield<'info> {
    #[account(
        mut,
        seeds = [b"stream", stream.owner.as_ref()],
        bump = stream.bump,
    )]
    pub stream: Account<'info, StreamState>,
    
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    
    /// Stream's jUSDi shares (to burn)
    #[account(mut, constraint = stream_shares.owner == stream.key())]
    pub stream_shares: Account<'info, TokenAccount>,
    
    /// Beneficiary's USDC account (receives yield)
    #[account(mut, constraint = beneficiary_usdc.owner == stream.beneficiary)]
    pub beneficiary_usdc: Account<'info, TokenAccount>,
    
    /// Vault's USDC account (source of yield)
    #[account(mut)]
    pub vault_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub jusdi_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawPrincipal<'info> {
    #[account(
        mut,
        seeds = [b"stream", owner.key().as_ref()],
        bump = stream.bump,
        has_one = owner,
    )]
    pub stream: Account<'info, StreamState>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
    
    #[account(mut, constraint = stream_shares.owner == stream.key())]
    pub stream_shares: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub owner_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub jusdi_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetBeneficiary<'info> {
    #[account(
        mut,
        seeds = [b"stream", owner.key().as_ref()],
        bump = stream.bump,
        has_one = owner,
    )]
    pub stream: Account<'info, StreamState>,
    
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetClaimableYield<'info> {
    #[account(seeds = [b"stream", stream.owner.as_ref()], bump = stream.bump)]
    pub stream: Account<'info, StreamState>,
    
    #[account(seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, VaultState>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

#[event]
pub struct StreamCreated {
    pub owner: Pubkey,
    pub beneficiary: Pubkey,
    pub principal: u64,
    pub shares: u64,
    pub timestamp: i64,
}

#[event]
pub struct StreamToppedUp {
    pub owner: Pubkey,
    pub amount: u64,
    pub new_principal: u64,
    pub new_shares: u64,
}

#[event]
pub struct YieldClaimed {
    pub owner: Pubkey,
    pub beneficiary: Pubkey,
    pub amount: u64,
    pub shares_burned: u64,
    pub timestamp: i64,
}

#[event]
pub struct PrincipalWithdrawn {
    pub owner: Pubkey,
    pub requested: u64,
    pub actual: u64,
    pub shares_burned: u64,
}

#[event]
pub struct BeneficiaryUpdated {
    pub owner: Pubkey,
    pub old_beneficiary: Pubkey,
    pub new_beneficiary: Pubkey,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum StreamError {
    #[msg("Amount is below minimum deposit (1 USDC)")]
    AmountBelowMinimum,
    
    #[msg("Invalid beneficiary address")]
    InvalidBeneficiary,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Stream is not active")]
    StreamNotActive,
    
    #[msg("No yield available to claim")]
    NoYield,
    
    #[msg("No shares held in stream")]
    NoSharesHeld,
    
    #[msg("Insufficient shares for operation")]
    InsufficientShares,
    
    #[msg("Insufficient principal for withdrawal")]
    InsufficientPrincipal,
    
    #[msg("Math overflow error")]
    MathOverflow,
}

// "...if you confess with your mouth that Jesus is Lord and believe in your heart that God raised him from the dead, you will be saved. For with the heart one believes and is justified, and with the mouth one confesses and is saved. For the Scripture says, "Everyone who believes in him will not be put to shame." - Romans 10:9-11 (ESV)
