# Úprava lístků — nastavení a provoz

Klient si na `/vstup` upravuje tři lístky: stálý jídelní, pivní a nápojový.
Denní a týdenní menu se sem needituje, ta zůstávají v menubotu.

## Jak to funguje

Obsah lístků žije v `data/*.json`. Stránky si ho načtou při zobrazení
(`menu-data.js`). Když klient ve `/vstup` uloží změnu, serverová funkce ji
zkontroluje a commitne do tohoto repozitáře přes GitHub API. Vercel na commit
zareaguje přenasazením, takže na webu je změna zhruba do minuty.

Menu tak zůstává ve verzované historii — každá změna je běžný commit a jde
vrátit přes `git revert`. Žádná databáze.

```
prohlížeč /vstup → /api/save → kontrola dat → commit do GitHubu → Vercel nasadí → data/*.json
```

## Co nastavit ve Vercelu

Bez těchto čtyř proměnných admin nenaběhne. Vercel → Settings →
Environment Variables (Production i Preview):

| Proměnná | Co to je |
|---|---|
| `ADMIN_PASSWORD` | Heslo, které dostane klient. |
| `SESSION_SECRET` | Náhodný řetězec, min. 32 znaků. Podepisuje přihlašovací cookie. Nikdo ho nevidí. |
| `GITHUB_TOKEN` | Fine-grained token k tomuto repozitáři (níže). |
| `GITHUB_REPO` | `BalharZ/u-brizy-2` |
| `GITHUB_BRANCH` | Nepovinné, výchozí `main`. |

Náhodný `SESSION_SECRET` vyrobíš takhle:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### GitHub token

GitHub → Settings → Developer settings → Personal access tokens →
**Fine-grained tokens** → Generate new token:

- **Repository access:** Only select repositories → `u-brizy-2`
- **Permissions:** Repository permissions → **Contents: Read and write**.
  Nic jiného. Ten token nesmí umět víc, než přepsat soubory v tomhle repozitáři.
- **Expiration:** ideálně max. rok. Až vyprší, admin přestane ukládat
  (přihlášení bude fungovat dál) — vygeneruj nový a přepiš proměnnou.

Token se po vytvoření zobrazí jen jednou. Patří **výhradně** do proměnných
prostředí ve Vercelu, nikdy do repozitáře.

## Bezpečnost — co drží a co ne

Co je udělané:

- Heslo je jen v proměnné prostředí, do prohlížeče se nikdy neposílá.
  Porovnává se v konstantním čase, takže z rychlosti odpovědi nejde nic vyčíst.
- Přihlášení je HttpOnly + Secure + SameSite=Strict cookie podepsaná HMAC,
  platí 8 hodin. Podvrhnout ji bez `SESSION_SECRET` nejde (pokrývají testy).
- Osm pokusů o heslo za čtvrt hodiny z jedné IP, pak 429.
- Server přijímá jen tvar dat, který stránky umí vykreslit, a jen tři známé
  soubory v `data/`. Jinam než do těch tří cest zapsat nejde.
- GitHub token je jen na serveru; klient se k němu nedostane.
- `/vstup` má `noindex` v hlavičce stránky i v HTTP hlavičce.

Co je potřeba vědět:

- **Adresa `/vstup` není ochrana, jen klid od botů.** Skutečný zámek je heslo —
  musí být dlouhé a jinde nepoužité. Proto taky adresa záměrně **není**
  v `robots.txt`: ten je veřejný a napsat ji tam by ji vyvěsilo na odiv.
- Heslo je jedno sdílené, takže v historii commitů není poznat, kdo změnu
  udělal — jen že přišla z adminu. Pro jednoho klienta to stačí; kdyby lidí
  přibylo, chce to účty se jmény.
- Brzda na pokusy o heslo běží v paměti instance. Serverless instance se
  recyklují, takže je to zpomalení, ne tvrdý limit. Při dlouhém hesle to stačí.
- Kdyby heslo uniklo, útočník může přepsat texty a ceny v lístcích. Nic víc —
  na jiné soubory ani do nastavení nedosáhne. Náprava: `git revert` a změna
  `ADMIN_PASSWORD` ve Vercelu.

## Testy

```bash
node test/run.mjs
```

Kontrolují validaci dat a přihlašování. Nesahají na síť ani na GitHub.
Součástí je test, že skutečná `data/*.json` projdou validací beze změny —
ten upozorní, kdyby se formát dat rozešel s tím, co server přijímá.

## Když se přidá nová ikona sekce

Ikony jsou nakreslené v každé stránce zvlášť (`const ICONS`) a jejich seznam
je v `api/_validate.js`. Přidáním do stránky to nestačí — musí se dopsat i tam,
jinak ji server odmítne. Admin si seznam bere z `/api/config`, takže se
v nabídce objeví sama.

## Návod pro klienta

1. Otevřít **[web]/vstup**, zadat heslo. Přihlášení drží 8 hodin.
2. Nahoře vybrat lístek, kliknutím rozbalit sekci.
3. Upravit, co je potřeba. Šipkami ↑↓ jde měnit pořadí, křížkem mazat.
4. Dole **Uložit změny**. Do minuty je to na webu (stačí obnovit stránku).

Pár věcí, které je dobré klientovi říct:

- **Cena** se píše jen číslem, bez „Kč" — to doplní web sám. U jídel, která
  jsou v malé a velké porci, jde napsat `80 / 140`.
- **Pivo** má dvě políčka: 0,5 l a 0,3 l. Když se nalije jen jedna velikost,
  druhé se nechá prázdné.
- **Alergeny** se píšou jako čísla oddělená čárkou: `1,3,7`.
- Když něco nesedí, uložení se neprovede a nahoře se ukáže, co je špatně.
  Rozbité menu se na web nedostane.
