import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/tasks', label: 'Tasks' },
    { to: '/calendar', label: 'Calendar' },
    { to: '/groups', label: 'Groups' },
  ]

  const secondaryNav = [
    { to: '/archive', label: 'Archive' },
    { to: '/settings', label: 'Settings' },
  ]

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">Project</div>

        <nav className="nav-section">
          <div className="nav-label">Main</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <nav className="nav-section">
          <div className="nav-label">Other</div>
          {secondaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">
              {user?.user_metadata?.full_name || 'User'}
            </div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button onClick={handleSignOut} className="signout-btn">
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}