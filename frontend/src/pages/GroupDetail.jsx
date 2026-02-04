import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

  // Forms
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    fetchGroup()
  }, [id])

  const fetchGroup = async () => {
    // Get group details
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (!groupData) {
      navigate('/groups')
      return
    }
    setGroup(groupData)

    // Get members with profiles
    const { data: membersData } = await supabase
      .from('group_members')
      .select('*, profiles(email, full_name)')
      .eq('group_id', id)
      .eq('status', 'active')

    setMembers(membersData || [])

    // Find user's role
    const userMember = membersData?.find(m => m.user_id === user.id)
    setUserRole(userMember?.role)

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

  const createGroupTask = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        group_id: id,
        title: taskTitle,
        status: 'pending',
        priority: 'medium'
      })

    if (!error) {
      setTaskTitle('')
      setShowTaskForm(false)
      fetchGroup()
    }
  }

  const inviteMember = async (e) => {
    e.preventDefault()
    // Find user by email
    const { data: invitee } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail)
      .single()

    if (!invitee) {
      alert('User not found')
      return
    }

    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: id,
        user_id: invitee.id,
        role: 'viewer',
        invited_by: user.id,
        status: 'active'
      })

    if (!error) {
      setInviteEmail('')
      fetchGroup()
    } else {
      alert('Failed to invite: ' + error.message)
    }
  }

  const uploadFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const filePath = `${id}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('group-files')
      .upload(filePath, file)

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      return
    }

    const { error } = await supabase.from('group_files').insert({
      group_id: id,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type
    })

    if (!error) fetchGroup()
  }

  const deleteFile = async (fileId, filePath) => {
    if (!confirm('Delete this file?')) return

    await supabase.storage.from('group-files').remove([filePath])
    const { error } = await supabase.from('group_files').delete().eq('id', fileId)
    if (!error) setFiles(files.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) return <div className="text-stone-500">Loading...</div>

  const canEdit = userRole === 'admin' || userRole === 'editor'

  return (
    <div>
      <button onClick={() => navigate('/groups')} className="text-stone-500 text-sm mb-4">← Back to Groups</button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-stone-600">{group.description || 'No description'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200 mb-6">
        {['tasks', 'members', 'files'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-1 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-stone-800 text-stone-800'
                : 'text-stone-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div>
          {canEdit && (
            <div className="mb-4">
              {showTaskForm ? (
                <form onSubmit={createGroupTask} className="flex gap-2">
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-md"
                    placeholder="Task title"
                    required
                  />
                  <button type="submit" className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm">Add</button>
                  <button type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 border border-stone-200 rounded-md text-sm">Cancel</button>
                </form>
              ) : (
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm"
                >
                  + Add Task
                </button>
              )}
            </div>
          )}

          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-stone-500">No tasks yet</div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="p-4 flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 ${
                    task.status === 'completed' ? 'bg-stone-800 border-stone-800' : 'border-stone-300'
                  }`} />
                  <span className={task.status === 'completed' ? 'line-through text-stone-400' : ''}>
                    {task.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div>
          {userRole === 'admin' && (
            <form onSubmit={inviteMember} className="flex gap-2 mb-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-stone-200 rounded-md"
                placeholder="Email to invite"
                required
              />
              <button type="submit" className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm">Invite</button>
            </form>
          )}

          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {members.map(member => (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{member.profiles?.full_name || member.profiles?.email}</div>
                  <div className="text-sm text-stone-500">{member.profiles?.email}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-stone-100 rounded capitalize">{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div>
          {canEdit && (
            <div className="mb-4">
              <label className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm cursor-pointer">
                Upload File
                <input type="file" className="hidden" onChange={uploadFile} />
              </label>
            </div>
          )}

          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {files.length === 0 ? (
              <div className="p-8 text-center text-stone-500">No files yet</div>
            ) : (
              files.map(file => (
                <div key={file.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{file.file_name}</div>
                    <div className="text-sm text-stone-500">{formatFileSize(file.file_size)}</div>
                  </div>
                  <button
                    onClick={() => deleteFile(file.id, file.file_path)}
                    className="text-stone-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}