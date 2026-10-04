// Meow bot entry point.
//  • With SPECTRUM_PROJECT_ID + SPECTRUM_PROJECT_SECRET in .env it runs on Photon's iMessage cloud.
//  • Without them it opens a terminal chat so you can try everything locally.
//  • It also serves http://127.0.0.1:8787 for the Fetch.ai agent (ASI:One).
import { attachment, Spectrum, text } from 'spectrum-ts';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createBrain } from './brain.js';
import { decodeAudio, SAMPLE_RATE } from './audio.js';
import { openStore } from './store.js';

const store = openStore(fileURLToPath(new URL('../data/db.json', import.meta.url)));
// Photon's `bun create spectrum-project` writes either SPECTRUM_* or plain PROJECT_* names; accept both.
const projectId = process.env.SPECTRUM_PROJECT_ID || process.env.PROJECT_ID;
const projectSecret = process.env.SPECTRUM_PROJECT_SECRET || process.env.PROJECT_SECRET;
const cloud = Boolean(projectId && projectSecret);

let app, imessageNs, terminalNs, nativeContactCard;
if (cloud) {
  ({ imessage: imessageNs, nativeContactCard } = await import('spectrum-ts/providers/imessage'));
  app = await Spectrum({ projectId, projectSecret, providers: [imessageNs.config()] });
} else {
  ({ terminal: terminalNs } = await import('spectrum-ts/providers/terminal'));
  app = await Spectrum({ providers: [terminalNs.config()] });
}

const toContent = p => p.type === 'text' ? text(p.text) : attachment(p.png, { name: p.name, mimeType: 'image/png' });
const fetchOutbox = [];

// The contact card only exists on Photon's iMessage cloud, and a failed card should never block a reply.
async function send(space, p) {
  if (p.type !== 'contact') return space.send(toContent(p));
  if (!nativeContactCard) return;
  try { await space.send(nativeContactCard()); } catch (err) { console.error('contact card failed:', err.message); }
}

async function notify(userId, parts) {
  const u = store.data.users[userId];
  if (!u || u.muted) return; // they texted "stop"
  try {
    if (u.platform === 'fetch') { fetchOutbox.push({ user: userId, parts }); return; }
    let space;
    if (u.platform === 'imessage' && imessageNs) { const im = imessageNs(app); space = await im.space.create(await im.user(userId)); }
    else if (terminalNs) space = await terminalNs(app).space.get(userId);
    if (space) for (const p of parts) await send(space, p);
  } catch (err) {
    console.error(`could not message ${userId}:`, err.message);
  }
}

const brain = createBrain(store, notify);

async function inputFrom(message) {
  const c = message.content;
  if (c.type === 'text') return { text: c.text };
  if (c.type === 'voice' || (c.type === 'attachment' && /^audio\//.test(c.mimeType || ''))) {
    return { audio: await decodeAudio(await c.read(), c.name || 'memo.m4a'), sampleRate: SAMPLE_RATE };
  }
  return { text: '' };
}

// HTTP bridge for the Fetch.ai agent
const PORT = Number(process.env.PORT || 8787);
createServer(async (req, res) => {
  const reply = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  const enc = parts => parts.filter(p => p.type !== 'contact').map(p => p.type === 'text' ? p : { type: 'image', name: p.name, png_b64: p.png.toString('base64') });
  try {
    if (req.method === 'POST' && req.url === '/chat') {
      let body = ''; for await (const chunk of req) body += chunk;
      const { user, text: msg } = JSON.parse(body || '{}');
      if (!user) return reply(400, { error: 'user is required' });
      const parts = await brain.handle(store.user(user, 'fetch'), { text: msg || '' });
      return reply(200, { parts: enc(parts) });
    }
    if (req.method === 'GET' && req.url === '/outbox') return reply(200, { messages: fetchOutbox.splice(0).map(m => ({ user: m.user, parts: enc(m.parts) })) });
    reply(404, { error: 'not found' });
  } catch (err) {
    console.error(err); reply(500, { error: err.message });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`meow bot ${cloud ? 'on iMessage (Photon cloud)' : 'in terminal mode'} · Fetch bridge on http://127.0.0.1:${PORT}`));

const shutdown = async () => { await app.stop(); process.exit(0); };
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

for await (const [space, message] of app.messages) {
  if (message.direction && message.direction !== 'inbound') continue;
  const userId = message.sender?.id || space.id;
  const user = store.user(userId, cloud ? 'imessage' : 'terminal');
  try {
    await space.responding(async () => {
      const parts = await brain.handle(user, await inputFrom(message));
      for (const p of parts) await send(space, p);
    });
  } catch (err) {
    console.error('message failed:', err);
    await space.send(text('Something went wrong on my side. Try that again?')).catch(() => {});
  }
}
