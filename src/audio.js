// Voice memo bytes (m4a, caf, mp3, wav...) -> mono 16 kHz samples, using ffmpeg.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';

const FFMPEG = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg';
export const SAMPLE_RATE = 16000;

export async function decodeAudio(bytes, name = 'memo.m4a') {
  const dir = await mkdtemp(join(tmpdir(), 'meow-'));
  const file = join(dir, name.replace(/[^\w.-]/g, '_'));
  try {
    await writeFile(file, bytes);
    const pcm = await new Promise((resolve, reject) => {
      const ff = spawn(FFMPEG, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SAMPLE_RATE), 'pipe:1']);
      const chunks = [], errs = [];
      ff.stdout.on('data', d => chunks.push(d));
      ff.stderr.on('data', d => errs.push(d));
      ff.on('error', reject);
      ff.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg failed: ${Buffer.concat(errs)}`)));
    });
    return new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
