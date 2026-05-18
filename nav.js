/* ── SHARED SITE NAVIGATION ──
   Usage:
     <SiteNav />              — subpage (solid nav, links back to index.html)
     <SiteNav isHome={true} /> — homepage (transparent→solid on scroll)
     <SiteNav activePage="Denní menu" /> — highlight active item
*/

/* ── useMobile hook — globally available to all pages ── */
function useMobile(bp = 768) {
  const [mob, setMob] = React.useState(() => window.innerWidth < bp);
  React.useEffect(() => {
    const fn = () => setMob(window.innerWidth < bp);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [bp]);
  return mob;
}

function SiteNav({ isHome = false, activePage = null }) {
  const [scrolled, setScrolled] = React.useState(false);
  const mob = useMobile();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    let raf;
    const tick = () => {
      setScrolled((window.pageYOffset || document.documentElement.scrollTop || 0) > 70);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  React.useEffect(() => {
    if (!mob) setMobileOpen(false);
  }, [mob]);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const [openMenu, setOpenMenu] = React.useState(false);
  const closeTimer = React.useRef(null);
  const openDropdown = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(true);
  };
  const closeDropdown = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(false), 180);
  };

  const base = isHome ? '' : '/';

  const links = [
    { l: 'Domů', h: isHome ? '#' : '/' },
    {
      l: 'Jídelní menu',
      children: [
        { l: 'Denní menu',      h: '/denni-menu' },
        { l: 'Týdenní nabídka', h: '/tydenni-nabidka' },
        { l: 'Stálé menu',      h: '/stale-menu' },
        { l: 'Nápojový lístek', h: '/napojovy-listek' },
        { l: 'Pivní lístek',   h: '/pivni-listek' },
        { l: 'Seznam alergenů', h: '/seznam-alergenu' },
      ],
    },
    { l: 'Galerie', h: '/galerie' },
    { l: 'Voucher', h: '/voucher' },
    { l: 'O nás',   h: `${base}#o-nas` },
    { l: 'Kontakt', h: `${base}#kontakt` },
  ];

  const linkColor = (label) => {
    if (label === activePage) return 'var(--gold)';
    return scrolled ? 'var(--mid)' : 'rgba(255,255,255,0.92)';
  };

  const isSolid = scrolled || !isHome;

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
        height: mob ? (scrolled ? 56 : 80) : (scrolled ? 72 : 124),
        background: isSolid ? 'rgba(244,241,232,0.97)' : 'transparent',
        backdropFilter: isSolid ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: isSolid ? 'blur(12px)' : 'none',
        borderBottom: isSolid ? '1px solid rgba(92,112,100,0.2)' : 'none',
        transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', alignItems: 'center',
        padding: mob ? '0 20px' : '0 52px',
      }}>
        {/* Logo */}
        <a href={isHome ? '#' : '/'} style={{
          display: 'flex', alignItems: 'center',
          marginRight: 'auto', textDecoration: 'none',
        }}>
          <img src="uploads/Balounova-restaurace-U-Břízy.png" alt="U Břízy"
            style={{
              height: mob ? (scrolled ? 38 : 62) : (scrolled ? 52 : 96),
              width: 'auto', display: 'block',
              filter: isSolid
                ? 'none'
                : 'drop-shadow(0 2px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 14px rgba(0,0,0,0.35))',
              transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
        </a>

        {/* Desktop links */}
        {!mob && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: scrolled ? 'transparent' : 'rgba(20,12,6,0.6)',
            backdropFilter: scrolled ? 'none' : 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: scrolled ? 'none' : 'blur(14px) saturate(140%)',
            border: scrolled ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
            padding: scrolled ? 0 : '6px 8px 6px 20px',
            transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {links.map((item) => {
              if (item.children) {
                return (
                  <div key={item.l}
                    onMouseEnter={openDropdown}
                    onMouseLeave={closeDropdown}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <a href="#"
                      onClick={(e) => e.preventDefault()}
                      style={{
                        fontFamily: 'Lato', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        color: scrolled ? 'var(--mid)' : 'rgba(255,255,255,0.92)',
                        textDecoration: 'none', transition: 'color 0.2s',
                        padding: scrolled ? '0 14px' : '0 12px',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        cursor: 'pointer',
                      }}>
                      {item.l}
                      <span style={{
                        fontSize: 8,
                        transform: openMenu ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s',
                        opacity: 0.7,
                      }}>▼</span>
                    </a>
                    {openMenu && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 12px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        minWidth: 240,
                        background: scrolled ? 'rgba(244,241,232,0.98)' : 'rgba(20,12,6,0.92)',
                        backdropFilter: 'blur(16px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                        border: scrolled
                          ? '1px solid rgba(92,112,100,0.2)'
                          : '1px solid rgba(255,255,255,0.14)',
                        borderTop: '2px solid var(--gold)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
                        padding: '6px 0',
                        zIndex: 400,
                      }}>
                        {item.children.map((c) => (
                          <a key={c.l} href={c.h}
                            style={{
                              display: 'block',
                              fontFamily: 'Lato', fontSize: 11, fontWeight: 700,
                              letterSpacing: '0.16em', textTransform: 'uppercase',
                              color: c.l === activePage ? 'var(--gold)' : (scrolled ? 'var(--mid)' : 'rgba(255,255,255,0.92)'),
                              textDecoration: 'none',
                              padding: '14px 22px',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s',
                              borderLeft: c.l === activePage ? '2px solid var(--gold)' : '2px solid transparent',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--gold)';
                              e.currentTarget.style.background = scrolled ? 'rgba(200,150,12,0.06)' : 'rgba(200,150,12,0.1)';
                              e.currentTarget.style.borderLeftColor = 'var(--gold)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = c.l === activePage ? 'var(--gold)' : (scrolled ? 'var(--mid)' : 'rgba(255,255,255,0.92)');
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderLeftColor = c.l === activePage ? 'var(--gold)' : 'transparent';
                            }}>
                            {c.l}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <a key={item.l} href={item.h} style={{
                  fontFamily: 'Lato', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: linkColor(item.l),
                  textDecoration: 'none', transition: 'color 0.2s',
                  padding: scrolled ? '0 14px' : '0 12px',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (item.l !== activePage) e.currentTarget.style.color = 'var(--gold)'; }}
                onMouseLeave={e => { if (item.l !== activePage) e.currentTarget.style.color = linkColor(item.l); }}>
                  {item.l}
                </a>
              );
            })}
            <a href="https://food.bolt.eu/en-US/271-prague/p/31855-restaurace-u-b%C5%99%C3%ADzy"
              target="_blank" rel="noopener" style={{
                fontFamily: 'Lato', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: scrolled ? 'var(--gold)' : '#fff',
                background: scrolled ? 'transparent' : 'var(--gold)',
                textDecoration: 'none',
                border: '1px solid var(--gold)',
                padding: '10px 22px',
                marginLeft: scrolled ? 16 : 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = scrolled ? 'var(--gold)' : '#a87a08'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = scrolled ? 'transparent' : 'var(--gold)'; e.currentTarget.style.color = scrolled ? 'var(--gold)' : '#fff'; }}>
              Rozvoz jídel
            </a>
          </div>
        )}

        {/* Mobile hamburger button */}
        {mob && (
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Zavřít menu' : 'Otevřít menu'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 8, color: 'var(--mid)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              alignItems: 'center', gap: 5, width: 40, height: 40,
            }}>
            <span style={{
              display: 'block', width: 22, height: 2,
              background: isSolid ? 'var(--mid)' : '#fff', transformOrigin: 'center',
              transform: mobileOpen ? 'rotate(45deg) translate(0, 7px)' : 'none',
              transition: 'transform 0.25s, background 0.45s',
            }} />
            <span style={{
              display: 'block', width: 22, height: 2,
              background: isSolid ? 'var(--mid)' : '#fff',
              opacity: mobileOpen ? 0 : 1,
              transition: 'opacity 0.2s, background 0.45s',
            }} />
            <span style={{
              display: 'block', width: 22, height: 2,
              background: isSolid ? 'var(--mid)' : '#fff', transformOrigin: 'center',
              transform: mobileOpen ? 'rotate(-45deg) translate(0, -7px)' : 'none',
              transition: 'transform 0.25s, background 0.45s',
            }} />
          </button>
        )}
      </nav>

      {/* Mobile overlay menu */}
      {mob && mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 290,
          background: 'var(--ink)',
          display: 'flex', flexDirection: 'column',
          paddingTop: 64, overflowY: 'auto',
        }}>
          <div style={{ flex: 1, padding: '16px 0 0' }}>
            {links.map(item => {
              if (item.children) {
                return (
                  <div key={item.l}>
                    <div style={{
                      fontFamily: 'Lato', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.28em', textTransform: 'uppercase',
                      color: 'var(--gold)', padding: '20px 28px 8px',
                      opacity: 0.85,
                    }}>
                      {item.l}
                    </div>
                    {item.children.map(c => (
                      <a key={c.l} href={c.h} onClick={() => setMobileOpen(false)} style={{
                        display: 'block',
                        fontFamily: 'Lora', fontSize: 19, fontStyle: 'italic', fontWeight: 500,
                        color: c.l === activePage ? 'var(--gold)' : 'rgba(239,232,213,0.85)',
                        textDecoration: 'none',
                        padding: '12px 28px 12px 36px',
                        borderLeft: c.l === activePage ? '2px solid var(--gold)' : '2px solid transparent',
                      }}>
                        {c.l}
                      </a>
                    ))}
                  </div>
                );
              }
              return (
                <a key={item.l} href={item.h} onClick={() => setMobileOpen(false)} style={{
                  display: 'block',
                  fontFamily: 'Lora', fontSize: 24, fontStyle: 'italic', fontWeight: 500,
                  color: item.l === activePage ? 'var(--gold)' : 'rgba(239,232,213,0.9)',
                  textDecoration: 'none',
                  padding: '15px 28px',
                  borderLeft: item.l === activePage ? '2px solid var(--gold)' : '2px solid transparent',
                }}>
                  {item.l}
                </a>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div style={{ padding: '20px 28px 32px', borderTop: '1px solid rgba(200,150,12,0.18)' }}>
            <a href="https://food.bolt.eu/en-US/271-prague/p/31855-restaurace-u-b%C5%99%C3%ADzy"
              target="_blank" rel="noopener"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '15px',
                background: 'var(--gold)', color: 'var(--wood)',
                textDecoration: 'none',
                fontFamily: 'Lato', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>
              Rozvoz jídel
            </a>
            <a href="tel:+420272766782" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, marginTop: 14,
              color: 'rgba(239,232,213,0.45)', textDecoration: 'none',
              fontFamily: 'Lato', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
            }}>
              +420 272 76 67 82
            </a>
          </div>
        </div>
      )}
    </>
  );
}
