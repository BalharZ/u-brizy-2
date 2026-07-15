const lib = require('./_lib.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Použijte POST.' });
  }
  lib.setSessionCookie(res, '', 0);
  return res.status(200).json({ ok: true });
};
