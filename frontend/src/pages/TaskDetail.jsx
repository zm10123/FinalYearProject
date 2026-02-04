import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function TaskDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [task, setTask] = useState(null)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [editing, setEditing] = useState(false)

  // Edit form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    fetchTask()
    fetchNotes()
  }, [id])

  const fetchTask = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      navigate('/tasks')
      return
    }

    setTask(data)
    setTitle(data.title)
    setDescription(data.description || '')
    setDueDate(data.due_date ? data.due_date.split('T')[0] : '')
    setPriority(data.priority)
    setStatus(data.status)
    setLoading(false)
  }

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('task_notes')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: false })

    setNotes(data || [])
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('tasks')
      .update({ title, description, due_date: dueDate || null, priority, status })
      .eq('id', id)

    if (!error) {
      setTask({ ...task, title, description, due_date: dueDate, priority, status })
      setEditing(false)
    }
  }

  const addNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return

    const { data, error } = await supabase
      .from('task_notes')
      .insert({ task_id: id, user_id: user.id, content: newNote })
      .select()

    if (!error && data) {
      setNotes([data[0], ...notes])
      setNewNote('')
    }
  }

  const deleteNote = async (noteId) => {
    const { error } = await supabase.from('task_notes').delete().eq('id', noteId)
    if (!error) setNotes(notes.filter(n => n.id !== noteId))
  }

  const deleteTask = async () => {
    if (!confirm('Delete this task?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) navigate('/tasks')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTimestamp = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) return <div className="text-stone-500">Loading...</div>

  return (
    <div>
      <button onClick={() => navigate('/tasks')} className="text-stone-500 text-sm mb-4">← Back to Tasks</button>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2">
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-md text-sm border border-stone-200">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-xl font-bold">{task.title}</h1>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(true)} className="px-3 py-1 text-sm border border-stone-200 rounded-md">Edit</button>
                    <button onClick={deleteTask} className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded-md">Delete</button>
                  </div>
                </div>
                <p className="text-stone-600 mb-6">{task.description || 'No description'}</p>

                {/* Notes section */}
                <div>
                  <h3 className="font-semibold mb-3">Notes</h3>
                  <form onSubmit={addNote} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1 px-3 py-2 border border-stone-200 rounded-md text-sm"
                      placeholder="Add a note..."
                    />
                    <button type="submit" className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm">Add</button>
                  </form>
                  <div className="space-y-2">
                    {notes.length === 0 ? (
                      <p className="text-stone-400 text-sm">No notes yet</p>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="bg-stone-50 p-3 rounded-md">
                          <div className="flex justify-between items-start">
                            <p className="text-sm">{note.content}</p>
                            <button onClick={() => deleteNote(note.id)} className="text-stone-400 hover:text-red-500 text-sm">×</button>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{formatTimestamp(note.created_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Status</span>
                <span className="capitalize">{task.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Priority</span>
                <span className="capitalize">{task.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Due Date</span>
                <span>{formatDate(task.due_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Created</span>
                <span>{formatDate(task.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}