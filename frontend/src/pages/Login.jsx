import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2">Project</h1>
          <h2 className="text-3xl font-bold mb-2 mt-10">Welcome back</h2>
          <p className="text-gray-600 mb-8">Sign in to continue managing your tasks</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                placeholder="you@university.ac.uk"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-800 text-white py-3 rounded-lg font-medium hover:bg-stone-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-stone-800 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Promo */}
      <div className="hidden lg:flex w-5/12 bg-stone-800 items-center justify-center p-10">
        <div className="text-white max-w-sm">
          <h2 className="text-3xl font-bold mb-4">Stay on top of your coursework</h2>
          <p className="opacity-80">
            Track deadlines, manage assignments, and monitor your grades across all modules in one place.
          </p>
        </div>
      </div>
    </div>
  )
}