// Cat engine: meow -> traits -> pixel cat, plus battles. Shared by iMessage, the terminal test and the Fetch.ai agent.

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
function vnoise(seed) {
  const h = (x, y) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed | 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), s = v => v * v * (3 - 2 * v), u = s(x - xi), v = s(y - yi), a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
}
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
export const lumOf = h => { const [r, g, b] = hexRgb(h); return (r * .299 + g * .587 + b * .114) / 255; };

export const OUT = '#2a2331';
const PINK = '#f4a3b5', LIGHT = '#f6eddc';
export const COATS = {
  solid: [['black cat', '#433b4d'], ['gray cat', '#b7bac4'], ['cream cat', '#f3dfbd'], ['white cat', '#fbf8f2'], ['ginger cat', '#f0a35e']],
  tuxedo: [['tuxedo', '#433b4d'], ['gray tuxedo', '#9799a6']],
  tabby: [['gray tabby', '#bdbec6', '#7f818d'], ['ginger tabby', '#f3b06c', '#d27b38'], ['brown tabby', '#bc9a78', '#7d5d40']],
  calico: [['calico', '#fbf8f2']],
  siamese: [['siamese', '#f3e7d3', '#6e5747']],
  cow: [['cow cat', '#fbf8f2', '#433b4d']],
  tortie: [['tortie', '#433b4d', '#d4843f']],
  void: [['void cat', '#211c28']],
};
const COAT_ORDER = ['solid', 'tuxedo', 'tabby', 'calico', 'siamese', 'cow', 'tortie'];

