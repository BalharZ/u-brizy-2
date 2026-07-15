const lib = require('./_lib.js');
const { ICONS } = require('./_validate.js');

/* Admin si bere seznam lístků a povolených ikon odsud, ať nemusí mít
   vlastní kopii, která by se časem rozešla s kontrolou v _validate.js. */
module.exports = async function handler(req, res) {
  if (!lib.requireSession(req, res)) return;

  const menus = Object.keys(lib.MENUS).map(function (key) {
    return { key: key, label: lib.MENU_LABELS[key], file: lib.MENUS[key], icons: ICONS[key] || [] };
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ menus: menus });
};
