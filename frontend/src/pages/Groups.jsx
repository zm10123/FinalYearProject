import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Groups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (user) fetchGroups()
  }, [user])

  const fetchGroups = async () => {
    setLoading(true)
    
    // Get groups where user is a member
    const { data: memberships, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        role,
        groups (
          id,
          name,
          description,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching groups:', error)
      setLoading(false)
      return
    }

    
    const groupsData = (memberships || [])
      .filter(m => m.groups) 
      .map(m => ({
        ...m.groups,
        role: m.role
      }))

    setGroups(groupsData)
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    console.log('Creating group:', { name, description }) // Debug

    // Create the group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert([{
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id
      }])
      .select()

    console.log('Group create response:', { groupData, groupError }) // Debug

    if (groupError) {
      console.error('Error creating group:', groupError)
      setError(groupError.message)
      setSaving(false)
      return
    }

    
    if (groupData && groupData.length > 0) {
      const newGroup = groupData[0]
      
      // Check if member was added by trigger
      const { data: memberCheck } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', newGroup.id)
        .eq('user_id', user.id)

      
      if (!memberCheck || memberCheck.length === 0) {
        await supabase
          .from('group_members')
          .insert([{
            group_id: newGroup.id,
            user_id: user.id,
            role: 'admin',
            status: 'active'
          }])
      }

      // Reset form and refresh
      setName('')
      setDescription('')
      setShowForm(false)
      fetchGroups()
    }
    
    setSaving(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">{groups.length} groups</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {error && <div className="error-message mb-4">{error}</div>}

      {}
      {showForm && (
        <div className="card mb-6">
          <div className="card-body">
            <h2 style={{ fontWeight: '600', marginBottom: '16px' }}>Create Group</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Group Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Database Project Team"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input form-textarea"
                  placeholder="What is this group for?"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="btn btn-primary"
              >
                {saving ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      {}
      {groups.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            No groups yet. Create one to collaborate with others!
          </div>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="group-card"
            >
              <div className="group-card-header">
                <span className="group-name">{group.name}</span>
                <span className="group-role">{group.role}</span>
              </div>
              <p className="group-desc">
                {group.description || 'No description'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}