import logoImg from '../assets/logo.png'

export function KaamSetuEmblem({ size = 38, className = '' }) {
  return (
    <div
      className={`brand-logo-emblem ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size > 40 ? '14px' : '10px'
      }}
    >
      <img
        src={logoImg}
        alt="KaamSetu Emblem"
        className="brand-emblem-crop"
        style={{
          width: size * 1.55,
          height: size * 1.55
        }}
      />
    </div>
  )
}

export function Logo({ language = 'hi', size = 'default', showWordmark = true, onClick }) {
  const isLarge = size === 'large'
  const isEnglish = language === 'en'

  // Large logo for Landing Page and Splash animation
  if (isLarge) {
    return (
      <div
        className={`landing-logo-container ${onClick ? 'clickable' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <img
          src={logoImg}
          alt="KaamSetu"
          className="landing-full-logo-img"
        />
      </div>
    )
  }

  // Default header logo: cropped emblem avatar + crisp localized wordmark
  return (
    <div
      className={`brand-container ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="brand-logo-emblem">
        <img
          src={logoImg}
          alt="KaamSetu Emblem"
          className="brand-emblem-crop"
        />
      </div>
      {showWordmark && (
        <div className="brand-wordmark">
          {isEnglish ? (
            <span className="lang-en">
              <strong>Kaam</strong>
              <span className="brand-accent">Setu</span>
            </span>
          ) : (
            <span className="lang-hi">
              <strong>काम</strong>
              <span className="brand-accent">सेतु</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default Logo
