/* ── KONTROLA DAT LÍSTKU ──
   Do repozitáře pustíme jen to, co odpovídá tvaru, který stránky umí
   vykreslit. Neznámé klíče zahazujeme — do data/*.json se tak nedostane
   nic navíc, ani kdyby si někdo pohrál s požadavkem mimo admin.
   Vrací { ok: true, value } nebo { ok: false, error }.
*/

/* Ikony, které mají stránky nakreslené. Cokoli jiného by se nevykreslilo. */
const ICONS = {
  'stale-menu': ['soup', 'chef', 'plate', 'leaf', 'fire', 'cake', 'steak', 'burger',
                 'sprout', 'salad', 'bottle', 'bread', 'potato', 'snowflake'],
  'pivni-listek': ['beer'],
  'napojovy-listek': ['drop', 'cup', 'glass', 'shot', 'coffee', 'tea', 'hot',
                      'cocktail', 'wine', 'bottle', 'sprout', 'snack'],
};

const LIMITS = {
  id: 60, title: 120, sub: 120, note: 300,
  name: 200, desc: 300, weight: 40, allergens: 60, degree: 12,
};

function fail(msg) { return { ok: false, error: msg }; }

/* Nepovinný text: prázdný = klíč vynecháme, ať JSON zůstane čistý. */
function optText(obj, key, max, where, out) {
  const v = obj[key];
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') return fail(where + ': "' + key + '" musí být text.');
  const t = v.trim();
  if (!t) return null;
  if (t.length > max) return fail(where + ': "' + key + '" je delší než ' + max + ' znaků.');
  out[key] = t;
  return null;
}

/* Cena má tři podoby a každá stránka umí jinou:
     58                — číslo, všude
     [68, 46]          — dvojice 0,5 l / 0,3 l; vykreslit ji umí jen pivní
                         lístek (BeerItem má Array.isArray), jinde by se
                         zobrazila jako "6846"
     "80 / 140"        — text pro malou/velkou porci, vykreslí se jak je
   Text držíme na číslicích a lomítkách, ať se z ceny nestane věta. */
const TEXT_PRICE_RE = /^\d{1,5}(\s*\/\s*\d{1,5}){1,2}$/;

function checkPrice(v, where, menuKey) {
  const one = function (n) {
    return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 99999;
  };
  if (v === undefined || v === null || v === '') return { ok: true, value: undefined };

  if (Array.isArray(v)) {
    if (menuKey !== 'pivni-listek') {
      return fail(where + ': dvojitou cenu v závorkách umí jen pivní lístek. Jinde napište "80 / 140".');
    }
    if (v.length !== 2) return fail(where + ': dvojitá cena musí mít dvě hodnoty.');
    if (!one(v[0]) || !one(v[1])) return fail(where + ': cena musí být celé číslo 0–99999.');
    return { ok: true, value: [v[0], v[1]] };
  }

  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return { ok: true, value: undefined };
    if (/^\d{1,5}$/.test(t)) return { ok: true, value: parseInt(t, 10) };
    if (!TEXT_PRICE_RE.test(t)) {
      return fail(where + ': cena musí být číslo, nebo dvě až tři čísla oddělená lomítkem (např. "80 / 140").');
    }
    return { ok: true, value: t };
  }

  if (!one(v)) return fail(where + ': cena musí být celé číslo 0–99999.');
  return { ok: true, value: v };
}

function checkItem(raw, where, menuKey) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(where + ': položka není objekt.');
  const out = {};

  if (typeof raw.name !== 'string' || !raw.name.trim()) return fail(where + ': chybí název.');
  if (raw.name.trim().length > LIMITS.name) return fail(where + ': název je delší než ' + LIMITS.name + ' znaků.');

  // Pořadí klíčů držíme jako v původních souborech, ať jsou diffy čitelné.
  let e;
  if ((e = optText(raw, 'weight', LIMITS.weight, where, out))) return e;
  if ((e = optText(raw, 'degree', LIMITS.degree, where, out))) return e;
  out.name = raw.name.trim();
  if ((e = optText(raw, 'desc', LIMITS.desc, where, out))) return e;
  if ((e = optText(raw, 'allergens', LIMITS.allergens, where, out))) return e;

  const price = checkPrice(raw.price, where, menuKey);
  if (!price.ok) return price;
  if (price.value !== undefined) out.price = price.value;

  if (raw.nonalcoholic === true) out.nonalcoholic = true;

  return { ok: true, value: out };
}

function checkSection(raw, idx, menuKey, seenIds) {
  const where = 'Sekce ' + (idx + 1);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(where + ': není objekt.');
  const out = {};

  if (typeof raw.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(raw.id)) {
    return fail(where + ': "id" smí obsahovat jen malá písmena bez diakritiky, číslice a pomlčky.');
  }
  if (raw.id.length > LIMITS.id) return fail(where + ': "id" je příliš dlouhé.');
  if (seenIds[raw.id]) return fail(where + ': "id" ' + raw.id + ' se opakuje.');
  seenIds[raw.id] = true;
  out.id = raw.id;

  if (typeof raw.title !== 'string' || !raw.title.trim()) return fail(where + ': chybí název.');
  if (raw.title.trim().length > LIMITS.title) return fail(where + ': název je příliš dlouhý.');
  out.title = raw.title.trim();

  let e;
  if ((e = optText(raw, 'sub', LIMITS.sub, where, out))) return e;

  if (raw.icon !== undefined && raw.icon !== null && raw.icon !== '') {
    const allowed = ICONS[menuKey] || [];
    if (allowed.indexOf(raw.icon) < 0) {
      return fail(where + ': neznámá ikona "' + raw.icon + '". Použitelné: ' + allowed.join(', ') + '.');
    }
    out.icon = raw.icon;
  }

  if ((e = optText(raw, 'note', LIMITS.note, where, out))) return e;
  if (raw.feature === true) out.feature = true;
  if (raw.compact === true) out.compact = true;

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    return fail(where + ' (' + out.title + '): musí mít aspoň jednu položku.');
  }
  if (raw.items.length > 200) return fail(where + ': příliš mnoho položek.');

  const items = [];
  for (let i = 0; i < raw.items.length; i++) {
    const r = checkItem(raw.items[i], out.title + ' — položka ' + (i + 1), menuKey);
    if (!r.ok) return r;
    items.push(r.value);
  }
  out.items = items;

  if (raw.addons !== undefined && raw.addons !== null) {
    if (!Array.isArray(raw.addons)) return fail(where + ': "addons" musí být seznam.');
    if (raw.addons.length > 50) return fail(where + ': příliš mnoho příplatků.');
    if (raw.addons.length) {
      const addons = [];
      for (let i = 0; i < raw.addons.length; i++) {
        const r = checkItem(raw.addons[i], out.title + ' — příplatek ' + (i + 1), menuKey);
        if (!r.ok) return r;
        addons.push(r.value);
      }
      out.addons = addons;
    }
  }

  return { ok: true, value: out };
}

function validateMenu(menuKey, sections) {
  if (!Array.isArray(sections)) return fail('Data musí být seznam sekcí.');
  if (sections.length === 0) return fail('Lístek musí mít aspoň jednu sekci.');
  if (sections.length > 40) return fail('Příliš mnoho sekcí.');

  const seenIds = {};
  const out = [];
  for (let i = 0; i < sections.length; i++) {
    const r = checkSection(sections[i], i, menuKey, seenIds);
    if (!r.ok) return r;
    out.push(r.value);
  }
  return { ok: true, value: out };
}

module.exports = { validateMenu, ICONS };
