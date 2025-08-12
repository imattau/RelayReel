import React, { useEffect, useState } from 'react';
import useAuth from '../../features/auth/useAuth';
import useRemoteSigner from '../../features/auth/useRemoteSigner';

/**
 * Authentication panel allowing users to connect via NIP-07 extension
 * or a remote NIP-46 signer. Displays current status and
 * provides fallback messaging when no extension is available.
 */
export default function AuthPanel() {
  const { pubkey, method, login, logout } = useAuth();
  const { connectRemote, disconnect } = useRemoteSigner();

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasExtension, setHasExtension] = useState(true);

  useEffect(() => {
    const nostr = (globalThis as any).nostr;
    if (!nostr || typeof nostr.getPublicKey !== 'function') {
      setHasExtension(false);
    }
  }, []);

  async function handleConnect() {
    try {
      setError(null);
      await login();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRemoteConnect() {
    try {
      setError(null);
      await connectRemote(input);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDisconnect() {
    setError(null);
    if (method === 'nip46') {
      await disconnect();
    } else {
      logout();
    }
  }

  const status = pubkey
    ? `Connected via ${method ?? 'unknown'} (${pubkey.slice(0, 8)}...)`
    : 'Not connected';

  return (
    <div className="flex flex-col gap-2 p-4 text-sm text-white">
      <span data-testid="status">{status}</span>
      {error && (
        <div role="alert" className="text-red-500">
          {error}
        </div>
      )}
      {!pubkey && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleConnect}
            className="rounded bg-blue-500 px-2 py-1"
          >
            Connect
          </button>
          {!hasExtension && (
            <span className="text-yellow-400">
              Nostr extension not detected. You can use a remote signer.
            </span>
          )}
          <div className="flex flex-row gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="bunker://..."
              className="flex-grow rounded bg-gray-800 p-1"
            />
            <button
              type="button"
              onClick={handleRemoteConnect}
              className="rounded bg-green-600 px-2 py-1"
            >
              Connect Remote
            </button>
          </div>
        </div>
      )}
      {pubkey && (
        <button
          type="button"
          onClick={handleDisconnect}
          className="mt-2 rounded bg-red-500 px-2 py-1"
        >
          Disconnect
        </button>
      )}
    </div>
  );
}

