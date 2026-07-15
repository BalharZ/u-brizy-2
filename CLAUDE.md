# Balounova Restaurace U Břízy

Web restaurace na Starém Spořilově. Statické stránky na Vercelu, žádný build.

- **Živý web:** https://u-brizy-2.vercel.app
- **Repozitář:** BalharZ/u-brizy-2, výchozí větev `main`
- **Doména:** `balounovarestauraceubrizy.eu` na web zatím **nemíří** — běží na ní
  ještě starý WordPress na Apachi. Nezaměňovat, není to tenhle projekt.

## Jak to funguje

Každá stránka je samostatné HTML, které si v prohlížeči přes **Babel standalone**
zkompiluje vlastní JSX a vykreslí Reactem. **Není tu build ani package.json** —
co je v repozitáři, to Vercel servíruje. Úprava = editace HTML, žádné `npm run`.

Důsledek, na který je dobré myslet: stránky nemají obsah v HTML, staví ho JS až
v prohlížeči. Přidání dalšího runtime fetche proto SEO nezhoršuje, protože
vyhledávač už tak musí spustit JS.

`vercel.json` má `cleanUrls: true`, takže `/stale-menu` servíruje `stale-menu.html`.

## Kde se bere obsah

Tohle je nejdůležitější věc celého repozitáře — každý lístek má jiný zdroj:

| Stránka | Obsah odkud |
|---|---|
| `stale-menu.html`, `pivni-listek.html`, `napojovy-listek.html` | `data/*.json`, edituje klient na `/vstup` |
| `denni-menu.html`, `tydenni-nabidka.html` | živě z **menubot.cz** (`menubot.js`), klient edituje tam |
| `index.html`, `fotogalerie.html`, `voucher.html`, `seznam-alergenu.html` | natvrdo v souboru |

**Nikdy neupravuj ceny ve třech lístcích přímo v HTML** — obsah je v `data/*.json`
a stránka si ho načte přes `useMenuData()` z `menu-data.js`.

`menubot.js` odchytává `document.write()`, protože menubot.cz generuje JS, který
si jinak přepíše celou stránku. Pak si HTML rozebere na data.

## Sdílené soubory

Načítají se přes `<script type="text/babel" src="...">` a definují globální
funkce (napříč soubory to funguje, protože se volají až při renderu):

- `nav.js` — `SiteNav`, plus hook `useMobile()`, který používá skoro všechno
- `footer.js` — `SiteFooter`
- `menu-data.js` — `useMenuData()`, `MenuDataNotice`
- `menubot.js` — `window.Menubot`
- `menu.css` — CSS proměnné (`--wood`, `--gold`, `--cream`…), `.cg` = Lora

## Editor lístků (`/vstup`)

`vstup.html` + `api/*.js`. Klient uloží změnu → `api/save.js` ji zkontroluje →
commitne do repozitáře přes GitHub API → Vercel nasadí. Menu tak zůstává ve
verzované historii a jde vrátit revertem.

Podrobnosti, proměnné prostředí a návod pro klienta: **[ADMIN.md](ADMIN.md)**.

Soubory v `api/` s podtržítkem Vercel nevystavuje jako endpoint. Funkce jsou
**CommonJS** (`module.exports`) — package.json tu záměrně není, aby se Vercel
nesnažil buildit, takže žádné závislosti, jen `node:crypto` a globální `fetch`.

## Pasti, na které se dá naletět

**Cena má tři podoby** a každá stránka umí jinou:
- `58` — číslo, funguje všude
- `[68, 46]` — dvojice 0,5 / 0,3 l, vykreslit ji umí **jen pivní lístek**
  (`BeerItem` má `Array.isArray`); jinde by se zobrazila jako „6846"
- `"80 / 140"` — text pro malou/velkou porci (dva saláty ve stálém menu)

`api/_validate.js` tohle hlídá a povolí každý tvar jen tam, kde ho stránka umí.

**Ikony jsou nakreslené v každé stránce zvlášť** (`const ICONS`) a jejich seznam
je v `api/_validate.js`. Přidat ikonu do stránky nestačí — musí se dopsat i tam,
jinak ji server při ukládání odmítne. Admin si seznam bere z `/api/config`.

**Sekce s `compact: true`** se sype do vícesloupcové mřížky, takže se u dlouhých
seznamů čte zleva doprava místo shora dolů. Smysl to dává jen u krátkých položek —
teď to mají `prilohy`, `omacky` a `pecivo` ve stálém menu. Nápojový lístek to měl
u destilátů a četlo se to špatně, proto tam už není. `feature: true` sekci zvýrazní
(`steaky`, `drinky`).

**Položka bez ceny se vykreslí jako osamocené „Kč".** Validace ji propustí, stránka
ji ale neošetřuje — nepoužívat pro věci „dle denní nabídky", dokud se to nespraví.
Teď je bez ceny nula položek.

**`core.autocrlf=true`** — git na Windows přepisuje konce řádků při checkoutu.
Data v repozitáři i na webu mají vždy LF. Testy proto porovnávají obsah bez
ohledu na konce řádků; nepiš porovnání syrových bajtů, padalo by to.

## Testy

```bash
node test/run.mjs
```

Kontrolují validaci dat a přihlašování, nesahají na síť ani na GitHub. Součástí
je round-trip test, že skutečná `data/*.json` projdou validací beze změny — ten
upozorní, kdyby se formát dat rozešel s tím, co server přijímá.

## Lokální náhled

```
.claude/launch.json → "ubrizy" (npx serve, port 5500)
```

Statické stránky tím jedou. **API funkce ne** — na ty je potřeba `vercel dev`
nebo vlastní harness, který `api/*.js` obslouží.

## Čeká na vyřízení

- Ve `data/napojovy-listek.json` je 13 položek, které nejsou v tištěném ceníku
  (Ice Tea, žvýkačky, Diplomatico, Pyrat, Vídeňská, horká čokoláda, Moscow Mule,
  kešu, voda v plastu, Jupík, láhvová vína 0,7 l). Drží **starou cenu**, čeká se
  na vyjádření klienta. Kvůli horké čokoládě se sekce jmenuje „Teplé nápoje"
  místo „Teplé alkoholické nápoje" podle tisku.
- Alergeny u položek přidaných z nového ceníku jsou prázdné — v ceníku nejsou
  a zdravotní údaj si nelze vymýšlet.
- Jídelní a pivní lístek na nový ceník teprve čekají.

## Psaní

Web i komunikace s klientem jsou česky. Texty se drží věcného tónu bez
marketingového nádechu — viz existující obsah.
