import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Tasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) fetchTasks()
  }, [user])

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })

    if (!error) setTasks(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        due_date: dueDate || null,
        priority,
        status: 'pending'
      })
      .select()

    if (!error && data) {
      setTasks([data[0], ...tasks])
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority('medium')
      setShowForm(false)
    }
    setSaving(false)
  }

  const toggleComplete = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id)

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    }
  }

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) setTasks(tasks.filter(t => t.id !== taskId))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const priorityStyles = {
    high: 'bg-red-50 text-red-600',
    medium: 'bg-amber-50 text-amber-600',
    low: 'bg-stone-100 text-stone-600'
  }

  if (loading) return <div className="text-stone-500">Loading tasks...</div>

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-stone-600">{tasks.length} tasks</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm"
        >
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-4">Create Task</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No tasks yet. Create your first task!</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className={`p-4 flex items-start gap-3 ${task.status === 'completed' ? 'opacity-50' : ''}`}>
              <button
                onClick={() => toggleComplete(task)}
                className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 ${
                  task.status === 'completed' ? 'bg-stone-800 border-stone-800' : 'border-stone-300'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</div>
                {task.description && <div className="text-sm text-stone-500 mt-1">{task.description}</div>}
                <div className="text-xs text-stone-400 mt-2">{formatDate(task.due_date)}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${priorityStyles[task.priority]}`}>{task.priority}</span>
              <button onClick={() => deleteTask(task.id)} className="text-stone-400 hover:text-red-500 text-lg">×</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}