import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env variables with override for test environment
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

if (typeof jest !== 'undefined') {
  jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(() => Promise.resolve(null)),
    setItemAsync: jest.fn(() => Promise.resolve()),
    deleteItemAsync: jest.fn(() => Promise.resolve()),
  }));

  jest.mock('react-native', () => ({
    Platform: {
      OS: 'android',
      select: jest.fn((dict: Record<string, unknown>) => dict.android || dict.default),
    },
  }));
}

import ws from 'ws';

// Provide real WebSocket implementation for live Supabase Realtime in Node.js test environment
const globalObj = globalThis as unknown as { WebSocket?: unknown };
globalObj.WebSocket = ws;

