import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Groups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) fetchGroups()
  }, [user])

  const fetchGroups = async () => {
    // Get groups where user is a member
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, role, groups(id, name, description, created_at)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (memberships) {
      const groupsData = memberships.map(m => ({
        ...m.groups,
        role: m.role
      }))
      setGroups(groupsData)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const { data, error } = await supabase
      .from('groups')
      .insert({ name, description, created_by: user.id })
      .select()

    if (!error && data) {
      // The trigger should auto-add creator as admin
      fetchGroups()
      setName('')
      setDescription('')
      setShowForm(false)
    }
    setSaving(false)
  }

  if (loading) return <div className="text-stone-500">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-stone-600">{groups.length} groups</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm"
        >
          {showForm ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Create Group</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-md"
                placeholder="e.g. Database Project Team"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-md"
                placeholder="What is this group for?"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-8 text-center text-stone-500">
          No groups yet. Create one to collaborate with others!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="bg-white border border-stone-200 rounded-lg p-5 hover:border-stone-300"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{group.name}</h3>
                <span className="text-xs px-2 py-1 bg-stone-100 rounded capitalize">{group.role}</span>
              </div>
              <p className="text-sm text-stone-500">{group.description || 'No description'}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}