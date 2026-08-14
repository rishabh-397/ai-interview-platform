import React, { useState } from 'react';

export default function CompanyLogo({ name, logoUrl, size = 20 }) {
  const [failed, setFailed] = useState(false);

  if (!logoUrl || failed) {
    const initial = (name || '?').charAt(0).toUpperCase();
    return (
      <div
        style={{
          width: size, height: size, borderRadius: 4, background: 'var(--accent)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.55, fontWeight: 700, flexShrink: 0,
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 4, objectFit: 'contain', background: 'white', flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}