import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTasks } from '../services/taskService'
import { getAllModules } from '../services/moduleService'

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('due_date')

  // modules from the database for the filter dropdown
  const [modules, setModules] = useState([])

  useEffect(() => {
    loadTasks()
    loadModules()
  }, [])

  // reload when filters change
  useEffect(() => {
    loadTasks()
  }, [priorityFilter, moduleFilter, statusFilter])

  async function loadTasks() {
    setLoading(true)
    const filters = {}
    if (priorityFilter) filters.priority = priorityFilter
    if (moduleFilter) filters.module_id = moduleFilter
    if (statusFilter) filters.status = statusFilter

    const { data, error } = await getTasks(filters)
    if (!error && data) setTasks(data)
    setLoading(false)
  }

  async function loadModules() {
    const { data } = await getAllModules()
    if (data) setModules(data)
  }

  // search is done client-side 
  const filteredTasks = tasks.filter(task => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      task.title.toLowerCase().includes(term) ||
      (task.description && task.description.toLowerCase().includes(term)) ||
      (task.modules?.name && task.modules.name.toLowerCase().includes(term)) ||
      (task.modules?.code && task.modules.code.toLowerCase().includes(term)) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(term)))
    )
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'due_date') {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    }
    if (sortBy === 'priority') {
      const order = { high: 0, medium: 1, low: 2 }
      return (order[a.priority] || 2) - (order[b.priority] || 2)
    }
    if (sortBy === 'created') {
      return new Date(b.created_at) - new Date(a.created_at)
    }
    if (sortBy === 'module') {
      const aName = a.modules?.name || ''
      const bName = b.modules?.name || ''
      return aName.localeCompare(bName)
    }
    return 0
  })

  // figure out the due date label and colour
  function getDueLabel(task) {
    if (!task.due_date) return null
    const now = new Date()
    const due = new Date(task.due_date)
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24))

    if (task.status === 'completed') {
      return { text: 'Completed', colour: 'text-green-600' }
    }

    
    const isSoft = task.deadline_type === 'soft'

    if (diff < 0) {
      return {
        text: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''}`,
        colour: isSoft ? 'text-amber-500' : 'text-red-600'
      }
    }
    if (diff === 0) {
      return {
        text: 'Due today',
        colour: isSoft ? 'text-amber-500' : 'text-red-600'
      }
    }
    if (diff === 1) {
      return {
        text: 'Due tomorrow',
        colour: isSoft ? 'text-amber-400' : 'text-amber-600'
      }
    }
    if (diff <= 3) {
      return {
        text: `Due in ${diff} days`,
        colour: isSoft ? 'text-stone-400' : 'text-amber-600'
      }
    }
    if (diff <= 7) {
      return {
        text: `Due in ${diff} days`,
        colour: isSoft ? 'text-stone-400' : 'text-stone-600'
      }
    }

    // flexible deadline 
    if (task.deadline_type === 'flexible' && task.due_date_end) {
      const endDate = new Date(task.due_date_end)
      return {
        text: `${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        colour: 'text-blue-600'
      }
    }

    return {
      text: `Due in ${diff} days`,
      colour: isSoft ? 'text-stone-400' : 'text-stone-500'
    }
  }

  const overdue = sortedTasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
  )

  if (loading) return <div className="p-8 text-stone-400">Loading tasks...</div>

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">All Tasks</h1>
          <p className="text-stone-500 text-sm">
            {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}
            {overdue.length > 0 && (
              <span className="text-red-600"> · {overdue.length} overdue</span>
            )}
          </p>
        </div>
        <Link
          to="/tasks/new"
          className="px-4 py-2 bg-stone-900 text-white rounded text-sm font-medium hover:bg-stone-800"
        >
          + New Task
        </Link>
      </div>

      {/* filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="px-3 py-2 border border-stone-300 rounded text-sm w-64 focus:outline-none focus:border-stone-900"
        />
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
        >
          <option value="">All Modules</option>
          {modules.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}{m.code ? ` (${m.code})` : ''}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
        >
          <option value="due_date">Sort: Due Date</option>
          <option value="priority">Sort: Priority</option>
          <option value="created">Sort: Newest</option>
          <option value="module">Sort: Module</option>
        </select>
      </div>

      {/* task list */}
      {sortedTasks.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg mb-2">No tasks found</p>
          <p className="text-sm">Create your first task or adjust your filters</p>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg">
          {sortedTasks.map(task => {
            const dueLabel = getDueLabel(task)
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'

            return (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className={`flex items-center gap-3 px-4 py-3 border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition-colors ${
                  isOverdue ? 'bg-red-50' : ''
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${
                  task.status === 'completed' ? 'bg-stone-900 border-stone-900' : 'border-stone-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    task.status === 'completed' ? 'line-through text-stone-400' : ''
                  }`}>
                    {task.title}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {task.modules && (
                      <span className="text-xs bg-stone-100 px-2 py-0.5 rounded">
                        {task.modules.name}
                      </span>
                    )}
                    {dueLabel && (
                      <span className={`text-xs font-medium ${dueLabel.colour}`}>
                        {dueLabel.text}
                      </span>
                    )}
                    {task.deadline_type === 'soft' && (
                      <span className="text-xs text-stone-400">(soft)</span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  task.priority === 'high' ? 'bg-red-50 text-red-600' :
                  task.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                  'bg-stone-100 text-stone-500'
                }`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Tasks
