import React from 'react';

export default function BackgroundVideo() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -2, overflow: 'hidden' }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 12, 18, 0.72)' }} />
    </div>
  );
}