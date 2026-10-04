// What the bot says back. Platform-agnostic: takes a user + text or audio, returns parts to send.
// `notify(userId, parts)` reaches other players (battle requests, gifted cats).
// Every reply follows the same shape: first line says what happened, last line says what you can do next.
import { analyze, cap, describe, parseTyped, simulate, traitsFrom } from './engine.js';
import { battleCard, catCard, indexCard, posterCard, welcomeCard } from './cards.js';

const say = text => ({ type: 'text', text });
const image = (png, name) => ({ type: 'image', png, name });
const CONTACT = { type: 'contact' }; // the bot's own iMessage contact card, so people can save it by name

const INTRO = "Hi! I'm Meow Bot, a little game made at MHacks 2026.\n\n"
  + "Send me a voice memo of you meowing and I'll turn it into your own pixel cat. Typed meows work too.\n\n"
  + 'Text "help" anytime to see the menu.';
const HINT = 'I\'m Meow Bot. I turn meows into pixel cats you can collect and battle. Text "help" to see everything I can do.';
const NEXT_CAT = 'Meow again for another, or text "my cats" to see your collection.';

// Three sample cats for the menu card, drawn once.
let menuPng;
const menu = () => {
  menuPng ??= welcomeCard([['mrrrow mrrrow mrrrow mrrrow', 3], ['meow mrrow MEEOW', 1], ['MEEEOW!!! MEOW!!', 2]]
    .map(([m, no]) => Object.assign(traitsFrom(parseTyped(m), 'demo' + no), { no })));
  return image(menuPng, 'meow-bot-menu.png');
};

