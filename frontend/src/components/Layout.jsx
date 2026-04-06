import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Layout({ children }) {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navigation = [
    { name: 'Dashboard', path: '/'},
    { name: 'Tasks', path: '/tasks'},
    { name: 'Calendar', path: '/calendar'},
    { name: 'Groups', path: '/groups'},
  ]

  const secondaryNav = [
    { name: 'Templates', path: '/templates'},
    { name: 'Pomodoro', path: '/pomodoro'},
    { name: 'Archive', path: '/archive'},
    { name: 'Settings', path: '/settings'},
  ]

  function isActive(path) {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // get user initials for avatar
  function getInitials() {
    if (!user) return '?'
    const email = user.email || ''
    return email[0]?.toUpperCase() || '?'
  }

  return (
    <div className="flex h-screen bg-stone-50">
      {/* sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-white border-r border-stone-200 flex flex-col transition-all duration-200`}>
        {/* logo */}
        <div className="px-5 py-5 border-b border-stone-100">
          <Link to="/" className="flex items-center gap-2">
            {sidebarOpen ? (
              <span className="text-lg font-bold tracking-tight">Productivity</span>
            ) : (
              <span className="text-lg font-bold">P</span>
            )}
          </Link>
        </div>

        {/* main nav */}
        <nav className="flex-1 px-3 py-4">
          {sidebarOpen && (
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 px-3 mb-2">Main</div>
          )}
          <div className="space-y-1">
            {navigation.map(item => (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(item.path)
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}>
                <span className="text-base w-5 text-center">{item.icon}</span>
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            ))}
          </div>

          {sidebarOpen && (
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 px-3 mb-2 mt-6">Tools</div>
          )}
          <div className="space-y-1 mt-2">
            {secondaryNav.map(item => (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(item.path)
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}>
                <span className="text-base w-5 text-center">{item.icon}</span>
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            ))}
          </div>
        </nav>

        {/* collapse button */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mx-3 mb-2 px-3 py-2 text-xs text-stone-400 hover:text-stone-600 rounded hover:bg-stone-100 text-left">
          {sidebarOpen ? '← Collapse' : '→'}
        </button>

        {/* user section */}
        <div className="border-t border-stone-200 px-3 py-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center text-xs font-semibold text-stone-600">
              {getInitials()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-stone-700 truncate">{user?.email}</div>
                <button onClick={signOut}
                  className="text-xs text-stone-400 hover:text-stone-600">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* mobile menu toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white border border-stone-200 rounded-lg flex items-center justify-center shadow-sm">
        ☰
      </button>

      {/* main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
