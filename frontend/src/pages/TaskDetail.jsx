import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function TaskDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [task, setTask] = useState(null)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    if (user && id) {
      fetchTask()
      fetchNotes()
    }
  }, [user, id])

  const fetchTask = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Error fetching task:', error)
      navigate('/tasks')
      return
    }

    setTask(data)
    // Set form values
    setTitle(data.title || '')
    setDescription(data.description || '')
    setDueDate(data.due_date ? data.due_date.split('T')[0] : '')
    setPriority(data.priority || 'medium')
    setStatus(data.status || 'pending')
    setLoading(false)
  }

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('task_notes')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: false })

    if (!error) {
      setNotes(data || [])
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('tasks')
      .update({
        title,
        description: description || null,
        due_date: dueDate || null,
        priority,
        status
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task')
    } else {
      setTask({ ...task, title, description, due_date: dueDate, priority, status })
      setEditing(false)
    }
    setSaving(false)
  }

  const addNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return

    const { data, error } = await supabase
      .from('task_notes')
      .insert([{
        task_id: id,
        user_id: user.id,
        content: newNote.trim()
      }])
      .select()

    if (error) {
      console.error('Error adding note:', error)
      return
    }

    if (data && data.length > 0) {
      setNotes([data[0], ...notes])
      setNewNote('')
    }
  }

  const deleteNote = async (noteId) => {
    const { error } = await supabase
      .from('task_notes')
      .delete()
      .eq('id', noteId)

    if (!error) {
      setNotes(notes.filter(n => n.id !== noteId))
    }
  }

  const deleteTask = async () => {
    if (!window.confirm('Delete this task permanently?')) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (!error) {
      navigate('/tasks')
    }
  }

  const archiveTask = async () => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived' })
      .eq('id', id)

    if (!error) {
      navigate('/tasks')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTimestamp = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) return <div>Loading...</div>
  if (!task) return <div>Task not found</div>

  return (
    <div>
      <Link to="/tasks" className="back-link">← Back to Tasks</Link>

      <div className="detail-layout">
        {}
        <div>
          <div className="card">
            <div className="card-body">
              {editing ? (
                <form onSubmit={handleUpdate}>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="form-input form-textarea"
                    />
                  </div>

                  <div className="form-row form-row-3">
                    <div className="form-group">
                      <label className="form-label">Due Date</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="form-input"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="form-input"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>{task.title}</h1>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setEditing(true)} className="btn btn-secondary">Edit</button>
                      <button onClick={archiveTask} className="btn btn-secondary">Archive</button>
                      <button onClick={deleteTask} className="btn btn-danger">Delete</button>
                    </div>
                  </div>

                  <p style={{ color: '#666', marginBottom: '24px' }}>
                    {task.description || 'No description'}
                  </p>

                  {}
                  <div>
                    <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Notes</h3>
                    
                    <form onSubmit={addNote} className="note-form" style={{ marginBottom: '16px' }}>
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="form-input"
                        placeholder="Add a note..."
                      />
                      <button type="submit" className="btn btn-primary">Add</button>
                    </form>

                    {notes.length === 0 ? (
                      <p style={{ color: '#999', fontSize: '14px' }}>No notes yet</p>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="note-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="note-content">{note.content}</span>
                            <button
                              onClick={() => deleteNote(note.id)}
                              style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}
                            >
                              ×
                            </button>
                          </div>
                          <div className="note-time">{formatTimestamp(note.created_at)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {}
        <div className="detail-sidebar">
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Details</h3>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span style={{ textTransform: 'capitalize' }}>{task.status?.replace('_', ' ')}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Priority</span>
                <span style={{ textTransform: 'capitalize' }}>{task.priority}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Due Date</span>
                <span>{formatDate(task.due_date)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created</span>
                <span>{formatDate(task.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}