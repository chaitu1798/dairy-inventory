import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import nodeFetch from 'node-fetch';
import https from 'https';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)?.trim();

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Key');
}

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutMs = Number.parseInt(process.env.SUPABASE_FETCH_TIMEOUT_MS || '8000', 10);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await nodeFetch(input as any, {
            ...(init as any),
            signal: init?.signal ?? controller.signal,
            agent: ipv4Agent,
        });
        return response as unknown as Response;
    } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('The user aborted a request')) {
            throw new Error(`Supabase request timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        fetch: fetchWithTimeout as typeof fetch,
    },
});
