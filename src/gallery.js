// Devpost gallery images (3:2, 1800x1200) drawn with the same pieces as the bot's cards. Saved to docs/gallery/.
import { loadImage } from '@napi-rs/canvas';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { cap, describe, parseTyped, simulate, traitsFrom } from './engine.js';
import { battleCard, catCard, DISPLAY, drawCat, fit, indexCard, MONO, P, paper, png, posterCard, setup, swatches, text, vhatch } from './cards.js';

const dir = new URL('../docs/gallery/', import.meta.url).pathname;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const W = 600, H = 400, SYS = n => `${n}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
const cat = (meows, no) => Object.assign(traitsFrom(parseTyped(meows), 'demo' + no), { no });
const img = async buf => loadImage(buf);
const save = (name, cv) => { writeFileSync(`${dir}${name}.png`, png(cv)); console.log('saved', name); };

function base(seed, title, kicker, { swatch = true } = {}) {
  const { cv, c } = setup(W, H);
  paper(c, W, H, seed);
  c.strokeStyle = P.ink; c.lineWidth = 1.5; c.strokeRect(.75, .75, W - 1.5, H - 1.5);
  if (kicker) text(c, kicker, 28, 40, MONO(9), P.orange);
  if (title) text(c, title, 28, 72, DISPLAY(26));
  if (swatch) swatches(c, W - 28, 32, [P.ink, P.brown, P.blue, P.mustard, P.orange], 8, 3);
  return { cv, c };
}
function shadowImage(c, im, x, y, w, h, border = false) {
  c.fillStyle = P.ink; c.fillRect(x + 4, y + 4, w, h);
  c.drawImage(im, x, y, w, h);
  if (border) { c.strokeStyle = P.ink; c.lineWidth = 1.2; c.strokeRect(x + .6, y + .6, w - 1.2, h - 1.2); }
}
function bubble(c, s, x, y, maxW, me) {
  c.font = SYS(10); const words = s.split(' '), lines = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW - 20 && line) { lines.push(line); line = w; } else line = t; }
    lines.push(line);
  }
  void words;
  const bw = Math.min(maxW, Math.max(...lines.map(l => c.measureText(l).width)) + 20), bh = lines.length * 13 + 12, bx = me ? x + maxW - bw : x;
  c.beginPath(); c.roundRect(bx, y, bw, bh, 11); c.fillStyle = me ? '#0a84ff' : '#e9e9eb'; c.fill();
  c.fillStyle = me ? '#ffffff' : '#000000'; c.textAlign = 'left';
  lines.forEach((l, i) => c.fillText(l, bx + 10, y + 18 + i * 13));
  return y + bh + 6;
}

const tabby = cat('meow mrrow MEEOW', 1), tux = cat('MEEEOW!!! MEOW!!', 2), calico = cat('mrrrow mrrrow mrrrow mrrrow', 3);
const breeds = [['meow', 'solid'], ['meow meow', 'tuxedo'], ['meow mrrow MEEOW', 'tabby'], ['mrrrow mrrrow mrrrow mrrrow', 'calico'],
  ['meow meow meow meow meow', 'siamese'], ['meow meow meow meow meow meow', 'cow cat'], ['meow meow meow meow meow meow meow', 'tortie'],
  ['meow meow meow meow meow meow meow meow', 'void cat']].map(([m, name], i) => ({ t: cat(m, 20 + i), n: i + 1, name }));

// 1 · Cover
{
  const { cv, c } = base(1, null, null);
  text(c, 'MHACKS 2026 · AGENTS IN IMESSAGE', 28, 40, MONO(9), P.orange);
  text(c, 'MEOW', 28, 118, DISPLAY(72)); text(c, 'BOT', 28, 190, DISPLAY(72));
  c.fillStyle = P.orange; c.fillRect(206, 150, 26, 26);
  ['Meow at iMessage.', 'Get a pixel cat made from your voice.', 'Battle your friends.'].forEach((l, i) => text(c, l, 30, 232 + i * 19, MONO(11)));
  text(c, 'NO APP TO DOWNLOAD · REAL IMESSAGE · VOICE MEMOS', 30, H - 30, MONO(8.5), P.brown);
  const cards = await Promise.all([calico, tabby, tux].map(t => img(catCard(t))));
  const cw = 124, ch = 155;
  [[338, 128, -.08], [404, 98, 0], [464, 128, .08]].forEach(([x, y, a], i) => {
    c.save(); c.translate(x + cw / 2, y + ch / 2); c.rotate(a); shadowImage(c, cards[i], -cw / 2, -ch / 2, cw, ch); c.restore();
  });
  save('1-cover', cv);
}

// 2 · How a meow becomes a cat
{
  const { cv, c } = base(2, 'YOUR MEOW IS THE DNA', 'HOW IT WORKS');
  // waveform of three meows
  const wx = 28, wy = 104, ww = 230, wh = 92;
  c.strokeStyle = P.ink; c.lineWidth = 1; c.strokeRect(wx, wy, ww, wh);
  text(c, 'VOICE MEMO · 0:03', wx + 8, wy + 14, MONO(7), P.brown);
  c.fillStyle = P.blue;
  for (let i = 0; i < ww - 16; i += 2.2) {
    const t = i / (ww - 16), k = [.18, .5, .82].reduce((a, m) => a + Math.max(0, 1 - Math.abs(t - m) / .11), 0);
    const amp = (k * (.75 + .25 * Math.sin(i * 1.7)) + .03) * (wh - 34) / 2;
    c.fillRect(wx + 8 + i, wy + 20 + (wh - 28) / 2 - amp, 1.2, amp * 2 + .5);
  }
  [.18, .5, .82].forEach((m, i) => text(c, `MEOW ${i + 1}`, wx + 8 + m * (ww - 16), wy + wh + 14, MONO(7), P.orange, 'center'));
  const rows = [['meow count', 'breed'], ['pitch', 'color'], ['loudness', 'chonkiness'], ['longest meow', 'body length'], ['raspiness', 'fluffiness']];
  rows.forEach(([a, b], i) => {
    const y = 250 + i * 24;
    text(c, a.toUpperCase(), 28, y, MONO(10)); text(c, '→', 158, y, MONO(10), P.orange); text(c, b.toUpperCase(), 180, y, MONO(10));
  });
  text(c, 'MEASURED WITH OUR OWN SIGNAL PROCESSING. NO AI API.', 28, H - 22, MONO(8), P.brown);
  shadowImage(c, await img(catCard(tabby)), 330, 92, 220, 275);
  c.fillStyle = P.orange; c.fillRect(290, 220, 24, 3); c.fillRect(306, 214, 3, 15); c.fillRect(309, 217, 3, 9);
  save('2-how-it-works', cv);
}

// 3 · Breeds
{
  const { cv, c } = base(3, '8 BREEDS. ONE IS A SECRET.', 'COUNT YOUR MEOWS');
  breeds.forEach(({ t, n, name }, i) => {
    const x = 28 + (i % 4) * 138, y = 96 + Math.floor(i / 4) * 146;
    if (n === 8) { c.fillStyle = P.ink; c.fillRect(x, y, 128, 136); }
    drawCat(c, t, x + 64, y + 96, fit(t, 108, 80, 4));
    const col = n === 8 ? P.paper : P.ink;
    text(c, n === 8 ? '8+ MEOWS' : `${n} MEOW${n > 1 ? 'S' : ''}`, x + 64, y + 114, MONO(8), n === 8 ? P.orange : P.brown, 'center');
    text(c, name, x + 64, y + 128, DISPLAY(10), col, 'center');
  });
  save('3-breeds', cv);
}

// 4 · It all happens in iMessage
{
  const { cv, c } = base(4, 'IT ALL HAPPENS', 'NO APP. NO SIGN-UP.', { swatch: false });
  text(c, 'IN IMESSAGE', 28, 104, DISPLAY(26));
  ['Text a meow or send a voice memo.', 'Your cat arrives in seconds,', 'with the reasons it looks that way.', '', 'Battles and gifts reach your', 'friends as normal texts.'].forEach((l, i) => text(c, l, 30, 148 + i * 18, MONO(11)));
  text(c, 'BUILT ON PHOTON SPECTRUM', 30, H - 30, MONO(8.5), P.brown);
  const px = 352, py = 26, pw = 220, ph = 360;
  c.beginPath(); c.roundRect(px, py, pw, ph, 26); c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 2; c.strokeStyle = P.ink; c.stroke();
  c.save(); c.beginPath(); c.roundRect(px + 2, py + 2, pw - 4, ph - 4, 24); c.clip();
  text(c, 'Meow Bot', px + pw / 2, py + 22, SYS(9), '#8a8a8e', 'center');
  let y = bubble(c, 'meow mrrow MEEOW', px + 12, py + 34, pw - 24, true);
  const card = await img(catCard(tabby)); c.drawImage(card, px + 12, y, 112, 140); y += 146;
  const d = describe(Object.assign({}, tabby)).join('\n');
  y = bubble(c, `Meet ${cap(tabby.name)}, your ${tabby.coatName}! (cat #1)\n\nWhy it looks like this:\n${d}`, px + 12, y, pw - 30, false);
  c.restore();
  save('4-imessage', cv);
}

