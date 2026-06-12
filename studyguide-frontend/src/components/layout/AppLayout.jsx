import { Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { BookOpenText, Library } from 'lucide-react'
import { useDocuments } from '../../context/DocumentContext'

export default function AppLayout({ children }) {
  const { documents, refresh } = useDocuments()
  const location = useLocation()

  useEffect(() => {
    refresh()
  }, [refresh])

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
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <NavItem to="/" active={location.pathname === '/'} icon={<Library size={17} />}>
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
      </aside>

      <main style={{ flex: 1, padding: '40px 56px', maxWidth: 1100 }}>{children}</main>
    </div>
  )
}

function NavItem({ to, active, icon, children }) {
  return (
    <Link
      to={to}
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
