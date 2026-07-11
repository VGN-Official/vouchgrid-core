import { Redis } from '@upstash/redis';

// Tell TypeScript that process is a global object containing env
declare const process: { env: { [key: string]: string | undefined } };

const url: string = process.env.KV_REST_API_URL || '';
const token: string = process.env.KV_REST_API_TOKEN || '';

export const redis = url && token 
  ? new Redis({ url, token }) 
  : ({
      get: async (key: string) => { 
        console.error("Redis URL/Token missing in environment variables.", key); 
        return null; 
      }
    } as unknown as Redis);