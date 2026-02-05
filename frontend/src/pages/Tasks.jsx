import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Tasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')

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

    if (error) {
      console.error('Error fetching tasks:', error)
      setError(error.message)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    // Create the task object
    const taskData = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      priority: priority,
      status: 'pending'
    }

    console.log('Creating task:', taskData) // Debug log

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()

    console.log('Response:', { data, error }) // Debug log

    if (error) {
      console.error('Error creating task:', error)
      setError(error.message)
      setSaving(false)
      return
    }

    if (data && data.length > 0) {
      // Add new task to the list
      setTasks([data[0], ...tasks])
      // Reset form
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

    if (error) {
      console.error('Error updating task:', error)
      return
    }

    // Update local state
    setTasks(tasks.map(t => 
      t.id === task.id ? { ...t, status: newStatus } : t
    ))
  }

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting task:', error)
      return
    }

    // Remove from local state
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date'
    return new Date(dateStr).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short' 
    })
  }

  if (loading) return <div>Loading tasks...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.length} tasks</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {error && <div className="error-message mb-4">{error}</div>}

      {/* Create Task Form */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-body">
            <h2 style={{ fontWeight: '600', marginBottom: '16px' }}>Create Task</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input form-textarea"
                  placeholder="Optional description"
                />
              </div>

              <div className="form-row">
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
              </div>

              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="btn btn-primary"
              >
                {saving ? 'Creating...' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="card">
        {tasks.length === 0 ? (
          <div className="empty-state">
            No tasks yet. Create your first task!
          </div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <div key={task.id} className="task-item">
                <button
                  onClick={() => toggleComplete(task)}
                  className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                  title={task.status === 'completed' ? 'Mark as pending' : 'Mark as complete'}
                />
                <div className="task-content">
                  <Link 
                    to={`/tasks/${task.id}`} 
                    className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {task.title}
                  </Link>
                  {task.description && (
                    <div className="task-meta">{task.description}</div>
                  )}
                  <div className="task-meta">{formatDate(task.due_date)}</div>
                </div>
                <span className={`task-priority priority-${task.priority}`}>
                  {task.priority}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="task-delete"
                  title="Delete task"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}