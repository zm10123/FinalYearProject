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
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'archived')
      .order('due_date', { ascending: true })

    if (allTasks) {
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
    }
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

  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed')
    .slice(0, 5)

  if (loading) return <div className="text-stone-500">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-stone-600">Welcome back</p>
        </div>
        <Link to="/tasks" className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm">
          + New Task
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg border border-stone-200">
          <div className="text-xs text-stone-400 mb-1">Due This Week</div>
          <div className="text-2xl font-bold">{stats.dueThisWeek}</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-stone-200">
          <div className="text-xs text-stone-400 mb-1">Completed</div>
          <div className="text-2xl font-bold">{stats.completed}</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-stone-200">
          <div className="text-xs text-stone-400 mb-1">Total Tasks</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-stone-200">
          <div className="text-xs text-stone-400 mb-1">Completion Rate</div>
          <div className="text-2xl font-bold">
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-white border border-stone-200 rounded-lg">
        <div className="flex justify-between items-center p-4 border-b border-stone-200">
          <h2 className="font-semibold">Upcoming Tasks</h2>
          <Link to="/tasks" className="text-sm text-stone-500">View all →</Link>
        </div>
        {upcomingTasks.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No upcoming tasks</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {upcomingTasks.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="p-4 flex items-center justify-between hover:bg-stone-50"
              >
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-sm text-stone-500">{formatDate(task.due_date)}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  task.priority === 'high' ? 'bg-red-50 text-red-600' :
                  task.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                  'bg-stone-100 text-stone-600'
                }`}>
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