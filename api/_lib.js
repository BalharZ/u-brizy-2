/* ── SPOLEČNÉ FUNKCE PRO ADMIN API ──
   Soubory v api/ začínající podtržítkem Vercel nevystavuje jako endpoint.

   Potřebné proměnné prostředí (Vercel → Settings → Environment Variables):
     ADMIN_PASSWORD  — heslo do adminu
     SESSION_SECRET  — náhodný řetězec pro podpis cookie (min. 32 znaků)
     GITHUB_TOKEN    — fine-grained token, jen Contents: Read and write
     GITHUB_REPO     — např. BalharZ/u-brizy-2
     GITHUB_BRANCH   — nepovinné, výchozí "main"
*/
const crypto = require('node:crypto');

const COOKIE = 'ubadmin';
const SESSION_HOURS = 8;

/* Které soubory smí admin přepsat. Klíč z požadavku se nikdy nepoužije
   jako cesta — jen se hledá v tomhle seznamu, takže ven z data/ nejde sáhnout. */
const MENUS = {
  'stale-menu': 'data/stale-menu.json',
  'pivni-listek': 'data/pivni-listek.json',
  'napojovy-listek': 'data/napojovy-listek.json',
};

const MENU_LABELS = {
  'stale-menu': 'stálý jídelní lístek',
  'pivni-listek': 'pivní lístek',
  'napojovy-listek': 'nápojový lístek',
};

/* ── Session ── */
function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSession(secret) {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000 })
  ).toString('base64url');
  return payload + '.' + sign(payload, secret);
}

function verifySession(value, secret) {
  if (!value || !secret) return false;
  const dot = value.indexOf('.');
  if (dot < 1) return false;
  const payload = value.slice(0, dot);
  const sig = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(payload, secret));
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(sig, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && Date.now() < data.exp;
  } catch (e) {
    return false;
  }
}

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parts = raw.split(';');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (p.startsWith(name + '=')) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

function setSessionCookie(res, value, maxAgeSec) {
  res.setHeader('Set-Cookie',
    COOKIE + '=' + encodeURIComponent(value) +
    '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAgeSec
  );
}

function requireSession(req, res) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Chybí SESSION_SECRET.' });
    return false;
  }
  if (!verifySession(readCookie(req, COOKIE), secret)) {
    res.status(401).json({ error: 'Nejste přihlášeni.' });
    return false;
  }
  return true;
}

/* Heslo porovnáváme přes otisky — stejná délka, konstantní čas. */
function passwordOk(input, expected) {
  if (typeof input !== 'string' || typeof expected !== 'string' || !expected) return false;
  const a = crypto.createHash('sha256').update(input, 'utf8').digest();
  const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

/* ── Tělo požadavku ── */
function readJsonBody(req, limitBytes) {
  const max = limitBytes || 512 * 1024;
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let size = 0;
    const chunks = [];
    req.on('data', function (c) {
      size += c.length;
      if (size > max) { reject(new Error('Data jsou příliš velká.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text) return resolve({});
      try { resolve(JSON.parse(text)); }
      catch (e) { reject(new Error('Neplatný JSON.')); }
    });
    req.on('error', reject);
  });
}

/* ── GitHub Contents API ── */
function ghHeaders() {
  return {
    Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ubrizy-admin',
  };
}

function ghConfig() {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) throw new Error('Chybí GITHUB_REPO nebo GITHUB_TOKEN.');
  return { repo: repo, branch: process.env.GITHUB_BRANCH || 'main' };
}

async function ghGetFile(path) {
  const cfg = ghConfig();
  const url = 'https://api.github.com/repos/' + cfg.repo + '/contents/' +
    encodeURI(path) + '?ref=' + encodeURIComponent(cfg.branch);
  const r = await fetch(url, { headers: ghHeaders() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('GitHub: čtení selhalo (' + r.status + ')');
  return r.json();
}

async function ghPutFile(path, contentString, sha, message) {
  const cfg = ghConfig();
  const url = 'https://api.github.com/repos/' + cfg.repo + '/contents/' + encodeURI(path);
  const body = {
    message: message,
    content: Buffer.from(contentString, 'utf8').toString('base64'),
    branch: cfg.branch,
  };
  if (sha) body.sha = sha;

  const r = await fetch(url, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error('GitHub: zápis selhal (' + r.status + ') ' + detail.slice(0, 200));
  }
  return r.json();
}

module.exports = {
  COOKIE, SESSION_HOURS, MENUS, MENU_LABELS,
  createSession, verifySession, readCookie, setSessionCookie, requireSession,
  passwordOk, readJsonBody, ghGetFile, ghPutFile,
};
