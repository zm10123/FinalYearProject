import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getArchivedTasks, unarchiveTask, deleteTask } from '../services/taskService'

function History() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCourses, setExpandedCourses] = useState({})
  const [expandedModules, setExpandedModules] = useState({})

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    setLoading(true)
    const { data } = await getArchivedTasks()
    if (data) {
      setTasks(data)
      // expand everything by default
      const courses = {}
      const modules = {}
      data.forEach(t => {
        const courseId = t.modules?.courses?.id || 'none'
        const moduleId = t.modules?.id || 'none'
        courses[courseId] = true
        modules[moduleId] = true
      })
      setExpandedCourses(courses)
      setExpandedModules(modules)
    }
    setLoading(false)
  }

  async function handleRestore(taskId) {
    if (!window.confirm('Restore this task back to your active list?')) return
    const { error } = await unarchiveTask(taskId)
    if (!error) await loadTasks()
  }

  async function handleDelete(taskId) {
    const confirmed = window.confirm(
      'Delete this task permanently? Its score will no longer count towards grades or predictions. This cannot be undone.'
    )
    if (!confirmed) return
    const { error } = await deleteTask(taskId)
    if (!error) await loadTasks()
  }

  function toggleCourse(id) {
    setExpandedCourses({ ...expandedCourses, [id]: !expandedCourses[id] })
  }

  function toggleModule(id) {
    setExpandedModules({ ...expandedModules, [id]: !expandedModules[id] })
  }

  // group tasks: course -> module -> [tasks]
  const grouped = {}
  tasks.forEach(t => {
    const courseId = t.modules?.courses?.id || 'none'
    const courseName = t.modules?.courses?.name || 'No Course'
    const moduleId = t.modules?.id || 'none'
    const moduleName = t.modules?.name || 'No Module'

    if (!grouped[courseId]) {
      grouped[courseId] = { name: courseName, modules: {} }
    }
    if (!grouped[courseId].modules[moduleId]) {
      grouped[courseId].modules[moduleId] = { name: moduleName, tasks: [] }
    }
    grouped[courseId].modules[moduleId].tasks.push(t)
  })

  function formatDate(dateStr) {
    if (!dateStr) return 'No date'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  if (loading) return <div className="p-8 text-stone-400">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">History</h1>
      <p className="text-stone-500 text-sm mb-6">
        Archived tasks — scores still count towards grades and predictions
      </p>

      {tasks.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
          <p className="text-sm text-stone-500">No archived tasks yet.</p>
          <p className="text-xs text-stone-400 mt-2">
            Archive tasks from the task detail page when you want to keep them but hide them from your main list.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([courseId, course]) => (
            <div key={courseId} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              {/* course header */}
              <button onClick={() => toggleCourse(courseId)}
                className="w-full px-5 py-3 bg-stone-50 border-b border-stone-200 flex justify-between items-center hover:bg-stone-100">
                <h2 className="text-sm font-semibold">{course.name}</h2>
                <span className="text-xs text-stone-400">
                  {expandedCourses[courseId] ? '−' : '+'}
                </span>
              </button>

              {expandedCourses[courseId] && (
                <div>
                  {Object.entries(course.modules).map(([moduleId, mod]) => (
                    <div key={moduleId} className="border-b border-stone-100 last:border-b-0">
                      {/* module header */}
                      <button onClick={() => toggleModule(moduleId)}
                        className="w-full px-5 py-2.5 flex justify-between items-center hover:bg-stone-50 text-left">
                        <span className="text-sm">{mod.name}</span>
                        <span className="text-xs text-stone-400">
                          {mod.tasks.length} task{mod.tasks.length !== 1 ? 's' : ''} · {expandedModules[moduleId] ? '−' : '+'}
                        </span>
                      </button>

                      {expandedModules[moduleId] && (
                        <div className="bg-stone-50/30">
                          {mod.tasks.map(task => (
                            <div key={task.id} className="px-5 py-3 border-t border-stone-100 flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <Link to={`/tasks/${task.id}`}
                                  className="text-sm font-medium hover:underline">
                                  {task.title}
                                </Link>
                                <div className="flex gap-3 mt-0.5 text-xs text-stone-400">
                                  <span>{task.task_type}</span>
                                  {task.due_date && <span>Due {formatDate(task.due_date)}</span>}
                                  {task.score_achieved !== null && task.score_total && (
                                    <span className="text-green-700 font-medium">
                                      {((task.score_achieved / task.score_total) * 100).toFixed(1)}%
                                    </span>
                                  )}
                                  {task.weighting && <span>{task.weighting}% weight</span>}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => handleRestore(task.id)}
                                  className="px-2 py-1 text-xs border border-stone-300 rounded hover:bg-white">
                                  Restore
                                </button>
                                <button onClick={() => handleDelete(task.id)}
                                  className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50">
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default History
