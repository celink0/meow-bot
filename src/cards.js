// Draws the images the bot sends as PNG buffers, in a risograph print style (paper, orange, periwinkle, ink):
// cat card, poster, collection, battle result and the welcome menu.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cap, catPixels, clamp, hashStr, OUT, rng } from './engine.js';

GlobalFonts.registerFromPath(fileURLToPath(new URL('../assets/Silkscreen-Regular.ttf', import.meta.url)), 'Silkscreen');
const MONO_PATH = '/System/Library/Fonts/SFNSMono.ttf';
if (existsSync(MONO_PATH)) GlobalFonts.registerFromPath(MONO_PATH, 'RisoMono');

export const P = { paper: '#e9e5dc', ink: '#2b2724', orange: '#f0631c', blue: '#6c7cd0', mustard: '#b98a2e', brown: '#4a3a33' };
const SCALE = 3;
const DISPLAY = n => `${n}px Silkscreen`;
const MONO = n => `600 ${n}px RisoMono, Menlo, Courier, monospace`;
const pad3 = n => String(n).padStart(3, '0');

function setup(w, h) {
  const cv = createCanvas(w * SCALE, h * SCALE), c = cv.getContext('2d');
  c.scale(SCALE, SCALE); c.imageSmoothingEnabled = false; return { cv, c };
}
const png = cv => cv.toBuffer('image/png');

// Paper with ink specks and light flecks, so flat colour reads as printed.
function paper(c, w, h, seed, col = P.paper) {
  c.fillStyle = col; c.fillRect(0, 0, w, h);
  const r = rng(seed ^ 0x51ed);
  for (let i = 0; i < w * h / 14; i++) {
    c.globalAlpha = .04 + r() * .09; c.fillStyle = r() < .7 ? P.ink : '#ffffff';
    c.fillRect(r() * w, r() * h, .5 + r() * .7, .5 + r() * .7);
  }
  c.globalAlpha = 1;
}
function vhatch(c, x, y, w, h, col, gap = 2.4, lw = .9) {
  c.fillStyle = col; for (let i = x; i < x + w; i += gap) c.fillRect(i, y, lw, h);
}
function swatches(c, x, y, cols, size = 6, gap = 2, alignRight = true) {
  const total = cols.length * (size + gap) - gap; let sx = alignRight ? x - total : x;
  cols.forEach(col => { c.fillStyle = col; c.fillRect(sx, y, size, size); sx += size + gap; });
}
function text(c, s, x, y, font, col = P.ink, align = 'left') { c.font = font; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, y); }
function catColors(t) {
  const { px } = catPixels(t), seen = new Map();
  px.forEach(col => { if (col && col !== OUT) seen.set(col, (seen.get(col) || 0) + 1); });
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]);
}
function fit(t, bw, bh, max) { const { W, H } = catPixels(t); return Math.max(1, Math.min(max, Math.floor(bw / W), Math.floor(bh / H))); }
function drawCat(c, t, cx, bottom, s, { flip = false, mood = 'ok', shadow = null } = {}) {
  const { W, H, px } = catPixels(t, mood), x0 = Math.round(cx - W * s / 2), y0 = Math.round(bottom - H * s);
  const at = (i, ox = 0, oy = 0) => { let x = i % W; if (flip) x = W - 1 - x; return [x0 + x * s + ox, y0 + ((i / W) | 0) * s + oy]; };
  if (shadow) { c.fillStyle = shadow; px.forEach((col, i) => { if (!col) return; const [x, y] = at(i, 2, 2); c.fillRect(x, y, s, s); }); }
  px.forEach((col, i) => { if (!col) return; const [x, y] = at(i); c.fillStyle = col === OUT ? P.ink : col; c.fillRect(x, y, s, s); });
}
const sizeWord = t => t.fat > .7 ? 'chonky' : t.fat > .4 ? 'round' : 'small';
const moodWord = t => ({ calm: 'calm', curious: 'curious', sleepy: 'sleepy', meowing: 'loud' })[t.expr] || 'calm';
const tags = t => [t.coatName, t.fluffy && 'fluffy', t.len >= .62 && 'long'].filter(Boolean).join(' · ');

