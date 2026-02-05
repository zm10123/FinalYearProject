import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({ dueThisWeek: 0, completed: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'archived')
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
      setLoading(false)
      return
    }

    const allTasks = data || []
    setTasks(allTasks)

    // Calculate stats
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const dueThisWeek = allTasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false
      const due = new Date(t.due_date)
      return due <= weekFromNow
    }).length

    const completed = allTasks.filter(t => t.status === 'completed').length

    setStats({ dueThisWeek, completed, total: allTasks.length })
    setLoading(false)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
    
    if (diff < 0) return 'Overdue'
    if (diff === 0) return 'Due today'
    if (diff === 1) return 'Due tomorrow'
    if (diff <= 7) return `Due in ${diff} days`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const upcomingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5)

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back</p>
        </div>
        <Link to="/tasks" className="btn btn-primary">+ New Task</Link>
      </div>

      {}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Due This Week</div>
          <div className="stat-value">{stats.dueThisWeek}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.completed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completion Rate</div>
          <div className="stat-value">
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </div>
        </div>
      </div>

      {}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Upcoming Tasks</span>
          <Link to="/tasks" style={{ fontSize: '14px', color: '#666', textDecoration: 'none' }}>View all →</Link>
        </div>
        {upcomingTasks.length === 0 ? (
          <div className="empty-state">No upcoming tasks</div>
        ) : (
          <div className="task-list">
            {upcomingTasks.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="task-item"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="task-content">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">{formatDate(task.due_date)}</div>
                </div>
                <span className={`task-priority priority-${task.priority}`}>
                  {task.priority}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}