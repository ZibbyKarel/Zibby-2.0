import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseUsageHeaders, type Usage } from './parse-headers';

const execFileP = promisify(execFile);

const KEYCHAIN_SERVICE = 'Claude Code-credentials';
const API_URL = 'https://api.anthropic.com/v1/messages';
const OAUTH_BETA = 'oauth-2025-04-20';
const ANTHROPIC_VERSION = '2023-06-01';

async function readOauthTokenFromKeychain(): Promise<string | null> {
  if (process.platform !== 'darwin') return null;
  try {
    const { stdout } = await execFileP('security', [
      'find-generic-password',
      '-s',
      KEYCHAIN_SERVICE,
      '-w',
    ]);
    const parsed = JSON.parse(stdout.trim()) as { claudeAiOauth?: { accessToken?: string } };
    return parsed.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

export type FetchUsageOptions = {
  /** Override for tests. */
  getToken?: () => Promise<string | null>;
  /** Override for tests. */
  fetchImpl?: typeof fetch;
  /** Abort the underlying network call. */
  signal?: AbortSignal;
};

export async function fetchUsage(options: FetchUsageOptions = {}): Promise<Usage | null> {
  const getToken = options.getToken ?? readOauthTokenFromKeychain;
  const fetchImpl = options.fetchImpl ?? fetch;

  const token = await getToken();
  if (!token) return null;

  const res = await fetchImpl(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': OAUTH_BETA,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
    signal: options.signal,
  });

  // Drain the body to release the socket, even if we only care about headers.
  try {
    await res.arrayBuffer();
  } catch {
    /* ignore */
  }

  if (!res.ok && res.status !== 429) return null;
  return parseUsageHeaders(res.headers);
}
