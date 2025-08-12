import React, { useEffect } from 'react';
import useZap from '../../features/zaps/useZap';

export interface ZapButtonProps {
  lnurl: string;
  recipientPubkey: string;
  videoId?: string;
}

/**
 * Button that triggers the zap flow and displays status and totals.
 * Side effects are handled within the useZap hook.
 */
export default function ZapButton({
  lnurl,
  recipientPubkey,
  videoId,
}: ZapButtonProps) {
  const { zap, status, totals, error, loadTotals } = useZap();
  const amount = 1;

  useEffect(() => {
    loadTotals().catch(() => {
      /* ignore load errors */
    });
  }, [loadTotals]);

  const total =
    videoId && totals.byVideo[videoId] !== undefined
      ? totals.byVideo[videoId]
      : totals.byUser[recipientPubkey] || 0;

  return (
    <div className="flex flex-col gap-2 text-sm text-white">
      <button
        type="button"
        onClick={() => zap(lnurl, amount, recipientPubkey, videoId)}
        disabled={status === 'pending'}
        className="rounded bg-yellow-400 px-2 py-1 font-medium text-black disabled:opacity-50"
      >
        Zap {amount} sats
      </button>
      <div>
        <p>Status: {status}</p>
        <p>Total: {total}</p>
        {error && (
          <p role="alert" className="text-red-500">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