// ── Cat card: specimen sheet (the main card) ─────────────────────────────────
function specimen(t) {
  const w = 240, h = 300, { cv, c } = setup(w, h);
  paper(c, w, h, t.seed);
  c.strokeStyle = P.ink; c.lineWidth = 1.2; c.strokeRect(.6, .6, w - 1.2, h - 1.2);
  text(c, 'MEOW BOT · SPECIMEN', 14, 21, MONO(7));
  swatches(c, w - 14, 15, [...catColors(t), P.ink]);
  drawCat(c, t, w / 2, 186, fit(t, 180, 136, 7));
  c.fillStyle = P.ink; c.fillRect(14, 200, w - 28, 1);
  text(c, t.name, 14, 226, DISPLAY(20));
  text(c, `CAT — ${pad3(t.no)}`, w - 14, 225, MONO(8), P.ink, 'right');
  text(c, tags(t).toUpperCase(), 14, 245, MONO(8), P.brown);
  text(c, `HP ${t.hp}   ATK ${t.atk}   SPD ${t.spd}`, 14, 267, MONO(9));
  text(c, `*** ${t.special.toUpperCase()}`, 14, 286, MONO(8), P.orange);
  return png(cv);
}

// ── Poster: wide, shareable, sent on request with "poster #2" ────────────────
function poster(t) {
  const w = 300, h = 220, { cv, c } = setup(w, h);
  paper(c, w, h, t.seed);
  text(c, t.name, 14, 46, DISPLAY(32));
  c.font = DISPLAY(32); const nw = c.measureText(t.name).width;
  c.fillStyle = P.orange; c.fillRect(Math.min(14 + nw + 6, 180), 30, 12, 12);
  swatches(c, w - 14, 12, [P.ink, ...catColors(t), P.orange]);
  const cap = `A ${moodWord(t)} yet ${sizeWord(t)} ${t.coatName}.`.toUpperCase().split(' '), lines = [''];
  cap.forEach(wd => { if ((lines[lines.length - 1] + ' ' + wd).trim().length > 16) lines.push(wd); else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + wd).trim(); });
  lines.forEach((l, i) => text(c, l, w - 14, 32 + i * 9, MONO(7), P.ink, 'right'));
  drawCat(c, t, 150, 184, fit(t, 140, 116, 6), { shadow: P.blue });
  text(c, `${t.hp} hp · ${t.atk} atk · ${t.spd} spd`, w - 14, h - 14, DISPLAY(11), P.ink, 'right');
  text(c, `CAT — ${pad3(t.no)}`, 14, h - 24, MONO(7));
  text(c, t.special.toUpperCase(), 14, h - 14, MONO(7), P.orange);
  return png(cv);
}

export const catCard = specimen;
export const posterCard = poster;

// Collection laid out like an asset sheet: cat, then "CAT — 001" under it.
export function indexCard(title, cats) {
  const cols = Math.min(3, Math.max(1, cats.length)), rows = Math.ceil(cats.length / 3), tw = 86, th = 92;
  const w = Math.max(240, cols * tw + 28), h = 52 + rows * th + 12, { cv, c } = setup(w, h);
  paper(c, w, h, hashStr(title));
  c.strokeStyle = P.ink; c.lineWidth = 1.2; c.strokeRect(.6, .6, w - 1.2, h - 1.2);
  text(c, title, 14, 30, DISPLAY(14));
  swatches(c, w - 14, 21, [P.ink, P.brown, P.blue, P.mustard, P.orange]);
  cats.forEach((t, i) => {
    const x = 14 + (i % 3) * tw, y = 46 + Math.floor(i / 3) * th;
    drawCat(c, t, x + tw / 2, y + 62, fit(t, tw - 14, 58, 4));
    text(c, cap(t.name), x + tw - 6, y + 76, MONO(7), P.ink, 'right');
    text(c, `CAT — ${pad3(t.no)}${t.wins ? ` · ${t.wins}W` : ''}`, x + tw - 6, y + 86, MONO(6.5), P.brown, 'right');
  });
  return png(cv);
}

