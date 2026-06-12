import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useIsMobile } from '../utils/useIsMobile'

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
    danger: {
      background: 'var(--danger)',
      color: '#fff',
    },
  }
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  )
}

export function ProgressBar({ value = 0 }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div style={{ height: 6, borderRadius: 999, background: 'var(--rule)', overflow: 'hidden' }}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: 'linear-gradient(90deg,#0D9488,#0F766E)',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}

// On-brand confirmation modal. Renders nothing when `open` is false.
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28,25,23,0.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 50,
        padding: 20,
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--rule)',
          borderRadius: 16,
          padding: 28,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 18px 50px rgba(0,0,0,0.25)',
        }}
      >
        <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text-dark)' }}>
          {title}
        </h3>
        {message && (
          <p style={{ marginTop: 10, marginBottom: 0, color: 'var(--text-mid)', fontSize: 14.5, lineHeight: 1.6 }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </motion.div>
    </div>
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

// A row of "Set 1 / Set 2 / …" chips for switching between generated sets.
// Hidden when there's only one set (nothing to switch to).
export function SetSwitcher({ sets, active, onSelect }) {
  if (!sets || sets.length <= 1) return null
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {sets.map((n) => {
        const isActive = n === active
        return (
          <button
            key={n}
            onClick={() => onSelect(n)}
            style={{
              border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
              background: isActive ? 'var(--primary-light)' : 'var(--bg-card)',
              color: isActive ? 'var(--primary-dark)' : 'var(--text-mid)',
              borderRadius: 999,
              padding: '6px 15px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Set {n}
          </button>
        )
      })}
    </div>
  )
}

export function PageTitle({ overline, title, subtitle }) {
  const isMobile = useIsMobile()
  return (
    <div style={{ marginBottom: isMobile ? 20 : 28 }}>
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
      <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.2 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ marginTop: 8, color: 'var(--text-mid)', fontSize: isMobile ? 14 : 15 }}>{subtitle}</p>
      )}
    </div>
  )
}
