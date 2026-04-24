import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getGroupById, updateGroup, deleteGroup,
  inviteMember, updateMemberRole, removeMember, leaveGroup,
  addTaskToGroup
} from '../services/groupService'
import {
  getGroupFiles, uploadFile, deleteFile,
  getFileUrl, logFileAccess, formatFileSize
} from '../services/fileService'

function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('tasks')

  // invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviting, setInviting] = useState(false)

  // add task form
  const [showAddTask, setShowAddTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [addingTask, setAddingTask] = useState(false)

  // settings form
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editModule, setEditModule] = useState('')
  const [saving, setSaving] = useState(false)

  // files 
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadGroup()
  }, [id])

  async function loadGroup() {
    setLoading(true)
    const { group: data, error: err } = await getGroupById(id)
    if (err) {
      setError(err.message)
    } else {
      setGroup(data)
      setEditName(data.name)
      setEditDescription(data.description || '')
      setEditModule(data.module || '')
    }
    setLoading(false)
    loadFiles()
  }

  // file actions 

  async function loadFiles() {
    const { data } = await getGroupFiles(id)
    if (data) setFiles(data)
  }

  async function handleUpload(file) {
    setUploading(true)
    setError('')
    const { error: err } = await uploadFile(id, file)
    if (err) {
      setError(err.message)
    } else {
      await loadFiles()
    }
    setUploading(false)
  }

  async function handleDownload(file) {
    await logFileAccess(file.id)
    const { url, error: err } = await getFileUrl(file.storage_path)
    if (err) {
      setError(err.message)
    } else {
      window.open(url, '_blank')
    }
  }

  async function handleDeleteFile(fileId, storagePath) {
    if (!window.confirm('Delete this file?')) return
    const { error: err } = await deleteFile(fileId, storagePath)
    if (!err) {
      setFiles(files.filter(f => f.id !== fileId))
    }
  }

  // figure out the current user's role in this group
  const currentMember = group?.members?.find(m => m.user_id === user?.id)
  const userRole = currentMember?.role || 'viewer'
  const isAdmin = userRole === 'admin'
  const canEdit = isAdmin || userRole === 'editor'

  //  member actions 

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setError('')

    const { error: err } = await inviteMember(id, inviteEmail.trim(), inviteRole)
    if (err) {
      setError(err.message)
    } else {
      setInviteEmail('')
      await loadGroup()
    }
    setInviting(false)
  }

  async function handleRoleChange(userId, newRole) {
    const { error: err } = await updateMemberRole(id, userId, newRole)
    if (err) {
      setError(err.message)
    } else {
      await loadGroup()
    }
  }

  async function handleRemoveMember(userId, name) {
    if (!window.confirm(`Remove ${name} from the group?`)) return
    const { error: err } = await removeMember(id, userId)
    if (err) {
      setError(err.message)
    } else {
      await loadGroup()
    }
  }

  async function handleLeave() {
    if (!window.confirm('Leave this group? You will need to be reinvited to rejoin.')) return
    const { error: err } = await leaveGroup(id)
    if (!err) navigate('/groups')
  }

  //  task actions 

  async function handleAddTask(e) {
    e.preventDefault()
    if (!taskTitle.trim()) return
    setAddingTask(true)
    setError('')

    const { error: err } = await addTaskToGroup(id, {
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      due_date: taskDueDate || null,
      priority: taskPriority,
      status: 'pending',
    })

    if (err) {
      setError(err.message)
    } else {
      setTaskTitle('')
      setTaskDescription('')
      setTaskDueDate('')
      setShowAddTask(false)
      await loadGroup()
    }
    setAddingTask(false)
  }

  //  settings actions

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error: err } = await updateGroup(id, {
      name: editName.trim(),
      description: editDescription.trim() || null,
      module: editModule.trim() || null,
    })

    if (err) {
      setError(err.message)
    } else {
      await loadGroup()
    }
    setSaving(false)
  }

  async function handleDeleteGroup() {
    if (!window.confirm('Delete this group permanently? All group tasks will be preserved but unlinked.')) return
    const { error: err } = await deleteGroup(id)
    if (!err) navigate('/groups')
  }

  //  helpers 

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  function getInitials(member) {
    const f = member.profiles?.first_name || ''
    const l = member.profiles?.last_name || ''
    if (f && l) return f[0] + l[0]
    if (f) return f[0]
    return '?'
  }

  function getMemberName(member) {
    const f = member.profiles?.first_name || ''
    const l = member.profiles?.last_name || ''
    if (f || l) return `${f} ${l}`.trim()
    return member.profiles?.email || 'Unknown'
  }

  function getDueLabel(task) {
    if (!task.due_date) return null
    const now = new Date()
    const due = new Date(task.due_date)
    const diff = Math.ceil((due - now) / 86400000)
    if (diff < 0) return { text: 'Overdue', colour: 'text-red-600' }
    if (diff === 0) return { text: 'Today', colour: 'text-red-600' }
    if (diff === 1) return { text: 'Tomorrow', colour: 'text-amber-600' }
    return { text: `${formatDate(task.due_date)}`, colour: 'text-stone-500' }
  }

  function timeAgo(dateStr) {
    const diff = (new Date() - new Date(dateStr)) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const avatarColours = ['bg-blue-500', 'bg-purple-500', 'bg-teal-500', 'bg-amber-500', 'bg-red-400', 'bg-green-500']
  function getAvatarColour(index) {
    return avatarColours[index % avatarColours.length]
  }

  if (loading) return <div className="p-8 text-stone-400">Loading group...</div>
  if (!group) return <div className="p-8 text-stone-500">Group not found</div>

  const acceptedMembers = group.members.filter(m => m.status === 'accepted')
  const pendingMembers = group.members.filter(m => m.status === 'pending')
  const completedTasks = group.tasks.filter(t => t.status === 'completed').length

  return (
    <div>
      <Link to="/groups" className="text-sm text-stone-500 hover:text-stone-900 mb-4 inline-block">
        ← Back to Groups
      </Link>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</div>
      )}

      {/* header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-stone-500 text-sm">
            {group.module && `${group.module} · `}
            {acceptedMembers.length} member{acceptedMembers.length !== 1 ? 's' : ''}
            {` · Created ${formatDate(group.created_at)}`}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={handleLeave}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50">
            Leave Group
          </button>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {['tasks', 'members', 'files', 'activity', ...(isAdmin ? ['settings'] : [])].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* TASKS TAB  */}
      {activeTab === 'tasks' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-stone-500">
              {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''} · {completedTasks} completed
            </span>
            {canEdit && (
              <Link to={`/tasks/new?group=${id}`}
                className="px-3 py-1.5 text-sm bg-stone-900 text-white rounded hover:bg-stone-800">
                + Add Task
              </Link>
            )}
          </div>

          {/* task list */}
          {group.tasks.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">No tasks yet</div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-lg">
              {group.tasks.map(task => {
                const dueLabel = getDueLabel(task)
                return (
                  <Link key={task.id} to={`/tasks/${task.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-stone-100 last:border-b-0 hover:bg-stone-50">
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${task.status === 'completed' ? 'bg-stone-900 border-stone-900' : 'border-stone-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-stone-400' : ''}`}>
                        {task.title}
                      </div>
                      {dueLabel && (
                        <span className={`text-xs ${dueLabel.colour}`}>{dueLabel.text}</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-50 text-red-600' :
                      task.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-stone-100 text-stone-500'
                      }`}>{task.priority}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/*  MEMBERS TAB  */}
      {activeTab === 'members' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-stone-500">{acceptedMembers.length} member{acceptedMembers.length !== 1 ? 's' : ''}</span>
          </div>

          {/* invite form - admin only */}
          {isAdmin && (
            <form onSubmit={handleInvite}
              className="flex gap-3 mb-6 bg-stone-50 border border-stone-200 rounded-lg p-4">
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded text-sm">
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="submit" disabled={inviting}
                className="px-4 py-2 text-sm bg-stone-900 text-white rounded disabled:opacity-50">
                {inviting ? 'Inviting...' : 'Invite'}
              </button>
            </form>
          )}

          {/* member list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {acceptedMembers.map((member, i) => (
              <div key={member.id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-4">
                <div className={`w-10 h-10 rounded-full ${getAvatarColour(i)} text-white flex items-center justify-center text-sm font-semibold`}>
                  {getInitials(member)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {getMemberName(member)}
                    {member.user_id === user?.id && <span className="text-stone-400"> (You)</span>}
                  </div>
                  <div className="text-xs text-stone-400">{member.profiles?.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && member.user_id !== user?.id ? (
                    <select value={member.role}
                      onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                      className="text-xs px-2 py-1 border border-stone-200 rounded">
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded ${member.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                      member.role === 'editor' ? 'bg-blue-50 text-blue-600' :
                        'bg-stone-100 text-stone-500'
                      }`}>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
                  )}
                  {isAdmin && member.user_id !== user?.id && (
                    <button onClick={() => handleRemoveMember(member.user_id, getMemberName(member))}
                      className="text-stone-300 hover:text-red-500 text-lg">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* pending invites */}
          {pendingMembers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-stone-500 mb-3">Pending Invites</h4>
              {pendingMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 bg-stone-50 rounded-lg p-3 mb-2">
                  <div className="flex-1">
                    <div className="text-sm">{member.profiles?.email || 'Unknown'}</div>
                    <div className="text-xs text-stone-400">Invited as {member.role}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleRemoveMember(member.user_id, member.profiles?.email)}
                      className="text-xs text-red-500 hover:text-red-700">Revoke</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* permissions guide */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <h4 className="text-sm font-semibold mb-4">Permission Levels</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-stone-50 rounded-lg">
                <div className="text-sm font-semibold text-purple-600 mb-2">Admin</div>
                <ul className="text-xs text-stone-500 space-y-1">
                  <li>Full access to all features</li>
                  <li>Manage members & permissions</li>
                  <li>Delete group</li>
                </ul>
              </div>
              <div className="p-4 bg-stone-50 rounded-lg">
                <div className="text-sm font-semibold mb-2">Editor</div>
                <ul className="text-xs text-stone-500 space-y-1">
                  <li>Create & edit tasks</li>
                  <li>Upload files</li>
                  <li>Add events</li>
                </ul>
              </div>
              <div className="p-4 bg-stone-50 rounded-lg">
                <div className="text-sm font-semibold mb-2">Viewer</div>
                <ul className="text-xs text-stone-500 space-y-1">
                  <li>View tasks & files</li>
                  <li>Mark tasks complete</li>
                  <li>Add comments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/*  FILES TAB  */}
      {activeTab === 'files' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-stone-500">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
            {canEdit && (
              <div>
                <input type="file" ref={fileInputRef} className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) handleUpload(file)
                  }} />
                <button onClick={() => fileInputRef.current.click()} disabled={uploading}
                  className="px-3 py-1.5 text-sm bg-stone-900 text-white rounded hover:bg-stone-800 disabled:opacity-50">
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            )}
          </div>

          {files.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">No files yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map(file => (
                <div key={file.id} className="bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-12 bg-stone-100 border border-stone-200 rounded flex items-center justify-center text-xs font-semibold text-stone-400">
                      {file.mime_type?.split('/')[1]?.toUpperCase().slice(0, 4) || 'FILE'}
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDeleteFile(file.id, file.storage_path)}
                        className="text-stone-300 hover:text-red-500 text-sm">×</button>
                    )}
                  </div>
                  <div className="text-sm font-medium truncate mb-1">{file.file_name}</div>
                  <div className="text-xs text-stone-400 mb-3">
                    {formatFileSize(file.file_size)}
                    {file.profiles && ` · ${file.profiles.first_name || file.profiles.email}`}
                  </div>
                  <button onClick={() => handleDownload(file)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/*  ACTIVITY TAB  */}
      {activeTab === 'activity' && (
        <div>
          {group.activity.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">No activity yet</div>
          ) : (
            <div className="space-y-4">
              {group.activity.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-semibold text-stone-600 flex-shrink-0">
                    {item.profiles?.first_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium">
                        {item.profiles?.first_name || 'Someone'}
                      </span>{' '}
                      <span className="text-stone-500">{item.action_type}</span>
                      {item.details && (
                        <span className="text-stone-500"> — {item.details}</span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">{timeAgo(item.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/*  SETTINGS TAB (admin only)  */}
      {activeTab === 'settings' && isAdmin && (
        <div className="max-w-lg">
          <form onSubmit={handleSaveSettings} className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Module</label>
              <input type="text" value={editModule} onChange={(e) => setEditModule(e.target.value)}
                placeholder="e.g. CS2001 Database Systems"
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-stone-900 text-white rounded disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          <div className="border-t border-stone-200 pt-6">
            <h4 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h4>
            <button onClick={handleDeleteGroup}
              className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50">
              Delete Group
            </button>
            <p className="text-xs text-stone-400 mt-2">This cannot be undone. Tasks will be unlinked but not deleted.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupDetail
