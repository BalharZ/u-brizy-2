/* ── SHARED SITE FOOTER ──
   Usage:
     <SiteFooter />              — subpage (links back to index.html)
     <SiteFooter isHome={true} /> — homepage (links use # anchors)
*/
function SiteFooter({ isHome = false }) {
  const base = isHome ? '' : 'index.html';

  const navLinks = [
    { l: 'Domů',       h: isHome ? '#' : 'index.html' },
    { l: 'Menu',       h: `${base}#menu` },
    { l: 'O nás',      h: `${base}#o-nas` },
    { l: 'Fotogalerie',h: `${base}#galerie` },
    { l: 'Kontakt',    h: `${base}#kontakt` },
    { l: 'Rezervace',  h: `${base}#rezervace` },
  ];

  return (
    <footer style={{
      background: 'var(--ink)',
      borderTop: '2px solid var(--gold)',
      padding: '56px 64px 36px',
    }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        {/* Top: logo + links */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
          gap: 48, paddingBottom: 48,
          borderBottom: '1px solid rgba(200,150,12,0.2)',
          marginBottom: 28,
        }}>
          <div>
            <img src="uploads/Balounova-restaurace-U-Břízy.png" alt="Logo"
              style={{ height: 84, display: 'block', marginBottom: 20 }} />
            <p style={{
              fontFamily: 'Lato', fontSize: 13, fontWeight: 300,
              color: 'rgba(191,201,184,0.55)', lineHeight: 1.8, maxWidth: 300,
            }}>
              Rodinná restaurace na Starém Spořilově. Česká kuchyně, čerstvé pivo a přátelská atmosféra od roku 1994.
            </p>
          </div>

          <div>
            <div style={{
              fontFamily: 'Lato', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--gold)', marginBottom: 20,
            }}>Navigace</div>
            {navLinks.map(({ l, h }) => (
              <a key={l} href={h} style={{
                display: 'block', fontFamily: 'Lato', fontSize: 13, fontWeight: 300,
                color: 'rgba(191,201,184,0.5)', textDecoration: 'none',
                marginBottom: 10, transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = 'rgba(191,201,184,0.5)'}>
                {l}
              </a>
            ))}
          </div>

          <div>
            <div style={{
              fontFamily: 'Lato', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--gold)', marginBottom: 20,
            }}>Kontakt</div>
            <p style={{
              fontFamily: 'Lato', fontSize: 13, fontWeight: 300,
              color: 'rgba(191,201,184,0.55)', lineHeight: 1.9, marginBottom: 12,
            }}>
              Jižní IX<br />141 00 Praha 4<br />Starý Spořilov
            </p>
            <a href="tel:+420272766782" style={{
              display: 'block', color: 'var(--gold)', textDecoration: 'none',
              fontSize: 14, fontWeight: 700, marginBottom: 6, transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.target.style.opacity='0.7'}
            onMouseLeave={e => e.target.style.opacity='1'}>
              +420 272 76 67 82
            </a>
            <a href="mailto:restauraceubrizy@seznam.cz" style={{
              color: 'rgba(191,201,184,0.45)', textDecoration: 'none',
              fontSize: 12, transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.target.style.color='#fff'}
            onMouseLeave={e => e.target.style.color='rgba(191,201,184,0.45)'}>
              restauraceubrizy@seznam.cz
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontFamily: 'Lato', fontSize: 12, color: 'rgba(191,201,184,0.3)' }}>
            © {new Date().getFullYear()} Balounova Restaurace U Břízy — Praha 4, Starý Spořilov
          </span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { l: 'Facebook',   h: 'https://m.facebook.com/restauraceubrizy/' },
              { l: 'Instagram',  h: 'https://www.instagram.com/restauraceubrizy/' },
              { l: 'Google Maps',h: `${base}#kontakt` },
            ].map(({ l, h }) => (
              <a key={l} href={h} style={{
                fontFamily: 'Lato', fontSize: 11, color: 'var(--gold)',
                textDecoration: 'none', fontWeight: 700,
                letterSpacing: '0.06em', transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.target.style.opacity='0.6'}
              onMouseLeave={e => e.target.style.opacity='1'}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
