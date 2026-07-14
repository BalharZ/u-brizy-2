/* ─────────────────────────────────────────────────────────────
   MENUBOT LOADER
   Klient edituje menu v aplikaci menubot.cz, ta generuje JS
   soubor, který obsah vypisuje přes document.write().
   Tady ten skript načteme, document.write odchytíme (jinak by
   při async načtení přepsal celou stránku) a HTML rozebereme
   na data, která si stránky vykreslí vlastním designem.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const BASE = 'https://www.menubot.cz/app/users/ubrizu12365845896549494994949/export/';

  const URLS = {
    daily: BASE + 'dailymenu_a.js',
    weekly: BASE + 'specialoffer0_a.js',
  };

  /* ── Načtení skriptu s odchycením document.write ── */
  function fetchWritten(url) {
    return new Promise(function (resolve, reject) {
      const chunks = [];
      const origWrite = document.write;
      const origWriteln = document.writeln;
      const script = document.createElement('script');

      function restore() {
        document.write = origWrite;
        document.writeln = origWriteln;
        script.remove();
      }

      document.write = function () {
        chunks.push(Array.prototype.join.call(arguments, ''));
      };
      document.writeln = document.write;

      script.async = true;
      script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'cb=' + Date.now();
      script.onload = function () { restore(); resolve(chunks.join('')); };
      script.onerror = function () { restore(); reject(new Error('Menubot: nepodařilo se načíst ' + url)); };

      document.head.appendChild(script);
    });
  }

  /* ── Pomocné ── */
  function normalize(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function slug(s) {
    return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sekce';
  }

  function cleanText(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('br').forEach(function (br) {
      br.replaceWith(document.createTextNode(' '));
    });
    const detail = clone.querySelector('.detail');
    if (detail) detail.remove();
    return clone.textContent
      .replace(/­/g, '')   // měkké rozdělovníky z menubotu
      .replace(/ /g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ── Ikona + anglický podtitul podle názvu sekce ── */
  const SECTION_META = [
    { match: /polev/,            icon: 'soup',  sub: 'Soups' },
    { match: /predkrm/,          icon: 'leaf',  sub: 'Starters' },
    { match: /special|italsk/,   icon: 'chef',  sub: 'Chef’s specials', feature: true },
    { match: /minut/,            icon: 'fire',  sub: 'À la minute' },
    { match: /smazen|bezmas/,    icon: 'pan',   sub: 'Fried & meatless' },
    { match: /dezert.*salat/,    icon: 'cake',  sub: 'Dessert & salad' },
    { match: /dezert|zakusek/,   icon: 'cake',  sub: 'Dessert' },
    { match: /salat/,            icon: 'leaf',  sub: 'Salad' },
    { match: /hlavni/,           icon: 'plate', sub: 'Main courses' },
  ];

  function metaFor(title) {
    const n = normalize(title);
    for (let i = 0; i < SECTION_META.length; i++) {
      if (SECTION_META[i].match.test(n)) return SECTION_META[i];
    }
    return { icon: 'plate', sub: '' };
  }

  /* ── Rozbor jedné položky <li> ── */
  const WEIGHT_RE = /^(\d+(?:[.,]\d+)?\s*(?:g|kg|ml|dcl|cl|l|ks)\b\.?)\s*/i;

  function parseItem(li) {
    const priceEl = li.querySelector('.price');
    let price = null;
    if (priceEl) {
      const digits = priceEl.textContent.replace(/[^\d]/g, '');
      if (digits) price = parseInt(digits, 10);
    }

    let text = cleanText(li);
    if (!text) return null;

    let weight = '';
    const wm = text.match(WEIGHT_RE);
    if (wm) {
      weight = wm[1].replace(/\.$/, '').trim();
      text = text.slice(wm[0].length).trim();
    }

    // Menubot má název i suroviny v jednom řetězci — design je zobrazuje
    // zvlášť, tak text rozdělíme na první čárce.
    let name = text;
    let desc = '';
    const comma = text.indexOf(', ');
    if (comma > 0) {
      name = text.slice(0, comma).trim();
      desc = text.slice(comma + 1).trim();
    }
    if (!name) return null;

    return { weight: weight, name: name, desc: desc, price: price };
  }

  /* ── Rozbor celého HTML z document.write ── */
  function parseMenu(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sections = [];
    let current = null;
    const usedIds = {};
    const subscribe = { form: '', gdpr: '' };

    function pushSection(title) {
      const meta = metaFor(title);
      let id = slug(title);
      if (usedIds[id]) id = id + '-' + (++usedIds[id]);
      else usedIds[id] = 1;
      current = {
        id: id,
        title: title,
        sub: meta.sub,
        icon: meta.icon,
        feature: !!meta.feature,
        items: [],
      };
      sections.push(current);
    }

    Array.prototype.forEach.call(doc.body.querySelectorAll('h2, ul, form, #popupgdpr'), function (el) {
      if (el.id === 'popupgdpr') {
        subscribe.gdpr = el.outerHTML;
        return;
      }
      if (el.tagName === 'FORM') {
        if (el.id === 'menubotsub') subscribe.form = el.outerHTML;
        return;
      }
      if (el.tagName === 'H2') {
        // Nadpisy sekcí mají class "title"; h2 uvnitř <center> jsou
        // provozní hlášky (telefon, Bolt) — ty stránka zobrazuje po svém.
        if (el.classList.contains('title')) {
          const title = cleanText(el);
          if (title) pushSection(title);
        }
        return;
      }
      // UL v <center> nebo v GDPR popupu nejsou položky menu.
      if (!current || el.closest('center') || el.closest('#popupgdpr') || el.closest('form')) return;
      Array.prototype.forEach.call(el.querySelectorAll('li'), function (li) {
        if (li.querySelector('h2, h3')) return;
        const item = parseItem(li);
        if (item) current.items.push(item);
      });
    });

    return {
      sections: sections.filter(function (s) { return s.items.length > 0; }),
      subscribe: subscribe,
      published: parsePublished(doc),
    };
  }

  /* ── Datum z nadpisu "Jídelní lístek úterý 14. 7." ── */
  const DAY_NAMES = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  const MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  const DAY_KEYS = ['nedele', 'pondeli', 'utery', 'streda', 'ctvrtek', 'patek', 'sobota'];

  function parsePublished(doc) {
    const h1 = doc.querySelector('h1');
    if (!h1) return null;
    const raw = cleanText(h1);
    const n = normalize(raw);

    let dayIdx = -1;
    for (let i = 0; i < DAY_KEYS.length; i++) {
      if (n.indexOf(DAY_KEYS[i]) >= 0) { dayIdx = i; break; }
    }

    const dm = raw.match(/(\d{1,2})\.\s*(\d{1,2})\./);
    if (dayIdx < 0 && !dm) return null;

    return {
      raw: raw,
      dayName: dayIdx >= 0 ? DAY_NAMES[dayIdx] : '',
      date: dm ? dm[1] + '. ' + MONTHS[parseInt(dm[2], 10) - 1] : '',
      // index Po–Pá pro záložky dnů; víkend a neznámý den = -1
      weekIdx: dayIdx >= 1 && dayIdx <= 5 ? dayIdx - 1 : -1,
    };
  }

  /* ── Veřejné API ── */
  function load(which) {
    const url = URLS[which];
    if (!url) return Promise.reject(new Error('Menubot: neznámý zdroj "' + which + '"'));
    return fetchWritten(url).then(parseMenu);
  }

  /* Menubot si na focus/keyup do skrytého pole zapisuje, že formulář
     vyplnil člověk. Jeho posluchače se navěsí dřív, než formulář vložíme
     do stránky, takže je po vložení navážeme znovu. */
  function bindSubscribeForm(root) {
    if (!root) return;
    const flag = root.querySelector('#mbevent');
    const input = root.querySelector('#mbtext');
    if (!flag || !input) return;
    const mark = function () { flag.value = 'ok'; };
    input.addEventListener('focus', mark);
    input.addEventListener('keyup', mark);

    const email = new URLSearchParams(window.location.search).get('email');
    if (email) input.value = email;
  }

  window.Menubot = { load: load, bindSubscribeForm: bindSubscribeForm, urls: URLS };
})();
