import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
          position: 'relative',
        }}
      >
        {/* Stars decoration */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '2px',
                height: '2px',
                background: '#06b6d4',
                borderRadius: '50%',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Calendar icon - top left */}
          <rect x="15" y="20" width="35" height="35" rx="4" stroke="#06b6d4" strokeWidth="4" fill="none" />
          <path d="M20 30h25M30 20v10" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" />
          <rect x="22" y="35" width="6" height="6" fill="#06b6d4" />
          <rect x="32" y="35" width="6" height="6" fill="#06b6d4" />

          {/* Invoice/Document icon - top right */}
          <path d="M70 15h30a4 4 0 014 4v35a4 4 0 01-4 4H70a4 4 0 01-4-4V19a4 4 0 014-4z" stroke="#06b6d4" strokeWidth="4" fill="none" />
          <path d="M77 28h16M77 36h16M77 44h12" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />
          <circle cx="82" cy="26" r="2" fill="#06b6d4" />

          {/* Check/Task icon - bottom left */}
          <rect x="15" y="65" width="35" height="35" rx="4" stroke="#06b6d4" strokeWidth="4" fill="none" />
          <path d="M25 82l8 8 15-15" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {/* Clock icon - bottom right */}
          <circle cx="87" cy="82" r="18" stroke="#06b6d4" strokeWidth="4" fill="none" />
          <path d="M87 70v12l8 8" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
