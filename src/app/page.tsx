'use client';

import dynamic from 'next/dynamic';

// Splash screen shown while App bundle is loading (replaces index.html splash)
function SplashScreen() {
  return (
    <div
      style={{
        backgroundColor: '#0f0f0f',
        height: '100dvh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Animated orbit ring */}
        <div
          style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            animation: 'orbit 2s linear infinite',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #D4AF37 0%, transparent 40%)',
              maskImage: 'radial-gradient(circle, transparent 48%, black 48.5%, black 50%, transparent 50.5%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 48%, black 48.5%, black 50%, transparent 50.5%)',
              opacity: 0.8,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '8px',
              height: '8px',
              backgroundColor: '#D4AF37',
              borderRadius: '50%',
              boxShadow: '0 0 15px 4px rgba(212, 175, 55, 0.6)',
            }}
          />
        </div>
        {/* Central logo */}
        <div
          style={{
            position: 'relative',
            zIndex: 20,
            width: '80px',
            height: '80px',
            backgroundColor: '#212121',
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          { }
          <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} alt="ScénarIA" />
        </div>
      </div>
      {/* Title */}
      <div style={{ marginTop: '48px', textAlign: 'center' }}>
        <h2
          style={{
            color: 'white',
            fontWeight: 'bold',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            margin: 0,
            fontSize: '1.25rem',
          }}
        >
          Scénar<span style={{ color: '#D4AF37' }}>IA</span>
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.4em',
            fontSize: '9px',
            marginTop: '14px',
          }}
        >
          L&apos;IA au service de votre imagination
        </p>
      </div>
    </div>
  );
}

// Disable SSR — the app relies on localStorage, window, Firebase, etc.
const App = dynamic(() => import('@/App'), {
  ssr: false,
  loading: () => <SplashScreen />,
});

export default function Page() {
  return <App />;
}
