import { useCallback, useEffect, useRef, useState } from 'react';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import { generateSecretKey } from 'nostr-tools';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g) || [];
  return Uint8Array.from(matches.map((b) => parseInt(b, 16)));
}
import NostrService from '../../services/nostr';
import { useAuthStore } from './useAuth';

const SESSION_KEY = 'nip46-session';

export default function useRemoteSigner() {
  const [signer, setSigner] = useState<BunkerSigner>();
  const connectRef = useRef<Promise<string> | null>(null);

  // Restore previous session if available
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (!raw) return;
    const { input, secret } = JSON.parse(raw);

    (async () => {
      try {
        const bp = await parseBunkerInput(input);
        if (!bp) throw new Error('invalid bunker pointer');
        const pool = NostrService.getPool();
        const rs = new BunkerSigner(hexToBytes(secret), bp, { pool });
        await rs.connect();
        const pubkey = await rs.getPublicKey();
        useAuthStore.getState().setSigner(pubkey, rs, 'nip46');
        setSigner(rs);
      } catch (err) {
        localStorage.removeItem(SESSION_KEY);
        console.error('failed to restore NIP-46 session', err);
      }
    })();
  }, []);

  const connectRemote = useCallback(async (input: string) => {
    if (connectRef.current) return connectRef.current;

    connectRef.current = (async () => {
      const bp = await parseBunkerInput(input);
      if (!bp) throw new Error('invalid bunker pointer');
      const pool = NostrService.getPool();
      const localSecret = generateSecretKey();
      const rs = new BunkerSigner(localSecret, bp, { pool });
      await rs.connect();
      const pubkey = await rs.getPublicKey();
      useAuthStore.getState().setSigner(pubkey, rs, 'nip46');
      setSigner(rs);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ input, secret: bytesToHex(localSecret) })
      );
      return pubkey;
    })();

    return connectRef.current;
  }, []);

  const signRemoteEvent = useCallback(
    async (evt: Parameters<BunkerSigner['signEvent']>[0]) => {
      if (!signer) throw new Error('remote signer not connected');
      return signer.signEvent(evt);
    },
    [signer]
  );

  const disconnect = useCallback(async () => {
    connectRef.current = null;
    if (signer) {
      await signer.close();
    }
    setSigner(undefined);
    localStorage.removeItem(SESSION_KEY);
    useAuthStore.getState().logout();
  }, [signer]);

  return { connectRemote, signRemoteEvent, disconnect, signer };
}
