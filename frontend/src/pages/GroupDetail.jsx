import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tasks')
  const [userRole, setUserRole] = useState(null)

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (user && id) fetchAll()
  }, [user, id])

  const fetchAll = async () => {
    setLoading(true)

    // Get group details
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (groupError || !groupData) {
      console.error('Error fetching group:', groupError)
      navigate('/groups')
      return
    }
    setGroup(groupData)

    // Get members with profile info
    const { data: membersData } = await supabase
      .from('group_members')
      .select(`
        id,
        user_id,
        role,
        status,
        profiles (
          email,
          full_name
        )
      `)
      .eq('group_id', id)
      .eq('status', 'active')

    setMembers(membersData || [])

    // Find current user's role
    const currentMember = (membersData || []).find(m => m.user_id === user.id)
    setUserRole(currentMember?.role)

    // Get group tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', id)
      .order('created_at', { ascending: false })

    setTasks(tasksData || [])

    // Get group files
    const { data: filesData } = await supabase
      .from('group_files')
      .select('*')
      .eq('group_id', id)
      .order('created_at', { ascending: false })

    setFiles(filesData || [])
    setLoading(false)
  }

  const createTask = async (e) => {
    e.preventDefault()
    if (!taskTitle.trim()) return
    setSavingTask(true)

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: user.id,
        group_id: id,
        title: taskTitle.trim(),
        status: 'pending',
        priority: 'medium'
      }])
      .select()

    if (!error && data) {
      setTasks([data[0], ...tasks])
      setTaskTitle('')
      setShowTaskForm(false)
    }
    setSavingTask(false)
  }

  const toggleTaskComplete = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.map(t => 
        t.id === task.id ? { ...t, status: newStatus } : t
      ))
    }
  }

  const inviteMember = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)

    // Find user by email
    const { data: invitee, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail.trim())
      .single()

    if (findError || !invitee) {
      alert('User not found with that email')
      setInviting(false)
      return
    }

    // Check if already a member
    const existing = members.find(m => m.user_id === invitee.id)
    if (existing) {
      alert('User is already a member')
      setInviting(false)
      return
    }

    // Add member
    const { error } = await supabase
      .from('group_members')
      .insert([{
        group_id: id,
        user_id: invitee.id,
        role: 'viewer',
        invited_by: user.id,
        status: 'active'
      }])

    if (error) {
      alert('Failed to invite: ' + error.message)
    } else {
      setInviteEmail('')
      fetchAll() // Refresh members list
    }
    setInviting(false)
  }

  const uploadFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const filePath = `${id}/${Date.now()}_${file.name}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('group-files')
      .upload(filePath, file)

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      return
    }

    // Save file record
    const { data, error } = await supabase
      .from('group_files')
      .insert([{
        group_id: id,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type
      }])
      .select()

    if (!error && data) {
      setFiles([data[0], ...files])
    }

    // Clear input
    e.target.value = ''
  }

  const deleteFile = async (file) => {
    if (!window.confirm('Delete this file?')) return

    // Delete from storage
    await supabase.storage
      .from('group-files')
      .remove([file.file_path])

    // Delete record
    const { error } = await supabase
      .from('group_files')
      .delete()
      .eq('id', file.id)

    if (!error) {
      setFiles(files.filter(f => f.id !== file.id))
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) return <div>Loading...</div>
  if (!group) return <div>Group not found</div>

  const canEdit = userRole === 'admin' || userRole === 'editor'
  const isAdmin = userRole === 'admin'

  return (
    <div>
      <Link to="/groups" className="back-link">← Back to Groups</Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{group.name}</h1>
          <p className="page-subtitle">{group.description || 'No description'}</p>
        </div>
      </div>

      {}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks ({tasks.length})
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({members.length})
        </button>
        <button
          className={`tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files ({files.length})
        </button>
      </div>

      {}
      {activeTab === 'tasks' && (
        <div>
          {canEdit && (
            <div style={{ marginBottom: '16px' }}>
              {showTaskForm ? (
                <form onSubmit={createTask} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="form-input"
                    placeholder="Task title"
                    style={{ flex: 1 }}
                    required
                  />
                  <button type="submit" disabled={savingTask} className="btn btn-primary">
                    {savingTask ? 'Adding...' : 'Add'}
                  </button>
                  <button type="button" onClick={() => setShowTaskForm(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </form>
              ) : (
                <button onClick={() => setShowTaskForm(true)} className="btn btn-primary">
                  + Add Task
                </button>
              )}
            </div>
          )}

          <div className="card">
            {tasks.length === 0 ? (
              <div className="empty-state">No tasks yet</div>
            ) : (
              <div className="task-list">
                {tasks.map(task => (
                  <div key={task.id} className="task-item">
                    <button
                      onClick={() => toggleTaskComplete(task)}
                      className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                      disabled={!canEdit}
                    />
                    <div className="task-content">
                      <span className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <span className={`task-priority priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {activeTab === 'members' && (
        <div>
          {isAdmin && (
            <form onSubmit={inviteMember} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="form-input"
                placeholder="Email to invite"
                style={{ flex: 1 }}
                required
              />
              <button type="submit" disabled={inviting} className="btn btn-primary">
                {inviting ? 'Inviting...' : 'Invite'}
              </button>
            </form>
          )}

          <div className="card">
            {members.map(member => (
              <div key={member.id} className="member-item">
                <div>
                  <div className="member-name">
                    {member.profiles?.full_name || 'Unknown'}
                    {member.user_id === user.id && ' (You)'}
                  </div>
                  <div className="member-email">{member.profiles?.email}</div>
                </div>
                <span className="group-role">{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {}
      {activeTab === 'files' && (
        <div>
          {canEdit && (
            <div style={{ marginBottom: '16px' }}>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                Upload File
                <input
                  type="file"
                  onChange={uploadFile}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}

          <div className="card">
            {files.length === 0 ? (
              <div className="empty-state">No files yet</div>
            ) : (
              files.map(file => (
                <div key={file.id} className="file-item">
                  <div>
                    <div className="file-name">{file.file_name}</div>
                    <div className="file-size">{formatFileSize(file.file_size)}</div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => deleteFile(file)}
                      className="task-delete"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}