import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..') + '/';
const require = createRequire(ROOT + 'x.js');
const lib = require('./api/_lib.js');
const crypto = await import('node:crypto');

let bad = 0;
const t = (name, fn) => {
  try { const r = fn(); if (r === true) console.log('  ok  ' + name); else { console.log('  FAIL ' + name + ' — ' + r); bad++; } }
  catch (e) { console.log('  FAIL ' + name + ' — vyjímka: ' + e.message); bad++; }
};

const SECRET = 'a'.repeat(48);
const OTHER = 'b'.repeat(48);

console.log('Session:');
t('platná session projde', () => lib.verifySession(lib.createSession(SECRET), SECRET) || 'neprošla');
t('jiný secret neprojde', () => !lib.verifySession(lib.createSession(OTHER), SECRET) || 'PROŠLA');
t('podvržený podpis neprojde', () => {
  const s = lib.createSession(SECRET);
  const [p] = s.split('.');
  return !lib.verifySession(p + '.' + 'x'.repeat(43), SECRET) || 'PROŠLA';
});
t('upravená expirace neprojde', () => {
  // Payload přepíšeme na rok dopředu, podpis necháme starý.
  const s = lib.createSession(SECRET);
  const sig = s.slice(s.indexOf('.') + 1);
  const evil = Buffer.from(JSON.stringify({ exp: Date.now() + 3.15e10 })).toString('base64url');
  return !lib.verifySession(evil + '.' + sig, SECRET) || 'PROŠLA';
});
t('prošlá session neprojde', () => {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() - 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return !lib.verifySession(payload + '.' + sig, SECRET) || 'PROŠLA';
});
t('prázdná/nesmyslná hodnota neprojde', () =>
  (!lib.verifySession('', SECRET) && !lib.verifySession('abc', SECRET) &&
   !lib.verifySession(null, SECRET) && !lib.verifySession('a.b.c', SECRET)) || 'PROŠLA');
t('bez secretu neprojde', () => !lib.verifySession(lib.createSession(SECRET), '') || 'PROŠLA');

console.log('\nHeslo:');
t('správné heslo', () => lib.passwordOk('tajne-heslo', 'tajne-heslo') || 'neprošlo');
t('špatné heslo', () => !lib.passwordOk('spatne', 'tajne-heslo') || 'PROŠLO');
t('jiná délka', () => !lib.passwordOk('t', 'tajne-heslo') || 'PROŠLO');
t('prázdné zadané', () => !lib.passwordOk('', 'tajne-heslo') || 'PROŠLO');
t('prázdné nastavené neotevře vrátka', () => !lib.passwordOk('', '') || 'PROŠLO');
t('nesprávný typ', () => (!lib.passwordOk(undefined, 'x') && !lib.passwordOk({}, 'x')) || 'PROŠLO');

console.log('\nCookie:');
t('přečte správnou cookie', () => {
  const req = { headers: { cookie: 'foo=1; ubadmin=abc%2Edef; bar=2' } };
  return lib.readCookie(req, 'ubadmin') === 'abc.def' || 'čte špatně';
});
t('nepodobná jména neplete', () => {
  const req = { headers: { cookie: 'xubadmin=zlo' } };
  return lib.readCookie(req, 'ubadmin') === null || 'spletlo';
});
t('cookie má HttpOnly, Secure i SameSite', () => {
  let out = null;
  lib.setSessionCookie({ setHeader: (k, v) => { out = v; } }, 'x', 100);
  return (out.includes('HttpOnly') && out.includes('Secure') && out.includes('SameSite=Strict') && out.includes('Path=/'))
    || 'chybí příznaky: ' + out;
});

console.log(bad ? `\n${bad} selhalo` : '\nvše prošlo');
process.exit(bad ? 1 : 0);
