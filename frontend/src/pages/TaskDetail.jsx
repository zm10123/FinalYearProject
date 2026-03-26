import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getTaskById, updateTask, deleteTask, completeTask, uncompleteTask,
  archiveTask, getCompletionStatus,
  addSubtask, toggleSubtask, deleteSubtask,
  addTaskNote, deleteTaskNote,
  getTaskDependencies, addDependency, removeDependency,
  getTasks
} from '../services/taskService'
import { getCourses, getModules } from '../services/moduleService'
import { saveTaskAsTemplate } from '../services/templateService'

function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCourseId, setEditCourseId] = useState('')
  const [editModuleId, setEditModuleId] = useState('')
  const [editTaskType, setEditTaskType] = useState('assignment')
  const [editDueDate, setEditDueDate] = useState('')
  const [editDueDateEnd, setEditDueDateEnd] = useState('')
  const [editDeadlineType, setEditDeadlineType] = useState('hard')
  const [editPriority, setEditPriority] = useState('medium')
  const [editDuration, setEditDuration] = useState('')
  const [editWeighting, setEditWeighting] = useState('')

  // related data
  const [dependencies, setDependencies] = useState([])
  const [isCompleted, setIsCompleted] = useState(false)
  const [completionInfo, setCompletionInfo] = useState(null)

  // subtask/note inputs
  const [newSubtask, setNewSubtask] = useState('')
  const [newNote, setNewNote] = useState('')

  // dependency adding
  const [showDepSearch, setShowDepSearch] = useState(false)
  const [availableTasks, setAvailableTasks] = useState([])
  const [depSearch, setDepSearch] = useState('')

  // scoring
  const [scoreAchieved, setScoreAchieved] = useState('')
  const [scoreTotal, setScoreTotal] = useState('')


  const [courses, setCourses] = useState([])
  const [editModules, setEditModules] = useState([])

  useEffect(() => {
    loadTask()
    loadDependencies()
    checkCompletion()
  }, [id])

  async function loadTask() {
    setLoading(true)
    const { task: data, error: err } = await getTaskById(id)

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setTask(data)

    // set up score fields
    if (data.score_achieved !== null) setScoreAchieved(String(data.score_achieved))
    if (data.score_total !== null) setScoreTotal(String(data.score_total))

    setLoading(false)
  }

  async function loadDependencies() {
    const { data } = await getTaskDependencies(id)
    if (data) setDependencies(data)
  }

  async function checkCompletion() {
    const { completed } = await getCompletionStatus(id)
    setIsCompleted(completed)
  }

  function startEditing() {
    // populate edit form with current values
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditTaskType(task.task_type || 'assignment')
    setEditDueDate(task.due_date ? task.due_date.split('T')[0] : '')
    setEditDueDateEnd(task.due_date_end ? task.due_date_end.split('T')[0] : '')
    setEditDeadlineType(task.deadline_type || 'hard')
    setEditPriority(task.priority || 'medium')
    setEditDuration(task.estimated_duration ? String(task.estimated_duration) : '')
    setEditWeighting(task.weighting ? String(task.weighting) : '')

    // figure out course from module
    if (task.modules?.courses?.id) {
      setEditCourseId(task.modules.courses.id)
    }
    if (task.module_id) {
      setEditModuleId(task.module_id)
    }

    // load courses and modules for dropdowns
    loadEditDropdowns()
    setEditing(true)
  }

  async function loadEditDropdowns() {
    const { data: coursesData } = await getCourses()
    if (coursesData) setCourses(coursesData)

    // if there's already a course selected, load its modules
    if (task.modules?.courses?.id) {
      const { data: modulesData } = await getModules(task.modules.courses.id)
      if (modulesData) setEditModules(modulesData)
    }
  }

  async function handleEditCourseChange(newCourseId) {
    setEditCourseId(newCourseId)
    setEditModuleId('')
    if (newCourseId) {
      const { data } = await getModules(newCourseId)
      if (data) setEditModules(data)
    } else {
      setEditModules([])
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setSaving(true)

    const updates = {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      module_id: editModuleId || null,
      task_type: editTaskType,
      due_date: editDueDate || null,
      due_date_end: editDeadlineType === 'flexible' ? (editDueDateEnd || null) : null,
      deadline_type: editDeadlineType,
      priority: editPriority,
      estimated_duration: editDuration ? parseInt(editDuration) : null,
      weighting: editWeighting ? parseFloat(editWeighting) : null,
    }

    const { data, error: updateError } = await updateTask(id, updates)
    if (updateError) {
      setError(updateError.message)
    } else {
      // reload the full task to get joined data
      await loadTask()
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleComplete() {
    if (isCompleted) {
      const { error: err } = await uncompleteTask(id)
      if (err) {
        setError(err.message)
      } else {
        setIsCompleted(false)
        await loadTask()
      }
    } else {
      const { error: err } = await completeTask(id)
      if (err) {
        setError(err.message)
      } else {
        setIsCompleted(true)
        await loadTask()
      }
    }
  }

  async function handleArchive() {
    if (!window.confirm('Archive this task?')) return
    const { error: err } = await archiveTask(id)
    if (!err) navigate('/tasks')
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task permanently?')) return
    const { error: err } = await deleteTask(id)
    if (!err) navigate('/tasks')
  }

  async function handleSaveScore() {
    if (!scoreAchieved || !scoreTotal) return
    const { error: err } = await updateTask(id, {
      score_achieved: parseFloat(scoreAchieved),
      score_total: parseFloat(scoreTotal)
    })
    if (err) {
      setError(err.message)
    } else {
      await loadTask()
    }
  }

  async function handleAddSubtask(e) {
    e.preventDefault()
    if (!newSubtask.trim()) return
    const { data, error: err } = await addSubtask(id, newSubtask.trim())
    if (!err && data) {
      setTask({ ...task, subtasks: [...(task.subtasks || []), data] })
      setNewSubtask('')
    }
  }

  async function handleToggleSubtask(subtaskId, currentState) {
    const { error: err } = await toggleSubtask(subtaskId, !currentState)
    if (!err) {
      setTask({
        ...task,
        subtasks: task.subtasks.map(s =>
          s.id === subtaskId ? { ...s, is_completed: !currentState } : s
        )
      })
    }
  }

  async function handleDeleteSubtask(subtaskId) {
    const { error: err } = await deleteSubtask(subtaskId)
    if (!err) {
      setTask({
        ...task,
        subtasks: task.subtasks.filter(s => s.id !== subtaskId)
      })
    }
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!newNote.trim()) return
    const { data, error: err } = await addTaskNote(id, newNote.trim())
    if (!err && data) {
      setTask({ ...task, notes: [data, ...(task.notes || [])] })
      setNewNote('')
    }
  }

  async function handleDeleteNote(noteId) {
    const { error: err } = await deleteTaskNote(noteId)
    if (!err) {
      setTask({ ...task, notes: task.notes.filter(n => n.id !== noteId) })
    }
  }

  async function handleShowDepSearch() {
    const { data } = await getTasks({})
    if (data) {
      // filter out current task and existing dependencies
      const depIds = dependencies.map(d => d.depends_on_id)
      setAvailableTasks(data.filter(t => t.id !== id && !depIds.includes(t.id)))
    }
    setShowDepSearch(true)
  }

  async function handleAddDep(dependsOnId) {
    const { data, error: err } = await addDependency(id, dependsOnId)
    if (err) {
      setError(err.message)
    } else if (data) {
      setDependencies([...dependencies, data])
      setAvailableTasks(availableTasks.filter(t => t.id !== dependsOnId))
    }
  }

  async function handleRemoveDep(depId) {
    const { error: err } = await removeDependency(depId)
    if (!err) {
      setDependencies(dependencies.filter(d => d.id !== depId))
    }
  }

  async function handleSaveAsTemplate() {
    const templateData = {
      title: task.title,
      description: task.description,
      module_id: task.module_id,
      task_type: task.task_type,
      deadline_type: task.deadline_type,
      priority: task.priority,
      estimated_duration: task.estimated_duration,
      weighting: task.weighting,
      tags: task.tags,
      is_recurring: task.is_recurring,
      recurrence_pattern: task.recurrence_pattern,
    }
    const { error: err } = await saveTaskAsTemplate(templateData)
    if (err) {
      setError(err.message)
    } else {
      alert('Saved as template')
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Not set'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  function formatTimestamp(dateStr) {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  // check if dependencies are blocking completion
  const hasBlockingDeps = dependencies.some(d => d.tasks?.status !== 'completed')

  if (loading) return <div className="p-8 text-stone-400">Loading...</div>
  if (!task) return <div className="p-8 text-stone-500">Task not found</div>


  const isSoft = task.deadline_type === 'soft'

  return (
    <div>
      <Link to="/tasks" className="text-sm text-stone-500 hover:text-stone-900 mb-6 inline-block">
        ← Back to Tasks
      </Link>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* task header / edit form */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            {editing ? (
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                    rows={3} className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Course</label>
                    <select value={editCourseId} onChange={(e) => handleEditCourseChange(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded text-sm">
                      <option value="">No course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.year ? ` (Y${c.year})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Module</label>
                    <select value={editModuleId} onChange={(e) => setEditModuleId(e.target.value)}
                      disabled={!editCourseId}
                      className="w-full px-3 py-2 border border-stone-300 rounded text-sm disabled:bg-stone-100">
                      <option value="">No module</option>
                      {editModules.map(m => (
                        <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select value={editTaskType} onChange={(e) => setEditTaskType(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded text-sm">
                      <option value="assignment">Assignment</option>
                      <option value="exam">Exam</option>
                      <option value="coursework">Coursework</option>
                      <option value="tutorial">Tutorial</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded text-sm">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deadline Type</label>
                    <select value={editDeadlineType} onChange={(e) => setEditDeadlineType(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded text-sm">
                      <option value="hard">Hard</option>
                      <option value="soft">Soft</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {editDeadlineType === 'flexible' ? 'Earliest Date' : 'Due Date'}
                    </label>
                    <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded text-sm" />
                  </div>
                  {editDeadlineType === 'flexible' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Latest Date</label>
                      <input type="date" value={editDueDateEnd} onChange={(e) => setEditDueDateEnd(e.target.value)}
                        min={editDueDate}
                        className="w-full px-3 py-2 border border-stone-300 rounded text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (hours)</label>
                    <input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded text-sm" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Weighting (%)</label>
                    <input type="number" value={editWeighting} onChange={(e) => setEditWeighting(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded text-sm" min="0" max="100" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 text-sm bg-stone-900 text-white rounded disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm border border-stone-300 rounded">Cancel</button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-xl font-bold mb-2">{task.title}</h1>
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.priority === 'high' ? 'bg-red-50 text-red-600' :
                        task.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-stone-100 text-stone-500'
                      }`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                      </span>
                      {task.task_type && (
                        <span className="text-xs px-2 py-1 rounded bg-stone-100 text-stone-600">
                          {task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}
                        </span>
                      )}
                      {task.deadline_type && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.deadline_type === 'hard' ? 'bg-red-50 text-red-600' :
                          task.deadline_type === 'soft' ? 'bg-amber-50 text-amber-500' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {task.deadline_type.charAt(0).toUpperCase() + task.deadline_type.slice(1)} deadline
                        </span>
                      )}
                      {task.is_recurring && task.recurrence_pattern && (
                        <span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600">
                          {task.recurrence_pattern.charAt(0).toUpperCase() + task.recurrence_pattern.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={startEditing}
                      className="px-3 py-1.5 text-sm border border-stone-300 rounded hover:bg-stone-50">Edit</button>
                    <button onClick={handleComplete}
                      disabled={hasBlockingDeps && !isCompleted}
                      title={hasBlockingDeps && !isCompleted ? 'Blocked by dependencies' : ''}
                      className={`px-3 py-1.5 text-sm rounded ${
                        isCompleted
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : hasBlockingDeps
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}>
                      {isCompleted ? 'Completed ✓' : hasBlockingDeps ? 'Blocked' : 'Mark Complete'}
                    </button>
                  </div>
                </div>

                {task.description && (
                  <p className="text-sm text-stone-600 leading-relaxed">{task.description}</p>
                )}
              </div>
            )}
          </div>

          {/* subtasks */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold mb-3">Subtasks</h3>
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="space-y-2 mb-4">
                {task.subtasks.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3">
                    <button onClick={() => handleToggleSubtask(sub.id, sub.is_completed)}
                      className={`w-4 h-4 rounded border-2 flex-shrink-0 ${
                        sub.is_completed ? 'bg-stone-900 border-stone-900' : 'border-stone-300'}`} />
                    <span className={`text-sm flex-1 ${
                      sub.is_completed ? 'line-through text-stone-400' : ''}`}>{sub.title}</span>
                    <button onClick={() => handleDeleteSubtask(sub.id)}
                      className="text-stone-300 hover:text-red-500 text-sm">×</button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input type="text" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a subtask..."
                className="flex-1 px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              <button type="submit" className="px-3 py-2 text-sm border border-stone-300 rounded hover:bg-stone-50">Add</button>
            </form>
          </div>

          {/* notes */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold mb-3">Notes</h3>
            {task.notes && task.notes.length > 0 && (
              <div className="space-y-3 mb-4">
                {task.notes.map(note => (
                  <div key={note.id} className="bg-stone-50 rounded p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-stone-400 font-mono">{formatTimestamp(note.created_at)}</span>
                      <button onClick={() => handleDeleteNote(note.id)}
                        className="text-stone-300 hover:text-red-500 text-xs">×</button>
                    </div>
                    <p className="text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              <button type="submit" className="px-3 py-2 text-sm border border-stone-300 rounded hover:bg-stone-50">Add</button>
            </form>
          </div>

          {/* dependencies */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold mb-3">Dependencies</h3>
            {dependencies.length > 0 && (
              <div className="space-y-2 mb-4">
                {dependencies.map(dep => (
                  <div key={dep.id} className="flex items-center gap-3 p-2 bg-stone-50 rounded">
                    <span className={`w-2 h-2 rounded-full ${
                      dep.tasks?.status === 'completed' ? 'bg-green-500' : 'bg-amber-400'}`} />
                    <span className="text-sm flex-1">{dep.tasks?.title || 'Unknown task'}</span>
                    <span className="text-xs text-stone-400">
                      {dep.tasks?.status === 'completed' ? 'Done' : 'Pending'}
                    </span>
                    <button onClick={() => handleRemoveDep(dep.id)}
                      className="text-stone-300 hover:text-red-500 text-xs">×</button>
                  </div>
                ))}
              </div>
            )}

            {showDepSearch ? (
              <div className="space-y-2">
                <input type="text" value={depSearch} onChange={(e) => setDepSearch(e.target.value)}
                  placeholder="Search for a task..."
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {availableTasks
                    .filter(t => !depSearch || t.title.toLowerCase().includes(depSearch.toLowerCase()))
                    .map(t => (
                      <button key={t.id} onClick={() => handleAddDep(t.id)}
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-stone-50">
                        {t.title}
                      </button>
                    ))}
                </div>
                <button onClick={() => setShowDepSearch(false)}
                  className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
              </div>
            ) : (
              <button onClick={handleShowDepSearch}
                className="w-full py-2 text-sm border border-dashed border-stone-300 rounded hover:bg-stone-50 text-stone-500">
                + Add Dependency
              </button>
            )}
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-6">

          {/* details card */}
          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-400">Module</span>
                <span className="font-medium">
                  {task.modules ? task.modules.name : 'None'}
                </span>
              </div>
              {task.modules?.code && (
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-400">Code</span>
                  <span className="font-medium">{task.modules.code}</span>
                </div>
              )}
              {task.modules?.courses && (
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-400">Course</span>
                  <span className="font-medium">{task.modules.courses.name}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-400">Due Date</span>
                <span className={`font-medium ${isSoft ? 'text-stone-500' : ''}`}>
                  {formatDate(task.due_date)}
                </span>
              </div>
              {task.deadline_type === 'flexible' && task.due_date_end && (
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-400">Latest Date</span>
                  <span className="font-medium text-blue-600">{formatDate(task.due_date_end)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-400">Deadline</span>
                <span className="font-medium">
                  {task.deadline_type ? task.deadline_type.charAt(0).toUpperCase() + task.deadline_type.slice(1) : 'Not set'}
                </span>
              </div>
              {task.estimated_duration && (
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-400">Est. Duration</span>
                  <span className="font-medium">{task.estimated_duration}h</span>
                </div>
              )}
              {task.weighting && (
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-400">Weighting</span>
                  <span className="font-medium">{task.weighting}%</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-400">Created</span>
                <span className="font-medium">{formatDate(task.created_at)}</span>
              </div>
              {task.is_recurring && (
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-400">Recurrence</span>
                  <span className="font-medium">
                    {task.recurrence_pattern
                      ? task.recurrence_pattern.charAt(0).toUpperCase() + task.recurrence_pattern.slice(1)
                      : 'None'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* scoring */}
          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Score</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-400 mb-1 block">Mark achieved</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={scoreAchieved}
                    onChange={(e) => setScoreAchieved(e.target.value)}
                    className="w-20 px-3 py-2 border border-stone-300 rounded text-sm text-center font-mono"
                    placeholder="0" min="0" />
                  <span className="text-stone-400">/</span>
                  <input type="number" value={scoreTotal}
                    onChange={(e) => setScoreTotal(e.target.value)}
                    className="w-20 px-3 py-2 border border-stone-300 rounded text-sm text-center font-mono"
                    placeholder="100" min="0" />
                  <button onClick={handleSaveScore}
                    className="px-3 py-2 text-xs bg-stone-900 text-white rounded">Save</button>
                </div>
              </div>
              {task.score_achieved !== null && task.score_total && (
                <div className="bg-stone-50 rounded p-3 flex justify-between items-center">
                  <span className="text-sm">Percentage</span>
                  <span className="text-lg font-bold font-mono">
                    {((task.score_achieved / task.score_total) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {task.score_achieved !== null && task.score_total && task.weighting && (
                <div className="bg-stone-50 rounded p-3 flex justify-between items-center">
                  <span className="text-sm">Weighted</span>
                  <span className="text-lg font-bold font-mono">
                    {((task.score_achieved / task.score_total) * task.weighting).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 bg-stone-100 rounded">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* actions */}
          <div className="bg-white border border-stone-200 rounded-lg p-5 space-y-2">
            <button onClick={handleSaveAsTemplate}
              className="w-full py-2 text-sm text-stone-600 border border-stone-200 rounded hover:bg-stone-50">
              Save as Template
            </button>
            <button onClick={handleArchive}
              className="w-full py-2 text-sm text-amber-600 border border-amber-200 rounded hover:bg-amber-50">
              Archive
            </button>
            <button onClick={handleDelete}
              className="w-full py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetail
