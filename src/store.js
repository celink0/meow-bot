// Tiny JSON-file database: players, their cats, and pending battle requests.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function openStore(path) {
  const data = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { users: {} };
  const save = () => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(data, null, 1)); };
  return {
    data,
    save,
    user(id, platform) {
      if (!data.users[id]) { data.users[id] = { id, platform, name: null, cats: [], pending: null, isNew: true }; save(); }
      return data.users[id];
    },
    byName(name) {
      const n = name.toLowerCase().replace(/^@/, '');
      return Object.values(data.users).find(u => u.name === n) || data.users[name] || null;
    },
  };
}
