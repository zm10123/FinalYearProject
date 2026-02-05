import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Archive() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchArchived()
  }, [user])

  const fetchArchived = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'archived')
      .order('updated_at', { ascending: false })

    if (!error) {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const restoreTask = async (taskId) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'pending' })
      .eq('id', taskId)

    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId))
    }
  }

  const deleteTask = async (taskId) => {
    if (!window.confirm('Permanently delete this task?')) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId))
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Archive</h1>
          <p className="page-subtitle">{tasks.length} archived tasks</p>
        </div>
      </div>

      <div className="card">
        {tasks.length === 0 ? (
          <div className="empty-state">No archived tasks</div>
        ) : (
          <div className="task-list">
            {tasks.map(task => (
              <div key={task.id} className="task-item">
                <div className="task-content">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">{task.description || 'No description'}</div>
                </div>
                <button
                  onClick={() => restoreTask(task.id)}
                  className="btn btn-secondary"
                  style={{ marginRight: '8px' }}
                >
                  Restore
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="btn btn-danger"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}