/** Round pixel cat from celink's sketch. Returns a cropped grid of hex colours (null = transparent). */
export function catPixels(t, mood = 'ok') {
  const r = rng(t.seed);
  const rx = Math.round(7 + t.fat * 2.5 + t.len * 5), ry = Math.round(6 + t.fat * 2.5), W = 2 * rx + 12, H = 2 * ry + 14, cx = W / 2, cy = ry + 6, N = W * H;
  const m = new Uint8Array(N), part = new Uint8Array(N), px = new Array(N).fill(null);
  const set = (x, y, p) => { if (x >= 0 && y >= 0 && x < W && y < H && !m[y * W + x]) { m[y * W + x] = 1; part[y * W + x] = p; } };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x + .5 - cx) / (rx + .35)) ** 2 + ((y + .5 - cy) / (ry + .35)) ** 2 <= 1) set(x, y, 1);
  const ew = t.ears === 'big' ? 5 : 4, eh = t.ears === 'big' ? 4 : t.ears === 'fold' ? 2 : 3, ex0 = Math.round(cx - rx * .78), peak = 1;
  const colTop = x => { for (let y = 0; y < H; y++) if (m[y * W + x]) return y; return cy; };
  const eb = colTop(ex0 + peak) - eh;
  for (let i = 0; i < ew; i++) { const x = ex0 + i, ct = eb + Math.round(Math.abs(i - peak) * eh / (ew - 1 - peak)), bt = colTop(x); for (let y = ct; y <= bt; y++) { set(x, y, 2); set(W - 1 - x, y, 2); } }
  const tx = t.tailStyle === 'up' ? Math.round(cx + rx * .35) : Math.round(cx - rx * .3), ty = cy + ry - 1;
  const path = t.tailStyle === 'up' ? [[0, 0], [1, 1], [2, 1], [3, 1], [4, 1], [5, 0], [6, -1], [6, -2], [6, -3]] : [[0, 0], [0, 1], [-1, 2], [-1, 3], [-2, 4], [-3, 4], [-4, 4]];
  path.forEach(([dx, dy]) => { for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) set(tx + dx + a, ty + dy + b, 3); });
  if (t.fluffy) {
    const add = [];
    for (let y = Math.round(cy - ry * .3); y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!m[i] && ((x > 0 && part[i - 1] === 1) || (x < W - 1 && part[i + 1] === 1) || part[i - W] === 1 || (i + W < N && part[i + W] === 1)) && r() < .35) add.push([x, y]); }
    add.forEach(([x, y]) => set(x, y, 1));
  }
  const cs = COATS[t.coat], coat = cs[t.variant % cs.length], base = coat[1], sec = coat[2], nz = vnoise(t.seed);
  const eyeY = cy - Math.round(ry * .3), dx = Math.max(2, Math.round(rx * .42)), C = Math.floor(cx), top = cy - ry;
  const col = (x, y, p) => {
    const X = x + .5, Y = y + .5;
    // Patterned coats keep a clean face so eyes, cheeks and mouth always read the same way.
    const face = p === 1 && ((X - cx) / (dx + 2.4)) ** 2 + ((Y - eyeY - 1.2) / 3) ** 2 < 1;
    switch (t.coat) {
      case 'tuxedo': if (p === 1 && (((X - cx) / (rx * .55)) ** 2 + ((Y - cy - ry * .45) / (ry * .6)) ** 2 < 1 || ((X - cx) / 3.2) ** 2 + ((Y - eyeY - 2) / 2) ** 2 < 1)) return '#fbf8f2'; break;
      case 'tabby': if (p === 1 && ((y === top + 1 || y === top + 2) && (x === C - 2 || x === C + 1))) return sec; if (p === 1 && (y - cy) % 3 === 0 && Math.abs(X - cx) > rx * .62) return sec; if (p === 3 && (x + y) % 3 === 0) return sec; break;
      case 'calico': { if (face) break; const n = nz(x * .17, y * .17); if (n < .36) return '#ee9a4f'; if (n > .66) return '#433b4d'; break; }
      case 'cow': if (!face && nz(x * .22 + 3, y * .22) > .6) return sec; break;
      case 'tortie': return !face && nz(x * .25, y * .25) > .5 ? sec : base;
      case 'siamese': if (p === 2 || p === 3) return sec; if (p === 1 && ((X - cx) / 2.6) ** 2 + ((Y - eyeY - 2.6) / 1.9) ** 2 < 1) return sec; break;
    }
    return base;
  };
  for (let i = 0; i < N; i++) if (m[i]) px[i] = col(i % W, (i / W) | 0, part[i]);
  // Drop lone patch pixels so patterns read as deliberate patches, not noise.
  if (['calico', 'cow', 'tortie'].includes(t.coat)) for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) {
    if (!m[i] || part[i] !== 1 || px[i] === base) continue;
    const same = [i - 1, i + 1, i - W, i + W].filter(j => j >= 0 && j < N && px[j] === px[i]).length;
    if (same < 2) px[i] = base;
  }
  for (let i = 0; i < N; i++) { if (m[i]) continue; const x = i % W; if ((x > 0 && m[i - 1]) || (x < W - 1 && m[i + 1]) || (i >= W && m[i - W]) || (i + W < N && m[i + W])) px[i] = OUT; }
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (!m[i]) return; px[i] = c === 'A' ? (lumOf(px[i]) < .35 ? LIGHT : OUT) : c; };
  const both = (pts, x0, y0, c) => pts.forEach(([a, b]) => { put(x0 + a, y0 + b, c); put(W - 1 - (x0 + a), y0 + b, c); });
  if (eh >= 3) both([[peak, 2]], ex0, eb, PINK);
  const lx = C - 1 - dx, expr = mood === 'ko' ? 'ko' : t.void ? 'void' : t.expr;
  const EYES = { calm: [[0, 0]], sleepy: [[-1, 0], [0, 0]], curious: [[0, -1], [0, 0]], meowing: [[-1, 0], [0, -1], [1, 0]], ko: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], void: [[0, -1], [0, 0]] };
  if (lumOf(base) > .35 && t.coat !== 'tortie' && expr !== 'ko') both([[-2, 2], [-1, 2]], lx, eyeY, '#f6a3b6');
  both(EYES[expr], lx, eyeY, expr === 'void' ? '#ffe45c' : t.coat === 'siamese' && expr !== 'ko' ? '#4f86d9' : 'A');
  const mY = eyeY + 2;
  if (expr === 'meowing') { [[-1, 0], [0, 0], [-2, 1], [1, 1], [-1, 2], [0, 2]].forEach(([a, b]) => put(C + a, mY + b, 'A')); put(C - 1, mY + 1, '#e0566f'); put(C, mY + 1, '#e0566f'); }
  else if (expr === 'ko') { put(C - 1, mY + 1, 'A'); put(C, mY + 1, 'A'); }
  else [[-2, 0], [1, 0], [-1, 1], [0, 1]].forEach(([a, b]) => put(C + a, mY + b, 'A'));
  const [r1, g1, b1] = hexRgb(base), k = lumOf(base) < .35 ? 1.45 : .82, f = v => Math.round(clamp(v * k, 0, 255)).toString(16).padStart(2, '0'), pc = '#' + f(r1) + f(g1) + f(b1);
  if (cy + ry - 2 - (eyeY + 4) >= 1) both([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]], C - dx - 2, cy + ry - 2, pc);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  px.forEach((c, i) => { if (!c) return; const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, o = new Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) o[y * cw + x] = px[(y + y0) * W + x + x0];
  return { W: cw, H: ch, px: o };
}

