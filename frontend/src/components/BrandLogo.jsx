import React from 'react';

/**
 * Cyber Cafe Official Brand Logo Component (Since 2026)
 * Matches https://www.design.com/share/7adb4477-0fb9-40df-8aa3-cb150b23dabb
 */
export default function BrandLogo({ 
  variant = 'orange', // 'orange' | 'white' | 'badge' | 'icon-only'
  size = 'md',        // 'sm' | 'md' | 'lg' | 'hero'
  showSubtitle = true,
  className = '' 
}) {
  const sizeMap = {
    sm: { icon: 28, text: '1.05rem', sub: '0.62rem' },
    md: { icon: 38, text: '1.25rem', sub: '0.7rem' },
    lg: { icon: 48, text: '1.5rem', sub: '0.8rem' },
    hero: { icon: 64, text: '2rem', sub: '0.95rem' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  if (variant === 'badge') {
    return (
      <div className={`brand-logo-badge ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        <img 
          src="/logo-clean.png" 
          alt="Cyber Cafe Logo" 
          style={{ 
            height: currentSize.icon + 8, 
            width: currentSize.icon + 8, 
            objectFit: 'contain', 
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(232, 119, 27, 0.25)' 
          }}
          onError={(e) => { e.currentTarget.src = '/logo.png'; }}
        />
        <div>
          <div style={{ 
            fontWeight: 800, 
            fontSize: currentSize.text, 
            lineHeight: 1.1, 
            letterSpacing: '0.5px',
            color: '#1E293B'
          }}>
            CYBER<span style={{ color: '#E8771B' }}>CAFE</span>
          </div>
          {showSubtitle && (
            <div style={{ 
              fontSize: currentSize.sub, 
              fontWeight: 600, 
              color: '#94A3B8', 
              letterSpacing: '2px', 
              textTransform: 'uppercase' 
            }}>
              Since 2026
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'icon-only') {
    return (
      <img 
        src="/icon-orange.png" 
        alt="Cyber Cafe" 
        className={className}
        style={{ height: currentSize.icon, width: 'auto', objectFit: 'contain' }}
      />
    );
  }

  const isWhite = variant === 'white';
  const textColor = isWhite ? '#FFFFFF' : '#1E293B';
  const subColor = isWhite ? 'rgba(255,255,255,0.8)' : '#94A3B8';
  const iconSrc = isWhite ? '/icon-white.png' : '/icon-orange.png';

  return (
    <div className={`brand-logo-component ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: currentSize.icon + 6,
        height: currentSize.icon + 6,
        borderRadius: '12px',
        background: isWhite ? 'rgba(255,255,255,0.15)' : 'rgba(232, 119, 27, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px'
      }}>
        <img 
          src={iconSrc} 
          alt="Cyber Cafe Cart" 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
      <div>
        <div style={{ 
          fontWeight: 900, 
          fontSize: currentSize.text, 
          lineHeight: 1.1, 
          letterSpacing: '0.5px',
          color: textColor,
          fontFamily: "'Inter', sans-serif"
        }}>
          CYBER<span style={{ color: '#E8771B' }}>CAFE</span>
        </div>
        {showSubtitle && (
          <div style={{ 
            fontSize: currentSize.sub, 
            fontWeight: 700, 
            color: subColor, 
            letterSpacing: '2.5px', 
            textTransform: 'uppercase' 
          }}>
            SINCE 2026
          </div>
        )}
      </div>
    </div>
  );
}
