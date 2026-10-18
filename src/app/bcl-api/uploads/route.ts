import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { usesRemoteApi } from '@/config/environment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'weba',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  if (usesRemoteApi()) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'Envie um arquivo.' }, { status: 400 });
  }

  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) {
    return Response.json({ error: 'Use imagem, áudio ou vídeo nos formatos comuns.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'O arquivo passa de 25 MB.' }, { status: 400 });
  }

  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), 'public', 'uploads');
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String((error as NodeJS.ErrnoException).code) : '';
    if (code === 'EROFS' || code === 'EACCES') {
      return Response.json({ error: 'Upload indisponível neste ambiente.' }, { status: 503 });
    }
    throw error;
  }

  return Response.json({ url: `/uploads/${filename}` });
}
