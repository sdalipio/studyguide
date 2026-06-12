import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function Button({ children, variant = 'primary', style, ...props }) {
  const base = {
    border: 'none',
    cursor: 'pointer',
    borderRadius: 10,
    padding: '11px 20px',
    fontSize: 14.5,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
  }
  const variants = {
    primary: {
      background: 'linear-gradient(135deg,#0D9488,#0F766E)',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(13,148,136,0.30)',
    },
    ghost: {
      background: 'var(--bg-card)',
      color: 'var(--text-mid)',
      border: '1px solid var(--border)',
    },
  }
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  )
}

export function Card({ children, style }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--rule)',
        borderRadius: 14,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function BackLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: 'var(--text-muted)',
        fontSize: 13.5,
        marginBottom: 18,
      }}
    >
      <ChevronLeft size={16} />
      {children}
    </Link>
  )
}

export function SkeletonLines({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 16, width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  )
}

export function PageTitle({ overline, title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {overline && (
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: 'var(--primary)',
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          {overline}
        </div>
      )}
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, color: 'var(--text-dark)' }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ marginTop: 8, color: 'var(--text-mid)', fontSize: 15 }}>{subtitle}</p>
      )}
    </div>
  )
}
