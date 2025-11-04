import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Calendar icon */}
          <rect x="3" y="4" width="7" height="7" rx="1" stroke="#06b6d4" strokeWidth="1.5" fill="none" />
          <path d="M4 6h5M6 4v2" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />

          {/* Invoice/Document icon */}
          <path d="M14 3h5a1 1 0 011 1v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="#06b6d4" strokeWidth="1.5" fill="none" />
          <path d="M15 6h3M15 8h3" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />

          {/* Clock icon */}
          <circle cx="7" cy="17" r="4" stroke="#06b6d4" strokeWidth="1.5" fill="none" />
          <path d="M7 15v2l1.5 1.5" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Check/Task icon */}
          <rect x="13" y="14" width="7" height="7" rx="1" stroke="#06b6d4" strokeWidth="1.5" fill="none" />
          <path d="M15 17.5l1.5 1.5 3-3" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
