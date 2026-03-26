import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getArchivedTasks, updateTask, uncompleteTask } from '../services/taskService'

function Archive() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadArchived()
  }, [])

  async function loadArchived() {
    setLoading(true)
    const { data, error } = await getArchivedTasks()
    if (!error && data) setTasks(data)
    setLoading(false)
  }

  async function handleRestore(taskId) {
    const { error } = await updateTask(taskId, { status: 'pending' })
    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId))
    }
  }

  async function handleMarkIncomplete(taskId) {
    const { error } = await uncompleteTask(taskId)
    if (!error) {
      // reload to get the updated status
      await loadArchived()
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  if (loading) return <div className="p-8 text-stone-400">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Archive</h1>
      <p className="text-stone-500 text-sm mb-6">
        {tasks.length} archived task{tasks.length !== 1 ? 's' : ''}
      </p>

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg mb-2">No archived tasks</p>
          <p className="text-sm">Tasks you archive will appear here</p>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg">
          {tasks.map(task => (
            <div key={task.id}
              className="flex items-center gap-4 px-4 py-3 border-b border-stone-100 last:border-b-0">
              <div className="flex-1">
                <Link to={`/tasks/${task.id}`} className="text-sm font-medium hover:underline">
                  {task.title}
                </Link>
                <div className="flex items-center gap-3 mt-1">
                  {task.modules && (
                    <span className="text-xs bg-stone-100 px-2 py-0.5 rounded">
                      {task.modules.name}
                    </span>
                  )}
                  {task.score_achieved !== null && task.score_total && (
                    <span className="text-xs text-stone-500">
                      Score: {task.score_achieved}/{task.score_total}
                    </span>
                  )}
                  <span className="text-xs text-stone-400">{formatDate(task.updated_at)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {task.status === 'completed' ? (
                  <button onClick={() => handleMarkIncomplete(task.id)}
                    className="px-3 py-1.5 text-xs border border-amber-300 text-amber-600 rounded hover:bg-amber-50">
                    Mark Incomplete
                  </button>
                ) : (
                  <button onClick={() => handleRestore(task.id)}
                    className="px-3 py-1.5 text-xs border border-stone-300 rounded hover:bg-stone-50">
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Archive
