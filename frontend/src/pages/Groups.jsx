import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getGroups, createGroup, acceptInvite, declineInvite } from '../services/groupService'

function Groups() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // create form
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newModule, setNewModule] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    setLoading(true)
    const { data, error: err } = await getGroups()
    if (data) setGroups(data)
    if (err) setError(err.message)
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) {
      setError('Group name is required')
      return
    }
    setCreating(true)
    setError('')

    const { data, error: err } = await createGroup(
      newName.trim(),
      newDescription.trim(),
      newModule.trim()
    )

    if (err) {
      setError(err.message)
      setCreating(false)
    } else {
      setShowCreate(false)
      setNewName('')
      setNewDescription('')
      setNewModule('')
      setCreating(false)
      // go straight to the new group
      navigate(`/groups/${data.id}`)
    }
  }

  async function handleAccept(groupId) {
    const { error: err } = await acceptInvite(groupId)
    if (!err) await loadGroups()
  }

  async function handleDecline(groupId) {
    const { error: err } = await declineInvite(groupId)
    if (!err) await loadGroups()
  }

  // split into accepted groups and pending invites
  const myGroups = groups.filter(g => g.memberStatus === 'accepted')
  const pendingInvites = groups.filter(g => g.memberStatus === 'pending')

  if (loading) return <div className="p-8 text-stone-400">Loading groups...</div>

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-stone-500 text-sm">Manage your project teams</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-stone-900 text-white rounded text-sm font-medium hover:bg-stone-800">
          + Create Group
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</div>
      )}

      {/* pending invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-stone-500 mb-3">Pending Invites</h3>
          <div className="space-y-3">
            {pendingInvites.map(group => (
              <div key={group.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{group.name}</div>
                  {group.module && (
                    <div className="text-xs text-stone-500 mt-0.5">{group.module}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(group.id)}
                    className="px-3 py-1.5 text-xs bg-stone-900 text-white rounded hover:bg-stone-800">
                    Accept
                  </button>
                  <button onClick={() => handleDecline(group.id)}
                    className="px-3 py-1.5 text-xs border border-stone-300 rounded hover:bg-stone-50">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* group list */}
      {myGroups.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg mb-2">No groups yet</p>
          <p className="text-sm">Create a group to collaborate with classmates</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myGroups.map(group => (
            <Link key={group.id} to={`/groups/${group.id}`}
              className="bg-white border border-stone-200 rounded-lg p-5 hover:border-stone-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold">{group.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  group.userRole === 'admin' ? 'bg-purple-50 text-purple-600' :
                  group.userRole === 'editor' ? 'bg-blue-50 text-blue-600' :
                  'bg-stone-100 text-stone-500'
                }`}>
                  {group.userRole.charAt(0).toUpperCase() + group.userRole.slice(1)}
                </span>
              </div>
              {group.module && (
                <div className="text-xs text-stone-500 mb-2">{group.module}</div>
              )}
              {group.description && (
                <p className="text-xs text-stone-400 line-clamp-2">{group.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* create group modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-stone-200">
              <h3 className="text-lg font-semibold">Create New Group</h3>
              <button onClick={() => setShowCreate(false)}
                className="text-stone-400 hover:text-stone-600 text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Group Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Database Project Team"
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Module (optional)</label>
                <input type="text" value={newModule} onChange={(e) => setNewModule(e.target.value)}
                  placeholder="e.g. CS2001 Database Systems"
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this group for?"
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm border border-stone-300 rounded hover:bg-stone-50">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="px-4 py-2 text-sm bg-stone-900 text-white rounded hover:bg-stone-800 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Groups
