import type { NextApiRequest, NextApiResponse } from 'next';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const ext = (req.headers['content-type']?.split('/')[1] || 'mp4').split(';')[0];
  const fileName = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, fileName);
  const writeStream = createWriteStream(filePath);
  await pipeline(req, writeStream);
  const url = `/uploads/${fileName}`;
  res.status(200).json({ url });
}
