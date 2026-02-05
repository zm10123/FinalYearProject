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

  
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (user && id) fetchAll()
  }, [user, id])

  
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const fetchAll = async () => {
    setLoading(true)
    setError(null)

    try {
      
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single()

      if (groupError) throw groupError
      if (!groupData) {
        navigate('/groups')
        return
      }
      setGroup(groupData)

      
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('id, user_id, role, status')
        .eq('group_id', id)
        .eq('status', 'active')

      if (membersError) throw membersError

      
      const userIds = (membersData || []).map(m => m.user_id)

      
      let profilesData = []
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)

        if (profilesError) throw profilesError
        profilesData = profiles || []
      }

     
      const membersWithProfiles = (membersData || []).map(member => ({
        ...member,
        profiles: profilesData.find(p => p.id === member.user_id) || null
      }))

      setMembers(membersWithProfiles)

     
      const currentMember = membersWithProfiles.find(m => m.user_id === user.id)
      setUserRole(currentMember?.role)

      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('group_id', id)
        .order('created_at', { ascending: false })

      if (tasksError) {
        console.warn('Tasks fetch error:', tasksError)
      } else {
        setTasks(tasksData || [])
      }

      
      const { data: filesData, error: filesError } = await supabase
        .from('group_files')
        .select('*')
        .eq('group_id', id)
        .order('created_at', { ascending: false })

      if (filesError) {
        console.warn('Files fetch error:', filesError)
      } else {
        setFiles(filesData || [])
      }

    } catch (err) {
      console.error('Error fetching group data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (e) => {
    e.preventDefault()
    if (!taskTitle.trim()) {
      setError('Task title is required')
      return
    }

    setSavingTask(true)
    setError(null)

    try {
      
      const taskData = {
        user_id: user.id,
        group_id: id,
        title: taskTitle.trim()
      }

     
      if (taskDescription.trim()) {
        taskData.description = taskDescription.trim()
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()

      if (error) {
        console.error('Task creation error:', error)
        throw error
      }

      if (data && data.length > 0) {
        setTasks([data[0], ...tasks])
        setTaskTitle('')
        setTaskDescription('')
        setShowTaskForm(false)
        setSuccess('Task created successfully')
      }
    } catch (err) {
      console.error('Error creating task:', err)
      setError(`Failed to create task: ${err.message}`)
    } finally {
      setSavingTask(false)
    }
  }

  const toggleTaskComplete = async (task) => {
    setError(null)
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id)

      if (error) throw error

      
      setTasks(tasks.map(t => 
        t.id === task.id ? { ...t, status: newStatus } : t
      ))
      setSuccess(`Task marked as ${newStatus}`)
    } catch (err) {
      console.error('Error updating task:', err)
      setError(`Failed to update task: ${err.message}`)
    }
  }

  const inviteMember = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      setError('Email is required')
      return
    }

    setInviting(true)
    setError(null)

    try {
      console.log('Looking for user with email:', inviteEmail.trim().toLowerCase())

      
      const { data: profiles, error: findError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', inviteEmail.trim())
        .limit(1)

      console.log('Profile search result:', { profiles, findError })

      if (findError) throw findError

      if (!profiles || profiles.length === 0) {
        setError('User not found with that email address. They may need to register first.')
        setInviting(false)
        return
      }

      const invitee = profiles[0]

      
      const existing = members.find(m => m.user_id === invitee.id)
      if (existing) {
        setError('User is already a member of this group')
        setInviting(false)
        return
      }

      console.log('Adding member:', {
        group_id: id,
        user_id: invitee.id,
        role: 'viewer'
      })

     
      const { data: newMember, error: insertError } = await supabase
        .from('group_members')
        .insert([{
          group_id: id,
          user_id: invitee.id,
          role: 'viewer',  // Default role
          status: 'active'
        }])
        .select()

      console.log('Insert result:', { newMember, insertError })

      if (insertError) throw insertError

      setInviteEmail('')
      setSuccess(`Successfully invited ${invitee.email} as a viewer`)
      await fetchAll() 
    } catch (err) {
      console.error('Error inviting member:', err)
      setError(`Failed to invite member: ${err.message}`)
    } finally {
      setInviting(false)
    }
  }

  const uploadFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File size must be less than 10MB')
      e.target.value = ''
      return
    }

    setUploading(true)
    setError(null)

    try {
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${id}/${fileName}`

      
      const { error: uploadError } = await supabase.storage
        .from('group-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      
      const { data, error: dbError } = await supabase
        .from('group_files')
        .insert([{
          group_id: id,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream'
        }])
        .select()

      if (dbError) throw dbError

      if (data && data.length > 0) {
        setFiles([data[0], ...files])
        setSuccess(`Successfully uploaded ${file.name}`)
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(`Failed to upload file: ${err.message}`)
    } finally {
      setUploading(false)
      e.target.value = '' 
    }
  }

  const deleteFile = async (file) => {
    if (!window.confirm(`Delete "${file.file_name}"?`)) return

    setError(null)

    try {
      
      const { error: storageError } = await supabase.storage
        .from('group-files')
        .remove([file.file_path])

      if (storageError) console.warn('Storage delete warning:', storageError)

      
      const { error: dbError } = await supabase
        .from('group_files')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      
      setFiles(files.filter(f => f.id !== file.id))
      setSuccess('File deleted successfully')
    } catch (err) {
      console.error('Error deleting file:', err)
      setError(`Failed to delete file: ${err.message}`)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner">Loading group...</div>
      </div>
    )
  }

  if (!group) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Group not found</p>
        <Link to="/groups" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Groups
        </Link>
      </div>
    )
  }

  const canEdit = userRole === 'admin' || userRole === 'editor'
  const isAdmin = userRole === 'admin'

  return (
    <div>
      <Link to="/groups" className="back-link" style={{ 
        display: 'inline-block', 
        marginBottom: '16px',
        color: 'var(--accent)',
        textDecoration: 'none'
      }}>
        ← Back to Groups
      </Link>

      {}
      {error && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          background: 'var(--urgent-bg)',
          color: 'var(--urgent)',
          borderRadius: 'var(--radius)',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          background: 'var(--success-bg)',
          color: 'var(--success)',
          borderRadius: 'var(--radius)',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">{group.name}</h1>
          <p className="page-subtitle">
            {group.description || 'No description'} • Your role: {userRole || 'viewer'}
          </p>
        </div>
      </div>

      {}
      <div className="tabs" style={{ 
        display: 'flex', 
        gap: '8px', 
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px'
      }}>
        <button
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: activeTab === 'tasks' ? 'var(--surface)' : 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'tasks' ? '600' : '400',
            borderBottom: activeTab === 'tasks' ? '2px solid var(--accent)' : 'none'
          }}
        >
          Tasks ({tasks.length})
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: activeTab === 'members' ? 'var(--surface)' : 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'members' ? '600' : '400',
            borderBottom: activeTab === 'members' ? '2px solid var(--accent)' : 'none'
          }}
        >
          Members ({members.length})
        </button>
        <button
          className={`tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: activeTab === 'files' ? 'var(--surface)' : 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'files' ? '600' : '400',
            borderBottom: activeTab === 'files' ? '2px solid var(--accent)' : 'none'
          }}
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
                <form onSubmit={createTask} className="card" style={{ padding: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Task Title *</label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="form-input"
                      placeholder="Enter task title"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      className="form-input form-textarea"
                      placeholder="Optional task description"
                      rows={3}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="submit" 
                      disabled={savingTask || !taskTitle.trim()} 
                      className="btn btn-primary"
                    >
                      {savingTask ? 'Creating...' : 'Create Task'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowTaskForm(false)
                        setTaskTitle('')
                        setTaskDescription('')
                      }} 
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
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
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                No tasks yet. {canEdit && 'Create one to get started!'}
              </div>
            ) : (
              <div className="task-list">
                {tasks.map(task => (
                  <div key={task.id} className="task-item">
                    <button
                      onClick={() => toggleTaskComplete(task)}
                      className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                      disabled={!canEdit}
                      style={{ cursor: canEdit ? 'pointer' : 'not-allowed' }}
                    />
                    <div className="task-content" style={{ flex: 1 }}>
                      <div className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-secondary)', 
                          marginTop: '4px' 
                        }}>
                          {task.description}
                        </div>
                      )}
                    </div>
                    <span className={`task-priority priority-${task.priority || 'medium'}`}>
                      {task.priority || 'medium'}
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
            <form 
              onSubmit={inviteMember} 
              style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
            >
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="form-input"
                placeholder="Enter email to invite"
                style={{ flex: 1 }}
                required
              />
              <button 
                type="submit" 
                disabled={inviting || !inviteEmail.trim()} 
                className="btn btn-primary"
              >
                {inviting ? 'Inviting...' : 'Invite Member'}
              </button>
            </form>
          )}

          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Members</h3>
            </div>
            {members.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                No members yet
              </div>
            ) : (
              <div style={{ padding: '8px' }}>
                {members.map(member => (
                  <div 
                    key={member.id} 
                    className="member-item"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <div>
                      <div className="member-name" style={{ fontWeight: '500', fontSize: '14px' }}>
                        {member.profiles?.full_name || 'Unknown User'}
                        {member.user_id === user.id && ' (You)'}
                      </div>
                      <div className="member-email" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {member.profiles?.email}
                      </div>
                    </div>
                    <span 
                      className="group-role"
                      style={{
                        padding: '4px 12px',
                        background: member.role === 'admin' ? 'var(--purple-bg)' : 'var(--surface)',
                        color: member.role === 'admin' ? 'var(--purple)' : 'var(--text-secondary)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {activeTab === 'files' && (
        <div>
          {canEdit && (
            <div style={{ marginBottom: '16px' }}>
              <label 
                className="btn btn-primary" 
                style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? 'Uploading...' : '📁 Upload File'}
                <input
                  type="file"
                  onChange={uploadFile}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}

          <div className="card">
            {files.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                No files uploaded yet. {canEdit && 'Upload one to share with your team!'}
              </div>
            ) : (
              <div style={{ padding: '8px' }}>
                {files.map(file => (
                  <div 
                    key={file.id} 
                    className="file-item"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="file-name" style={{ fontWeight: '500', fontSize: '14px' }}>
                        📄 {file.file_name}
                      </div>
                      <div className="file-size" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {formatFileSize(file.file_size)} • Uploaded {new Date(file.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => deleteFile(file)}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--urgent-bg)',
                          color: 'var(--urgent)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}