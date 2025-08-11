import { useCallback, useRef, useState } from 'react';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import { generateSecretKey } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { useAuthStore } from './useAuth';

export default function useRemoteSigner() {
  const [signer, setSigner] = useState<BunkerSigner>();
  const connectRef = useRef<Promise<string> | null>(null);

  const connect = useCallback(async (input: string) => {
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
      return pubkey;
    })();

    return connectRef.current;
  }, []);

  const disconnect = useCallback(async () => {
    connectRef.current = null;
    if (signer) {
      await signer.close();
    }
    setSigner(undefined);
    useAuthStore.getState().logout();
  }, [signer]);

  return { connect, disconnect, signer };
}
