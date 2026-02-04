import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Navigation items
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
    <div className="min-h-screen flex bg-stone-100">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-stone-200 p-4 flex flex-col">
        <div className="text-lg font-bold px-3 mb-8">Project</div>

        {/* Main nav */}
        <nav className="mb-6">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide px-3 mb-2">
            Main
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 ${
                  isActive
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Secondary nav */}
        <nav className="mb-6">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide px-3 mb-2">
            Other
          </div>
          {secondaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 ${
                  isActive
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="mt-auto pt-4 border-t border-stone-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-stone-200 border-2 border-stone-300" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.user_metadata?.full_name || 'User'}
              </div>
              <div className="text-xs text-stone-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-md"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}