import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    })

    if (error) {
      setMessage('Error updating profile')
    } else {
      setMessage('Profile updated!')
      // Also update profiles table
      await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)
    }
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-white border border-stone-200 rounded-lg p-6 max-w-md">
        <h2 className="font-semibold mb-4">Profile</h2>

        {message && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-md text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-stone-200 rounded-md bg-stone-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-md"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}