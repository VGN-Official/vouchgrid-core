import { Redis } from '@upstash/redis';

// Hardened check to ensure the serverless engine has connection variables configured
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  console.warn(
    "[VouchGrid DB Warning]: Missing Redis Environment variables. " +
    "Ensure KV_REST_API_URL and KV_REST_API_TOKEN are set in your Vercel Dashboard."
  );
}

// Instantiate the single global connection manager for your serverless tasks
export const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

/**
 * Global utility helpers for handling the VouchGrid Merchant Registry
 */
export const db = {
  /**
   * Fetches a clean merchant profile record from the ledger
   */
  async getMerchant(username: string) {
    const key = `merchant:${username.toLowerCase().trim()}`;
    return await redis.get<{
      username: string;
      currentStatus: string;
      vouchesCount: number;
      requiredVouches: number;
    }>(key);
  },

  /**
   * Saves or updates a merchant profile record in the ledger
   */
  async setMerchant(username: string, data: any) {
    const key = `merchant:${username.toLowerCase().trim()}`;
    return await redis.set(key, data);
  }
};