/** Voice memo samples (mono Float32Array) -> meow features. Returns null when no meow is heard. */
export function analyze(x, sr) {
  const dec = Math.max(1, Math.floor(sr / 16000));
  if (dec > 1) { const y = new Float32Array(Math.floor(x.length / dec)); for (let i = 0; i < y.length; i++) { let s = 0; for (let j = 0; j < dec; j++) s += x[i * dec + j]; y[i] = s / dec; } x = y; sr = sr / dec; }
  const hop = Math.round(sr * .01), win = Math.round(sr * .03), rms = [];
  for (let i = 0; i + win < x.length; i += hop) { let s = 0; for (let j = 0; j < win; j++) s += x[i + j] * x[i + j]; rms.push(Math.sqrt(s / win)); }
  const peak = rms.reduce((a, b) => Math.max(a, b), 0); if (peak < .004) return null;
  const thr = Math.max(.008, peak * .22); let segs = [], st = -1;
  rms.forEach((v, i) => { if (v > thr && st < 0) st = i; if (v <= thr && st >= 0) { segs.push([st, i]); st = -1; } }); if (st >= 0) segs.push([st, rms.length]);
  const merged = []; for (const s of segs) { const p = merged[merged.length - 1]; if (p && s[0] - p[1] < 8) p[1] = s[1]; else merged.push([...s]); }
  segs = merged.filter(s => s[1] - s[0] >= 9); if (!segs.length) return null;
  const W2 = 512, minL = Math.floor(sr / 1300), maxL = Math.floor(sr / 140), pitches = [], per = []; let longest = segs[0];
  segs.forEach(s => { if (s[1] - s[0] > longest[1] - longest[0]) longest = s; });
  const half = [[], []];
  for (const s of segs) for (let fi = s[0]; fi < s[1]; fi += 2) {
    const o = fi * hop; if (o + W2 + maxL >= x.length) break; let e0 = 0; for (let j = 0; j < W2; j++) e0 += x[o + j] * x[o + j]; if (e0 < 1e-6) continue;
    let best = 0, bl = 0; for (let L = minL; L <= maxL; L++) { let c = 0, e1 = 0; for (let j = 0; j < W2; j++) { c += x[o + j] * x[o + j + L]; e1 += x[o + j + L] * x[o + j + L]; } const n = c / Math.sqrt(e0 * e1 + 1e-9); if (n > best) { best = n; bl = L; } }
    per.push(best); if (best > .45 && bl) { const fz = sr / bl; pitches.push(fz); if (s === longest) half[fi < (s[0] + s[1]) / 2 ? 0 : 1].push(fz); }
  }
  const med = a => { if (!a.length) return 0; const b = [...a].sort((p, q) => p - q); return b[b.length >> 1]; };
  const pitch = med(pitches) || 450, avgPer = per.length ? per.reduce((a, b) => a + b, 0) / per.length : .6;
  return { count: segs.length, longest: (longest[1] - longest[0]) * .01, loud: clamp((20 * Math.log10(peak) + 40) / 32), pitch, rasp: clamp((.92 - avgPer) / .45),
    slope: half[0].length && half[1].length ? (med(half[1]) - med(half[0])) / pitch : 0 };
}

/** Typed meows ("meow MEEOOOW mrrrow?") -> the same features a voice memo gives. */
export function parseTyped(s) {
  const toks = s.split(/[\s,.;:]+/).map(w => w.replace(/[!?~]+$/, '')).filter(w => /^m+[a-z]*$/i.test(w) && /[aeiouy]/i.test(w) && /[wr]/i.test(w));
  if (!toks.length) return null;
  const letters = toks.join(''), caps = (letters.match(/[A-Z]/g) || []).length / letters.length, bangs = (s.match(/!/g) || []).length;
  const longTok = toks.reduce((a, b) => b.length > a.length ? b : a), hi = (letters.match(/[ei]/gi) || []).length, lo = (letters.match(/[oau]/gi) || []).length;
  return { count: toks.length, longest: .2 + Math.max(0, longTok.length - 4) * .16, loud: clamp(caps * .75 + Math.min(bangs, 5) * .07 + .1),
    pitch: 280 + hi / (hi + lo + .01) * 760, rasp: clamp((letters.match(/r/gi) || []).length / letters.length * 4), slope: /\?/.test(s) ? .15 : /w{2,}$/i.test(longTok) ? -.15 : 0 };
}

