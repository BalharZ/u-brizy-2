const lib = require('./_lib.js');

/* Admin se po otevření zeptá, jestli ještě platí přihlášení. */
module.exports = async function handler(req, res) {
  const secret = process.env.SESSION_SECRET;
  const valid = !!secret && lib.verifySession(lib.readCookie(req, lib.COOKIE), secret);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ loggedIn: valid });
};
