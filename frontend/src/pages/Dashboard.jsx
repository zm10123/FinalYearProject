import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-4">Welcome, {user?.email}</p>
      <button
        onClick={handleSignOut}
        className="bg-stone-800 text-white px-4 py-2 rounded-lg"
      >
        Sign Out
      </button>
    </div>
  )
}