const SYL = ['mo', 'chi', 'bao', 'pud', 'ding', 'bean', 'noo', 'tofu', 'lu', 'mi', 'sock', 'nug', 'pep', 'boo', 'kiki', 'meep', 'dum', 'plin', 'yam', 'zu'];
/** Meow features -> a cat. `salt` makes two identical meows from different people give different cats. */
export function traitsFrom(a, salt = 0) {
  const seed = hashStr([a.count, Math.round(a.longest * 10), Math.round(a.loud * 10), Math.round(a.pitch / 25), Math.round(a.rasp * 10), salt].join('|')), r = rng(seed);
  const v = a.count >= 8, coat = v ? 'void' : COAT_ORDER[(a.count - 1) % COAT_ORDER.length];
  const pb = pitchBand(a.pitch), nv = COATS[coat].length;
  const t = { seed, coat, variant: Math.min(nv - 1, Math.floor(pb * nv / 5)), void: v, len: clamp((a.longest - .25) / 1.6), fat: a.loud, fluffy: a.rasp > .45,
    expr: a.loud > .82 ? 'meowing' : a.slope > .08 ? 'curious' : a.slope < -.08 ? 'sleepy' : 'calm',
    ears: pick(r, ['pointy', 'pointy', 'big', 'fold']), tailStyle: pick(r, ['up', 'down']), name: pick(r, SYL) + pick(r, SYL), a, wins: 0 };
  t.coatName = COATS[coat][t.variant % nv][0];
  t.hp = 24 + Math.round(t.fat * 16); t.atk = 4 + a.count % 3 + (a.loud > .8 ? 2 : 0); t.spd = 2 + Math.round(t.len * 5) + (t.fat < .3 ? 2 : 0);
  t.special = { solid: 'pounce', tuxedo: 'formal swipe', tabby: 'zoomies', calico: 'chaos swipe', siamese: 'loud yell', cow: 'headbutt', tortie: 'spicy bite', void: 'the void stares' }[coat];
  return t;
}
const pitchBand = p => p < 350 ? 0 : p < 500 ? 1 : p < 680 ? 2 : p < 880 ? 3 : 4;
const BREED = { solid: 'solid color', tuxedo: 'tuxedo', tabby: 'tabby', calico: 'calico', siamese: 'siamese', cow: 'cow cat', tortie: 'tortie', void: 'secret void cat' };
export const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
/** Why a cat looks the way it does, one "cause → result" line per trait. */
export function describe(t) {
  const a = t.a, out = [`${a.count} meow${a.count > 1 ? 's' : ''} → ${BREED[t.coat]}`];
  if (COATS[t.coat].length > 1) out.push(`${['very low', 'low', 'medium', 'high', 'very high'][pitchBand(a.pitch)]} pitch → ${t.coatName.replace(/ ?(cat|tabby|tuxedo)$/, '') || 'black'}`);
  out.push(t.fat > .7 ? 'loud → chonky' : t.fat > .4 ? 'medium volume → round' : 'quiet → small');
  if (t.len >= .62) out.push('long meow → long cat');
  if (t.fluffy) out.push('raspy → fluffy');
  return out;
}

/** Turn-based fight. Deterministic for the same two cats and win counts. */
export function simulate(A, B) {
  const r = rng(hashStr(A.seed + 'v' + B.seed + '#' + (A.wins + B.wins))), hp = { A: A.hp, B: B.hp }, log = [];
  let turn = A.spd >= B.spd ? 'A' : 'B'; const cat = { A, B };
  for (let i = 0; i < 14 && hp.A > 0 && hp.B > 0; i++) {
    const me = cat[turn], them = turn === 'A' ? 'B' : 'A', foe = cat[them];
    if (me.expr === 'sleepy' && r() < .18) { hp[turn] = Math.min(me.hp, hp[turn] + 4); log.push(`${cap(me.name)}: nap, +4 HP`); }
    else if (r() < (foe.fluffy ? .25 : .1)) log.push(`${cap(me.name)}: missed, ${cap(foe.name)} dodged`);
    else {
      const sp = r() < .35, crit = me.expr === 'meowing' && r() < .3, d = Math.round((me.atk + r() * 4) * (sp ? 1.5 : 1) * (crit ? 1.6 : 1)); hp[them] = Math.max(0, hp[them] - d);
      log.push(`${cap(me.name)}: ${crit ? 'MEOW blast' : sp ? me.special : pick(r, ['pounce', 'bap', 'scratch', 'tail whip'])} → ${d}`);
    }
    turn = them;
  }
  const winner = hp.A === hp.B ? (A.spd >= B.spd ? 'A' : 'B') : hp.A > hp.B ? 'A' : 'B';
  return { log, hp, winner };
}
