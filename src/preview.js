// Renders every card the bot sends, for a handful of cats, into data/preview/ so the style can be reviewed.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { parseTyped, simulate, traitsFrom } from './engine.js';
import { battleCard, catCard, indexCard, posterCard, welcomeCard } from './cards.js';

const dir = new URL('../data/preview/', import.meta.url).pathname;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const cat = (meows, no, salt = 'demo') => Object.assign(traitsFrom(parseTyped(meows), salt + no), { no });

const cats = [
  cat('meow mrrow MEEOW', 1),                         // tabby
  cat('MEEEOW!!! MEOW!!', 2),                         // chonky tuxedo
  cat('mrrrow mrrrow mrrrow mrrrow', 3),              // fluffy calico
  cat('meow meow meow meow meow', 4),                 // siamese
  cat('meow meow meow meow meow meow', 5),            // cow
  cat('meow meow meow meow meow meow meow', 6),       // tortie
  cat('meow meow meow meow meow meow meow meow', 7),  // void
  cat('miiiiiiiiew', 8),                              // long solid
];
cats.forEach(t => {
  writeFileSync(`${dir}cat-${t.no}.png`, catCard(t));
  writeFileSync(`${dir}poster-${t.no}.png`, posterCard(t));
});
writeFileSync(`${dir}index.png`, indexCard(`celink's cats (${cats.length})`, cats));
const A = cats[0], B = cats[1], { hp, winner } = simulate(A, B);
writeFileSync(`${dir}battle.png`, battleCard(A, B, hp.A, hp.B, winner));
writeFileSync(`${dir}welcome.png`, welcomeCard([cats[2], cats[0], cats[1]]));
console.log('saved to', dir);
