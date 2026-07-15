const lib = require('./_lib.js');
const { validateMenu } = require('./_validate.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Použijte POST.' });
  }
  if (!lib.requireSession(req, res)) return;

  let body;
  try {
    body = await lib.readJsonBody(req, 512 * 1024);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const path = lib.MENUS[body.menu];
  if (!path) return res.status(400).json({ error: 'Neznámý lístek.' });

  const checked = validateMenu(body.menu, body.sections);
  if (!checked.ok) return res.status(400).json({ error: checked.error });

  const content = JSON.stringify(checked.value, null, 2) + '\n';

  try {
    const current = await lib.ghGetFile(path);

    // Beze změny nemá smysl dělat commit a přenasazení.
    if (current && current.content) {
      const old = Buffer.from(current.content, 'base64').toString('utf8');
      if (old === content) {
        return res.status(200).json({ ok: true, unchanged: true, sections: checked.value });
      }
    }

    const label = lib.MENU_LABELS[body.menu] || body.menu;
    const commit = await lib.ghPutFile(
      path,
      content,
      current ? current.sha : null,
      'Admin: úprava — ' + label
    );

    return res.status(200).json({
      ok: true,
      sections: checked.value,
      commit: commit.commit ? commit.commit.sha.slice(0, 7) : null,
    });
  } catch (e) {
    console.error('save selhal', e);
    return res.status(502).json({ error: e.message || 'Uložení selhalo.' });
  }
};