export function createBrain(store, notify) {
  const label = u => u.name || 'your friend';
  const findFriend = (who, me) => {
    const f = store.byName(who);
    return f && f.id !== me.id ? f : null;
  };
  const unknown = who => `I don't know anyone called "${who}" yet. Ask them to text Meow Bot a meow, then "call me ${who}".`;
  const paused = f => `${cap(label(f))} has paused messages from Meow Bot, so I can't reach them right now.`;
  const NEED_NAME = 'First, pick a player name so your friend knows it\'s you. Text "call me" followed by your name.';

  function newCat(user, a) {
    if (!a) return [say("I couldn't hear a meow in that one. Try again a little closer to the mic.")];
    const t = traitsFrom(a, user.cats.length + ':' + user.id);
    t.no = user.cats.length + 1; t.owner = user.id;
    user.cats.push(t); store.save();
    const intro = t.void ? `✨ A secret cat! Meet ${cap(t.name)}, your void cat. (cat #${t.no})` : `Meet ${cap(t.name)}, your ${t.coatName}! (cat #${t.no})`;
    const next = user.name ? NEXT_CAT : 'Next, pick your player name so friends can find you. Text "call me" followed by your name.';
    return [image(catCard(t), `${t.name}.png`), say(`${intro}\n\nWhy it looks like this:\n${describe(t).join('\n')}\n\n${next}`)];
  }

  function result(w, log, rematch) {
    return `🏆 ${cap(w.name)} wins! (${w.wins} win${w.wins > 1 ? 's' : ''})\n\n${log.slice(-4).join('\n')}`
      + (rematch ? `\n\nText "battle ${rematch}" for a rematch.` : '');
  }

  async function handle(user, input) {
    const raw = (input.text || '').trim(), tl = raw.toLowerCase();
    let m;

    if (!input.audio && /^(stop|unsubscribe|quit|cancel)$/.test(tl)) {
      user.muted = true; user.isNew = false; store.save();
      return [say("Okay, I won't message you again. Your cats are saved. Meow at me anytime to come back.")];
    }
    if (user.muted) { user.muted = false; store.save(); } // they texted us, so they're back

    const out = [];
    if (user.isNew) {
      user.isNew = false; store.save();
      out.push(menu(), say(INTRO), CONTACT);
      if (!input.audio && (!raw || /^(help|menu|\?|hi|hello|hey|start)$/.test(tl))) return out;
    }
    if (input.audio) return [...out, ...newCat(user, analyze(input.audio, input.sampleRate))];
    if (!raw) return [...out, say(HINT)];

    if (/^(help|menu|\?|hi|hello|hey|start|commands)$/.test(tl)) return [...out, menu(), say("Here's everything I can do. Meow at me anytime to make a cat.")];

    if ((m = tl.match(/^(?:call me|my name is|name)\s+@?([a-z0-9_]{2,16})$/))) {
      const taken = store.byName(m[1]);
      if (taken && taken.id !== user.id) return [...out, say(`"${m[1]}" is taken. Pick another name.`)];
      user.name = m[1]; store.save();
      return [...out, say(`Nice to meet you, ${m[1]}! Friends can now text "battle ${m[1]}" or "send #1 to ${m[1]}".`)];
    }

    if (/\b(my cats|index|collection)\b|^cats$/.test(tl)) {
      if (!user.cats.length) return [...out, say("You don't have any cats yet. Send me a meow to make your first one.")];
      const n = user.cats.length;
      return [...out, image(indexCard(`${user.name ? `${user.name}'s` : 'your'} cats (${n})`, user.cats), 'my-cats.png'),
        say(`To give one away, text "send #${n} to" and a friend's name. For a poster, text "poster #${n}".`)];
    }

    if ((m = tl.match(/^poster(?:\s+#?(\d+))?$/))) {
      if (!user.cats.length) return [...out, say("You don't have any cats yet. Send me a meow to make your first one.")];
      const t = user.cats[(m[1] ? +m[1] : user.cats.length) - 1];
      if (!t) return [...out, say(`You don't have a cat #${m[1]}. Text "my cats" to see them.`)];
      return [...out, image(posterCard(t), `${t.name}-poster.png`), say(`Here's a poster of ${cap(t.name)}. Press and hold it to save or share.`)];
    }

    if ((m = tl.match(/^send\s+#?(\d+)\s+to\s+@?(\S+)$/))) {
      const t = user.cats[+m[1] - 1], f = findFriend(m[2], user);
      if (!t) return [...out, say(`You don't have a cat #${m[1]}. Text "my cats" to see them.`)];
      if (!user.name) return [...out, say(NEED_NAME)];
      if (!f) return [...out, say(unknown(m[2]))];
      if (f.muted) return [...out, say(paused(f))];
      const copy = { ...t, no: f.cats.length + 1, owner: f.id, wins: 0, from: label(user) };
      f.cats.push(copy); store.save();
      await notify(f.id, [image(catCard(copy), `${copy.name}.png`),
        say(`🎁 ${label(user)} sent you ${cap(copy.name)} the ${copy.coatName}! It's cat #${copy.no} in your collection. Text "my cats" to see it.`)]);
      return [...out, say(`🎁 Sent ${cap(t.name)} to ${f.name || m[2]}.`)];
    }

    if ((m = tl.match(/^battle\s+@?(\S+?)(?:\s+with\s+#?(\d+))?$/))) {
      if (!user.cats.length) return [...out, say('You need a cat first. Send me a meow.')];
      if (!user.name) return [...out, say(NEED_NAME)];
      const f = findFriend(m[1], user);
      if (!f) return [...out, say(unknown(m[1]))];
      if (f.muted) return [...out, say(paused(f))];
      const no = m[2] ? +m[2] : user.cats.length, A = user.cats[no - 1];
      if (!A) return [...out, say(`You don't have a cat #${no}. Text "my cats" to see them.`)];
      f.pending = { from: user.id, catNo: no }; store.save();
      await notify(f.id, [image(catCard(A), `${A.name}.png`),
        say(`⚔️ ${label(user)} challenges you to a cat battle!\nTheir fighter: ${cap(A.name)}, ${A.coatName}, ${A.hp} HP\n\n`
          + 'Reply:\naccept → your newest cat fights\naccept with #2 → pick a cat\nnope → skip it'
          + (f.cats.length ? '' : '\n\nYou need a cat first, so send me a meow before you accept.'))]);
      return [...out, say(`⚔️ Challenge sent to ${f.name || m[1]} with ${cap(A.name)}. I'll tell you when they answer.`)];
    }

    if ((m = tl.match(/^(?:accept|yes|fight)(?:\s+with\s+#?(\d+))?$/)) && user.pending) {
      const ch = store.data.users[user.pending.from];
      if (!user.cats.length) return [...out, say('Send me a meow to get a cat first, then reply "accept".')];
      const B = user.cats[(m[1] ? +m[1] : user.cats.length) - 1];
      if (!B) return [...out, say(`You don't have a cat #${m[1]}. Text "my cats" to see them.`)];
      const A = ch && ch.cats[user.pending.catNo - 1];
      user.pending = null;
      if (!A) { store.save(); return [...out, say('That battle request expired.')]; }
      const { log, hp, winner } = simulate(A, B);
      const w = winner === 'A' ? A : B; w.wins++; store.save();
      const card = battleCard(A, B, hp.A, hp.B, winner);
      await notify(ch.id, [image(card, 'battle.png'), say(result(w, log, user.name))]);
      return [...out, image(card, 'battle.png'), say(result(w, log, ch.name))];
    }
    if (/^(nope|no|decline)$/.test(tl) && user.pending) {
      const ch = store.data.users[user.pending.from]; user.pending = null; store.save();
      if (ch) await notify(ch.id, [say(`${cap(label(user))} said nope to the battle. Maybe next time.`)]);
      return [...out, say('Battle skipped.')];
    }

    const a = parseTyped(raw);
    if (a) return [...out, ...newCat(user, a)];
    return [...out, say(HINT)];
  }

  return { handle };
}
