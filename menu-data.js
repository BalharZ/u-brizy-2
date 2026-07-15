/* ── SDÍLENÉ NAČÍTÁNÍ LÍSTKŮ ──
   Obsah lístků žije v data/*.json, aby ho šlo editovat ze stránky /vstup.
   Stránka si data načte při zobrazení a vykreslí je vlastním designem.

   Použití:
     const menu = useMenuData('data/stale-menu.json');
     menu.status  — 'loading' | 'ready' | 'error'
     menu.sections
*/
function useMenuData(url) {
  const [state, setState] = React.useState({ status: 'loading', sections: [] });

  React.useEffect(() => {
    let alive = true;
    fetch(url, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (sections) {
        if (!Array.isArray(sections)) throw new Error('Neplatný formát dat');
        if (alive) setState({ status: 'ready', sections: sections });
      })
      .catch(function (err) {
        console.error('Nepodařilo se načíst ' + url, err);
        if (alive) setState({ status: 'error', sections: [] });
      });
    return function () { alive = false; };
  }, [url]);

  return state;
}

/* Stavová hláška ve stylu MenuNotice z denního menu. */
function MenuDataNotice({ status }) {
  const mob = useMobile();
  if (status !== 'loading' && status !== 'error') return null;

  const loading = status === 'loading';

  return (
    <section className="paper" style={{
      padding: mob ? '56px 16px' : '96px 64px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 className="cg" style={{
          fontSize: mob ? 26 : 34, fontWeight: 500, fontStyle: 'italic',
          color: 'var(--wood)', marginBottom: 12,
        }}>
          {loading ? 'Načítáme lístek…' : 'Lístek se nepodařilo načíst'}
        </h2>
        <p style={{
          fontFamily: 'Lato', fontSize: mob ? 14 : 16,
          color: 'var(--mid)', lineHeight: 1.6,
        }}>
          {loading
            ? 'Chvilku strpení.'
            : 'Zkuste prosím stránku načíst znovu. Aktuální nabídku vám rádi řekneme i telefonicky na 272 76 67 82.'}
        </p>
      </div>
    </section>
  );
}
