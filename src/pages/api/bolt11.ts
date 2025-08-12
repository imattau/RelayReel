import type { NextApiRequest, NextApiResponse } from 'next';

interface BoltRequest {
  invoice?: string;
  nostr?: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { invoice, nostr } = req.body as BoltRequest;
  if (!invoice || typeof invoice !== 'string') {
    res.status(400).json({ error: 'Missing invoice' });
    return;
  }

  const url = process.env.LIGHTNING_PAY_URL;
  const apiKey = process.env.LIGHTNING_PAY_KEY;
  if (!url) {
    res.status(500).json({ error: 'Lightning backend not configured' });
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
      },
      body: JSON.stringify({ bolt11: invoice, nostr }),
    });

    const text = await response.text();
    res
      .status(response.ok ? 200 : response.status)
      .send(text);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