export function battleCard(A, B, hpA, hpB, winner) {
  const w = 300, h = 210, { cv, c } = setup(w, h);
  paper(c, w, h, A.seed ^ B.seed);
  c.strokeStyle = P.ink; c.lineWidth = 1.2; c.strokeRect(.6, .6, w - 1.2, h - 1.2);
  const segs = (x, v, m, right) => {
    const n = 12, full = Math.round(n * clamp(v / m));
    for (let i = 0; i < n; i++) {
      const sx = right ? x + (n - 1 - i) * 8 : x + i * 8;
      if (i < full) { c.fillStyle = P.orange; c.fillRect(sx, 34, 6, 6); } else { c.strokeStyle = P.ink; c.lineWidth = .7; c.strokeRect(sx + .35, 34.35, 5.3, 5.3); }
    }
  };
  text(c, A.name, 14, 26, DISPLAY(11)); text(c, B.name, w - 14, 26, DISPLAY(11), P.ink, 'right');
  segs(14, hpA, A.hp, false); segs(w - 14 - 94, hpB, B.hp, true);
  const win = winner === 'A' ? A : B;
  text(c, winner ? `${win.name} wins` : 'VS', w / 2, 70, DISPLAY(18), P.ink, 'center');
  vhatch(c, winner === 'A' ? 24 : w - 124, 96, 100, 84, P.blue, 3, .8);
  const s = Math.min(fit(A, 100, 100, 5), fit(B, 100, 100, 5));
  drawCat(c, A, w * .25, h - 26, s, { mood: winner === 'B' ? 'ko' : 'ok' });
  drawCat(c, B, w * .75, h - 26, s, { flip: true, mood: winner === 'A' ? 'ko' : 'ok' });
  text(c, win.wins > 1 ? `${win.name.toUpperCase()} · ${win.wins} WINS TOTAL` : 'FIRST WIN · PLAY-BY-PLAY BELOW', w / 2, h - 10, MONO(7), P.brown, 'center');
  return png(cv);
}

// The menu: what this is, sample cats, every command, and a privacy line. Sent to new players and on "help".
export function welcomeCard(samples) {
  const rows = [['voice memo', 'meow at me to make a cat'], ['meow meow', 'or type your meows'], ['my cats', 'see your collection'],
    ['call me <your name>', 'pick a name so friends can find you'], ['send #1 to <friend>', 'gift a cat to a friend'],
    ['battle <friend>', 'challenge a friend\'s cat'], ['poster #1', 'get a poster of a cat to share'], ['help', 'show this menu again'], ['stop', 'stop all messages from me']];
  const w = 300, top = 186, rowH = 27, h = top + rows.length * rowH + 52, { cv, c } = setup(w, h);
  paper(c, w, h, 99);
  c.strokeStyle = P.ink; c.lineWidth = 1.2; c.strokeRect(.6, .6, w - 1.2, h - 1.2);
  text(c, 'MEOW BOT', 16, 44, DISPLAY(30));
  c.fillStyle = P.orange; c.fillRect(w - 30, 26, 14, 14);
  text(c, 'TURN YOUR MEOWS INTO PIXEL CATS.', 16, 62, MONO(8), P.brown);
  samples.forEach((t, i) => drawCat(c, t, 60 + i * 90, 154, fit(t, 76, 70, 4)));
  c.fillStyle = P.ink; c.fillRect(16, 172, w - 32, 1);
  rows.forEach(([cmd, desc], i) => {
    const y = top + 14 + i * rowH;
    c.fillStyle = i === 0 ? P.orange : P.ink; c.fillRect(16, y - 7, 6, 6);
    text(c, cmd, 30, y, DISPLAY(10)); text(c, desc.toUpperCase(), 30, y + 10, MONO(6.5), P.brown);
  });
  c.fillStyle = P.ink; c.fillRect(16, h - 40, w - 32, 1);
  text(c, '<FRIEND> = THE NAME YOUR FRIEND PICKED WITH "CALL ME".', 16, h - 26, MONO(6.5), P.brown);
  text(c, 'VOICE MEMOS ARE DELETED RIGHT AFTER YOUR CAT IS MADE.', 16, h - 14, MONO(6.5), P.brown);
  return png(cv);
}

// Drawing helpers, shared with the Devpost gallery script.
export { DISPLAY, drawCat, fit, MONO, paper, png, setup, swatches, text, vhatch };