// 5 · Battles
{
  const { cv, c } = base(5, 'BATTLE YOUR FRIENDS', 'TEXT "BATTLE" + A NAME');
  const { hp, winner } = simulate(tabby, tux); (winner === 'A' ? tabby : tux).wins = 1;
  shadowImage(c, await img(battleCard(tabby, tux, hp.A, hp.B, winner)), 28, 100, 330, 231);
  [['FLUFFY CATS', 'dodge more'], ['LOUD CATS', 'can land a MEOW blast'], ['SLEEPY CATS', 'nap to heal'], ['LONG CATS', 'move first']].forEach(([a, b], i) => {
    const y = 122 + i * 46;
    c.fillStyle = i % 2 ? P.blue : P.orange; c.fillRect(384, y - 9, 8, 8);
    text(c, a, 400, y, DISPLAY(11)); text(c, b, 400, y + 16, MONO(10), P.brown);
  });
  text(c, 'YOUR FRIEND REPLIES "ACCEPT". BOTH OF YOU GET THE RESULT.', 28, H - 22, MONO(8), P.brown);
  save('5-battles', cv);
}

// 6 · Collect, gift, share
{
  const { cv, c } = base(6, 'COLLECT, GIFT, SHARE', 'EVERY CAT IS ONE OF A KIND');
  const mine = [tabby, tux, calico, breeds[3].t, breeds[7].t, breeds[4].t].map((t, i) => Object.assign({}, t, { no: i + 1 }));
  shadowImage(c, await img(indexCard("celink's cats (6)", mine)), 28, 96, 268, 196);
  shadowImage(c, await img(posterCard(Object.assign({}, tux, { no: 2 }))), 316, 96, 256, 188, true);
  [['my cats', 'see your collection'], ['send #2 to <friend>', 'gift a cat'], ['poster #2', 'a poster to save or share']].forEach(([a, b], i) => {
    const x = 28 + i * 190;
    text(c, a, x, 330, DISPLAY(10)); text(c, b.toUpperCase(), x, 346, MONO(8), P.brown);
  });
  vhatch(c, 28, H - 30, W - 56, 6, P.blue, 3, .8);
  save('6-collect', cv);
}
