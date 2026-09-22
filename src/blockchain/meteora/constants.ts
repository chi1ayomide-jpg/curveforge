import {
  DYNAMIC_BONDING_CURVE_PROGRAM_ID as SDK_DBC_PROGRAM_ID,
  DAMM_V2_PROGRAM_ID as SDK_DAMM_V2_PROGRAM_ID,
  LOCKER_PROGRAM_ID as SDK_LOCKER_PROGRAM_ID,
} from '@meteora-ag/dynamic-bonding-curve-sdk';

/**
 * Meteora Dynamic Bonding Curve Protocol Program Addresses
 * Verified against @meteora-ag/dynamic-bonding-curve-sdk v1.5.12
 */

// Dynamic Bonding Curve Program ID: dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
export const METEORA_DBC_PROGRAM_ID = SDK_DBC_PROGRAM_ID;
export const METEORA_DBC_PROGRAM_ID_STRING = SDK_DBC_PROGRAM_ID.toBase58();
export const DYNAMIC_BONDING_CURVE_PROGRAM_ID = METEORA_DBC_PROGRAM_ID_STRING;

// Meteora DAMM v2 CP-Swap Program ID: cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG
export const METEORA_DAMM_V2_PROGRAM_ID = SDK_DAMM_V2_PROGRAM_ID;
export const METEORA_DAMM_V2_PROGRAM_ID_STRING = SDK_DAMM_V2_PROGRAM_ID.toBase58();
export const DAMM_V2_PROGRAM_ID = METEORA_DAMM_V2_PROGRAM_ID_STRING;

// Meteora Liquidity Locker Program ID: LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn
export const METEORA_LOCKER_PROGRAM_ID = SDK_LOCKER_PROGRAM_ID;
export const METEORA_LOCKER_PROGRAM_ID_STRING = SDK_LOCKER_PROGRAM_ID.toBase58();
export const LOCKER_PROGRAM_ID = METEORA_LOCKER_PROGRAM_ID_STRING;

/**
 * Canonical Network Addresses
 */
export const NETWORK_PROGRAM_IDS = {
  devnet: {
    dbc: METEORA_DBC_PROGRAM_ID_STRING,
    dammV2: METEORA_DAMM_V2_PROGRAM_ID_STRING,
    locker: METEORA_LOCKER_PROGRAM_ID_STRING,
  },
  'mainnet-beta': {
    dbc: METEORA_DBC_PROGRAM_ID_STRING,
    dammV2: METEORA_DAMM_V2_PROGRAM_ID_STRING,
    locker: METEORA_LOCKER_PROGRAM_ID_STRING,
  },
};
