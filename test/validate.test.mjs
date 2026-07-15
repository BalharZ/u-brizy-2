import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..') + '/';
const require = createRequire(ROOT + 'x.js');
const { validateMenu } = require('./api/_validate.js');
let bad = 0;
const t = (name, fn) => {
  try { const r = fn(); if (r === true) console.log('  ok  ' + name); else { console.log('  FAIL ' + name + ' — ' + r); bad++; } }
  catch (e) { console.log('  FAIL ' + name + ' — vyjímka: ' + e.message); bad++; }
};

/* Na Windows si git při checkoutu přepíše konce řádků na CRLF (core.autocrlf),
   zatímco server ukládá s LF. Do repozitáře i na web jde vždy LF, takže tenhle
   rozdíl nic neznamená — porovnáváme obsah, ne konce řádků. */
const lf = (s) => s.replace(/\r\n/g, '\n');

console.log('Round-trip skutečných dat (validace nesmí nic změnit):');
for (const key of ['stale-menu', 'pivni-listek', 'napojovy-listek']) {
  t(key, () => {
    const raw = lf(readFileSync(ROOT + 'data/' + key + '.json', 'utf8'));
    const parsed = JSON.parse(raw);
    const r = validateMenu(key, parsed);
    if (!r.ok) return 'validace odmítla: ' + r.error;
    const out = JSON.stringify(r.value, null, 2) + '\n';
    if (out !== raw) {
      // ukaž první rozdíl
      for (let i = 0; i < Math.max(out.length, raw.length); i++) {
        if (out[i] !== raw[i]) return 'liší se na znaku ' + i + ':\n    bylo: ' + JSON.stringify(raw.slice(i - 60, i + 60)) + '\n    nyní: ' + JSON.stringify(out.slice(i - 60, i + 60));
      }
      return 'liší se délkou';
    }
    return true;
  });
}

console.log('\nOdmítnutí špatných dat:');
const base = () => [{ id: 'a', title: 'A', items: [{ name: 'X', price: 10 }] }];
const rejects = (label, key, data) => t(label, () => {
  const r = validateMenu(key, data);
  return r.ok ? 'PROŠLO, ale nemělo' : true;
});

rejects('cena jako slovo', 'stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X', price: 'zdarma' }] }]);
rejects('cena jako věta', 'stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X', price: '80 nebo 140' }] }]);
rejects('pole mimo pivní lístek', 'stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X', price: [80, 140] }] }]);
rejects('pole mimo pivní lístek (nápoje)', 'napojovy-listek', [{ id: 'a', title: 'A', items: [{ name: 'X', price: [80, 140] }] }]);
rejects('záporná cena', 'stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X', price: -5 }] }]);
rejects('desetinná cena', 'stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X', price: 10.5 }] }]);
rejects('prázdný název', 'stale-menu', [{ id: 'a', title: 'A', items: [{ name: '  ', price: 1 }] }]);
rejects('sekce bez položek', 'stale-menu', [{ id: 'a', title: 'A', items: [] }]);
rejects('prázdný seznam', 'stale-menu', []);
rejects('duplicitní id', 'stale-menu', [...base(), ...base()]);
rejects('id s diakritikou', 'stale-menu', [{ id: 'polévky', title: 'A', items: [{ name: 'X', price: 1 }] }]);
rejects('neznámá ikona', 'stale-menu', [{ id: 'a', title: 'A', icon: 'rakosnicek', items: [{ name: 'X', price: 1 }] }]);
rejects('ikona z jiné stránky', 'pivni-listek', [{ id: 'a', title: 'A', icon: 'soup', items: [{ name: 'X', price: 1 }] }]);
rejects('trojitá cena', 'pivni-listek', [{ id: 'a', title: 'A', items: [{ name: 'X', price: [1, 2, 3] }] }]);
rejects('není pole', 'stale-menu', { id: 'a' });
rejects('příliš dlouhý název', 'stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X'.repeat(201), price: 1 }] }]);

console.log('\nPřijetí správných dat:');
t('dvojitá cena na pivu', () => validateMenu('pivni-listek', [{ id: 'a', title: 'A', icon: 'beer', items: [{ name: 'X', price: [68, 46] }] }]).ok || 'odmítnuto');
t('položka bez ceny', () => validateMenu('stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X' }] }]).ok || 'odmítnuto');
t('neznámé klíče se zahodí', () => {
  const r = validateMenu('stale-menu', [{ id: 'a', title: 'A', evil: 1, items: [{ name: 'X', price: 1, evil: 2 }] }]);
  if (!r.ok) return 'odmítnuto';
  if ('evil' in r.value[0] || 'evil' in r.value[0].items[0]) return 'klíč "evil" prošel';
  return true;
});
t('prázdný desc se vynechá', () => {
  const r = validateMenu('stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X', price: 1, desc: '' }] }]);
  if (!r.ok) return 'odmítnuto';
  return 'desc' in r.value[0].items[0] ? 'desc zůstal' : true;
});
t('textová cena "80 / 140"', () => {
  const r = validateMenu('stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X', price: '80 / 140' }] }]);
  if (!r.ok) return 'odmítnuto: ' + r.error;
  return r.value[0].items[0].price === '80 / 140' ? true : 'změnilo se na ' + JSON.stringify(r.value[0].items[0].price);
});
t('číslo v uvozovkách se převede na číslo', () => {
  const r = validateMenu('stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X', price: '10' }] }]);
  if (!r.ok) return 'odmítnuto: ' + r.error;
  return r.value[0].items[0].price === 10 ? true : 'zůstalo ' + JSON.stringify(r.value[0].items[0].price);
});
t('addons projdou', () => {
  const r = validateMenu('stale-menu', [{ id: 'a', title: 'A', items: [{ name: 'X', price: 1 }], addons: [{ name: 'Y', price: 20 }] }]);
  return r.ok ? true : 'odmítnuto: ' + r.error;
});

console.log(bad ? `\n${bad} selhalo` : '\nvše prošlo');
process.exit(bad ? 1 : 0);
