import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import type { DeviceFlowResponse, AuthStatus } from '../types';

let cachedToken: string | null = null;
let userDataPath: string = '';

export function initAuth(appUserDataPath: string): void {
  userDataPath = appUserDataPath;
}

function getTokenFilePath(): string {
  return path.join(userDataPath, 'token.enc');
}

/**
 * Initiate GitHub Device Flow (OAuth 2.0 Device Authorization Grant).
 */
export async function startDeviceFlow(clientId: string): Promise<DeviceFlowResponse> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: 'repo',
    }),
  });

  if (!response.ok) {
    throw new Error(`Device flow initiation failed: ${response.statusText}`);
  }

  return (await response.json()) as DeviceFlowResponse;
}

/**
 * Poll for the access token during device flow.
 */
export async function pollForToken(
  clientId: string,
  deviceCode: string,
  interval: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const poll = setInterval(async () => {
      try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });

        const data = await response.json() as Record<string, string>;

        if (data.access_token) {
          clearInterval(poll);
          await encryptAndStoreToken(data.access_token);
          resolve(data.access_token);
        } else if (data.error === 'expired_token') {
          clearInterval(poll);
          reject(new Error('Device code expired. Please try again.'));
        } else if (data.error === 'access_denied') {
          clearInterval(poll);
          reject(new Error('Authorization was denied by the user.'));
        }
        // authorization_pending or slow_down: just continue polling
      } catch (err) {
        clearInterval(poll);
        reject(err);
      }
    }, (interval + 1) * 1000); // +1 second buffer to avoid rate limits
  });
}

/**
 * Encrypt and persist the token using OS-level cryptography.
 */
async function encryptAndStoreToken(token: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback: store in memory only (less secure)
    cachedToken = token;
    console.warn('OS-level encryption not available. Token stored in memory only.');
    return;
  }

  const encrypted = safeStorage.encryptString(token);
  fs.writeFileSync(getTokenFilePath(), encrypted);
  cachedToken = token;
}

/**
 * Retrieve the decrypted token from storage.
 */
export function getToken(): string | null {
  if (cachedToken) return cachedToken;

  const tokenPath = getTokenFilePath();
  if (!fs.existsSync(tokenPath)) return null;

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = fs.readFileSync(tokenPath);
      cachedToken = safeStorage.decryptString(encrypted);
      return cachedToken;
    }
  } catch {
    console.error('Failed to decrypt stored token');
  }
  return null;
}

/**
 * Validate the current token with GitHub API.
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  const token = getToken();
  if (!token) return { authenticated: false };

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) {
      const user = await response.json() as { login: string; avatar_url: string };
      return {
        authenticated: true,
        username: user.login,
        avatarUrl: user.avatar_url,
      };
    }
  } catch {
    // Token invalid or network error
  }

  return { authenticated: false };
}

/**
 * Clear stored token and cached value.
 */
export function logout(): void {
  cachedToken = null;
  const tokenPath = getTokenFilePath();
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
}
