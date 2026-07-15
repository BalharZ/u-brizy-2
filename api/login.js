const lib = require('./_lib.js');

/* Brzda proti hádání hesla. Serverless instance se recyklují, takže tohle
   útočníka nezastaví natrvalo — je to jen zpomalení navrch k dlouhému heslu. */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 8;

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

function tooManyTries(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) return false;
  return rec.count >= MAX_TRIES;
}

function noteFail(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) attempts.set(ip, { first: now, count: 1 });
  else rec.count++;

  if (attempts.size > 500) {
    for (const [key, val] of attempts) {
      if (now - val.first > WINDOW_MS) attempts.delete(key);
    }
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Použijte POST.' });
  }

  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret) {
    return res.status(500).json({ error: 'Admin není nastavený: chybí ADMIN_PASSWORD nebo SESSION_SECRET.' });
  }

  const ip = clientIp(req);
  if (tooManyTries(ip)) {
    return res.status(429).json({ error: 'Příliš mnoho pokusů. Zkuste to za čtvrt hodiny.' });
  }

  let body;
  try {
    body = await lib.readJsonBody(req, 4096);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  if (!lib.passwordOk(body.password, password)) {
    noteFail(ip);
    // Drobné zdržení, ať hádání není zadarmo.
    await new Promise(function (r) { setTimeout(r, 400); });
    return res.status(401).json({ error: 'Nesprávné heslo.' });
  }

  attempts.delete(ip);
  lib.setSessionCookie(res, lib.createSession(secret), lib.SESSION_HOURS * 3600);
  return res.status(200).json({ ok: true, hours: lib.SESSION_HOURS });
};
