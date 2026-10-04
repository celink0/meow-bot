// Runs a full conversation between two fake players without any keys and saves the images to data/test/.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { createBrain } from './brain.js';
import { decodeAudio, SAMPLE_RATE } from './audio.js';
import { openStore } from './store.js';

const dir = new URL('../data/test/', import.meta.url).pathname;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const store = openStore(join(dir, 'db.json'));
let n = 0;
const show = (who, parts) => parts.forEach(p => {
  if (p.type === 'text') console.log(`  ${who} <- ${p.text.replace(/\n/g, '\n       ')}`);
  else if (p.type === 'contact') console.log(`  ${who} <- [contact card]`);
  else { const f = `${String(++n).padStart(2, '0')}-${p.name}`; writeFileSync(join(dir, f), p.png); console.log(`  ${who} <- [image ${f}]`); }
});
const brain = createBrain(store, async (id, parts) => show(id + ' (pushed)', parts));
const say = async (id, text) => { console.log(`${id}: ${text}`); show(id, await brain.handle(store.user(id, 'test'), { text })); };

// A synthetic voice memo: three rising-falling meows, encoded to .m4a like an iPhone would send.
function meowWav() {
  const sr = 22050, parts = [];
  for (let k = 0; k < 3; k++) {
    const dur = .5, n = Math.floor(sr * dur);
    for (let i = 0; i < n; i++) {
      const t = i / sr, f = 520 * (t < dur * .35 ? .8 + .35 * t / (dur * .35) : 1.15 - .43 * (t - dur * .35) / (dur * .65));
      parts.push(Math.sin(2 * Math.PI * f * t) * .5 * Math.min(1, t * 20, (dur - t) * 20));
    }
    for (let i = 0; i < sr * .25; i++) parts.push(0);
  }
  let phase = 0; const pcm = Buffer.alloc(parts.length * 2);
  parts.forEach((v, i) => pcm.writeInt16LE(Math.round(v * 32767), i * 2)); void phase;
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
const wav = join(tmpdir(), 'meow-test.wav'), m4a = join(tmpdir(), 'meow-test.m4a');
writeFileSync(wav, meowWav());
execFileSync(ffmpegStatic, ['-v', 'error', '-y', '-i', wav, '-c:a', 'aac', m4a]);
const { readFileSync } = await import('node:fs');
console.log('celink: [voice memo, 3 meows]');
show('celink', await brain.handle(store.user('celink', 'test'), { audio: await decodeAudio(readFileSync(m4a), 'memo.m4a'), sampleRate: SAMPLE_RATE }));

await say('celink', 'call me celink');
await say('celink', 'meeeeeeeeooooow');
await say('celink', 'MRAOW!! MRAOW!!');
await say('sam', 'mew mew mew mew');
await say('sam', 'call me sam');
await say('celink', 'my cats');
await say('celink', 'send #1 to sam');
await say('celink', 'battle sam with #2');
await say('sam', 'accept');
await say('sam', 'my cats');
await say('celink', 'poster #2');
await say('sam', 'what is this');
await say('sam', 'stop');
await say('celink', 'battle sam');
await say('sam', 'help');
console.log(`\nimages saved in ${dir}`);
