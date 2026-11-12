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
    sm: { icon: 'w-7 h-7', text: 'text-sm', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9', text: 'text-base', sub: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', text: 'text-lg', sub: 'text-xs' },
    hero: { icon: 'w-16 h-16', text: 'text-2xl', sub: 'text-sm' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <img 
          src="/logo.png" 
          alt="Cyber Cafe Logo" 
          className={`${currentSize.icon} object-contain rounded-xl shadow-md shadow-orange-500/20`}
        />
        <div className="flex flex-col">
          <div className="font-black text-slate-900 leading-tight tracking-tight uppercase">
            CYBER<span className="text-[#E8771B]">CAFE</span>
          </div>
          {showSubtitle && (
            <div className="text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase -mt-0.5">
              SINCE 2026
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
        className={`${currentSize.icon} object-contain ${className}`}
      />
    );
  }

  const isWhite = variant === 'white';
  const iconSrc = isWhite ? '/icon-white.png' : '/icon-orange.png';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`${currentSize.icon} rounded-xl ${isWhite ? 'bg-white/15' : 'bg-orange-500/10'} p-1.5 flex items-center justify-center shrink-0`}>
        <img 
          src={iconSrc} 
          alt="Cyber Cafe Cart" 
          className="w-full h-full object-contain"
        />
      </div>
      <div className="flex flex-col">
        <div className={`font-black ${currentSize.text} leading-none tracking-tight ${isWhite ? 'text-white' : 'text-slate-900'} uppercase font-sans`}>
          CYBER<span className={isWhite ? 'text-orange-200' : 'text-[#E8771B]'}>CAFE</span>
        </div>
        {showSubtitle && (
          <div className={`font-bold ${currentSize.sub} tracking-[0.22em] uppercase mt-0.5 ${isWhite ? 'text-white/80' : 'text-slate-400'}`}>
            SINCE 2026
          </div>
        )}
      </div>
    </div>
  );
}
