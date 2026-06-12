import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BookOpenText, Library, Menu, X } from 'lucide-react'
import { useDocuments } from '../../context/DocumentContext'
import { useIsMobile } from '../../utils/useIsMobile'

export default function AppLayout({ children }) {
  const { documents, refresh } = useDocuments()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    refresh()
  }, [refresh])

  // The drawer closes via `onNavigate` on every link, so any navigation from it
  // dismisses it — no route-change effect needed.
  const close = () => setDrawerOpen(false)
  const sidebar = <SidebarContent documents={documents} location={location} onNavigate={close} />

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
            background: 'var(--sidebar-bg)',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dark)', display: 'grid', placeItems: 'center', padding: 6 }}
          >
            <Menu size={22} />
          </button>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#0D9488,#0F766E)', display: 'grid', placeItems: 'center' }}>
              <BookOpenText size={16} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 17, color: 'var(--text-dark)' }}>
              StudyGuide
            </span>
          </Link>
        </header>

        {drawerOpen && (
          <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.45)', zIndex: 40 }} />
        )}

        <aside
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: 270,
            zIndex: 41,
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--rule)',
            padding: '28px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
            boxShadow: drawerOpen ? '0 10px 40px rgba(0,0,0,0.2)' : 'none',
          }}
        >
          <button
            onClick={close}
            aria-label="Close menu"
            style={{ position: 'absolute', top: 14, right: 14, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
          {sidebar}
        </aside>

        <main style={{ padding: '76px 16px 32px' }}>{children}</main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 270,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--rule)',
          padding: '28px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {sidebar}
      </aside>

      <main style={{ flex: 1, padding: '40px 56px', maxWidth: 1100 }}>{children}</main>
    </div>
  )
}

function SidebarContent({ documents, location, onNavigate }) {
  return (
    <>
      <Link to="/" onClick={onNavigate} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg,#0D9488,#0F766E)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
          }}
        >
          <BookOpenText size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 19, color: 'var(--text-dark)' }}>
            StudyGuide
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.3 }}>
            AI Reading Room
          </div>
        </div>
      </Link>

      <nav>
        <NavItem to="/library" active={location.pathname === '/library'} icon={<Library size={17} />} onClick={onNavigate}>
          Library
        </NavItem>
      </nav>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 12 }}>
          Recent
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {documents.slice(0, 8).map((d) => (
            <Link
              key={d.id}
              to={`/doc/${d.id}`}
              onClick={onNavigate}
              style={{
                fontSize: 13.5,
                color: 'var(--text-mid)',
                padding: '8px 10px',
                borderRadius: 8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {d.title}
            </Link>
          ))}
          {documents.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No documents yet
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function NavItem({ to, active, icon, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 9,
        fontSize: 14.5,
        fontWeight: 500,
        color: active ? 'var(--primary-dark)' : 'var(--text-mid)',
        background: active ? 'var(--primary-light)' : 'transparent',
      }}
    >
      {icon}
      {children}
    </Link>
  )
}
