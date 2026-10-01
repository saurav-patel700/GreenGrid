import React from 'react';
import logoIcon from '../../assets/logo-icon.png';
import logoFull from '../../assets/logo.png';

export default function BrandLogo({
  height = '38px',
  showText = true,
  textColor = 'var(--color-text-primary)',
  textSize = '1.45rem',
  textWeight = 800,
  useFullLogo = false,
  className = '',
  style = {}
}) {
  if (useFullLogo && !showText) {
    return (
      <img
        src={logoFull}
        alt="GreenGrid"
        className={`greengrid-logo ${className}`}
        style={{
          height: height,
          width: 'auto',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block',
          ...style
        }}
      />
    );
  }

  return (
    <div
      className={`greengrid-brand ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.625rem',
        textDecoration: 'none',
        ...style
      }}
    >
      <img
        src={logoIcon}
        alt="GreenGrid Logo"
        style={{
          height: height,
          width: 'auto',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0
        }}
      />
      {showText && (
        <span
          className="greengrid-brand-text"
          style={{
            fontSize: textSize,
            fontWeight: textWeight,
            letterSpacing: '-0.025em',
            color: textColor,
            lineHeight: 1,
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            whiteSpace: 'nowrap',
            display: 'inline-block'
          }}
        >
          GreenGrid
        </span>
      )}
    </div>
  );
}
