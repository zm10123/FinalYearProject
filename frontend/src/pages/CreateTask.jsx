import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createTask } from '../services/taskService'
import { getCourses, getModules, createCourse, createModule } from '../services/moduleService'
import { getTemplates, getTemplateById, saveTaskAsTemplate } from '../services/templateService'
import { getGroups } from '../services/groupService'

function CreateTask() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [taskType, setTaskType] = useState('assignment')
  const [dueDate, setDueDate] = useState('')
  const [dueDateEnd, setDueDateEnd] = useState('')
  const [deadlineType, setDeadlineType] = useState('hard')
  const [priority, setPriority] = useState('medium')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [weighting, setWeighting] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState('weekly')
  const [groupId, setGroupId] = useState('')

  // course/module data
  const [courses, setCourses] = useState([])
  const [modules, setModules] = useState([])
  const [showNewCourse, setShowNewCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseYear, setNewCourseYear] = useState('')
  const [showNewModule, setShowNewModule] = useState(false)
  const [newModuleName, setNewModuleName] = useState('')
  const [newModuleCode, setNewModuleCode] = useState('')

  // templates
  const [templates, setTemplates] = useState([])
  const [showTemplates, setShowTemplates] = useState(false)

  // ui state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // groups 
  const [groups, setGroups] = useState([])

  useEffect(() => {
    loadCourses()
    loadTemplates()
    loadGroups()

    // check if we're creating from a template or for a group based on URL params
    const templateId = searchParams.get('template')
    if (templateId) {
      applyTemplate(templateId)
    }

    const groupParam = searchParams.get('group')
    if (groupParam) setGroupId(groupParam)
  }, [])

  // when course changes, load its modules
  useEffect(() => {
    if (courseId) {
      loadModules(courseId)
    } else {
      setModules([])
      setModuleId('')
    }
  }, [courseId])

  async function loadCourses() {
    const { data } = await getCourses()
    if (data) setCourses(data)
  }

  async function loadModules(forCourseId) {
    const { data } = await getModules(forCourseId)
    if (data) setModules(data)
  }

  async function loadTemplates() {
    const { data } = await getTemplates()
    if (data) setTemplates(data)
  }

  async function applyTemplate(templateId) {
    const { data } = await getTemplateById(templateId)
    if (data) {
      setTitle(data.title || '')
      setDescription(data.description || '')
      setTaskType(data.task_type || 'assignment')
      setDeadlineType(data.deadline_type || 'hard')
      setPriority(data.priority || 'medium')
      setEstimatedDuration(data.estimated_duration ? String(data.estimated_duration) : '')
      setWeighting(data.weighting ? String(data.weighting) : '')
      setTags(data.tags || [])
      setIsRecurring(data.is_recurring || false)
      setRecurrencePattern(data.recurrence_pattern || 'weekly')
      if (data.module_id) {
        setModuleId(data.module_id)

      }
    }
  }

  async function handleAddCourse(e) {
    e.preventDefault()
    if (!newCourseName.trim()) return

    const { data, error: err } = await createCourse(
      newCourseName.trim(),
      newCourseYear ? parseInt(newCourseYear) : null,
      null
    )
    if (err) {
      setError(err.message)
    } else {
      setCourses([...courses, data])
      setCourseId(data.id)
      setNewCourseName('')
      setNewCourseYear('')
      setShowNewCourse(false)
    }
  }

  async function handleAddModule(e) {
    e.preventDefault()
    if (!newModuleName.trim() || !courseId) return

    const { data, error: err } = await createModule(
      courseId,
      newModuleName.trim(),
      newModuleCode.trim() || null,
      null
    )
    if (err) {
      setError(err.message)
    } else {
      setModules([...modules, data])
      setModuleId(data.id)
      setNewModuleName('')
      setNewModuleCode('')
      setShowNewModule(false)
    }
  }

  function handleTagKeyDown(e) {
    // prevent form submission when pressing enter in tag input
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = tagInput.trim().toLowerCase()
      if (val && !tags.includes(val)) {
        setTags([...tags, val])
      }
      setTagInput('')
    }
  }

  function removeTag(tagToRemove) {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setLoading(true)
    setError('')

    const taskData = {
      title: title.trim(),
      description: description.trim() || null,
      module_id: moduleId || null,
      task_type: taskType,
      due_date: dueDate || null,
      due_date_end: deadlineType === 'flexible' ? (dueDateEnd || null) : null,
      deadline_type: deadlineType,
      priority,
      estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : null,
      weighting: weighting ? parseFloat(weighting) : null,
      group_id: groupId || null,
      tags,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : null,
    }

    const { error: createError } = await createTask(taskData)

    if (createError) {
      setError(createError.message)
      setLoading(false)
    } else {
      navigate('/tasks')
    }
  }

  async function handleSaveAsTemplate() {
    if (!title.trim()) {
      setError('Add a title before saving as template')
      return
    }
    const templateData = {
      title, description, module_id: moduleId || null,
      task_type: taskType, deadline_type: deadlineType, priority,
      estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : null,
      weighting: weighting ? parseFloat(weighting) : null,
      tags, is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : null,
    }
    const { error: templateError } = await saveTaskAsTemplate(templateData)
    if (templateError) {
      setError(templateError.message)
    } else {
      await loadTemplates()
      alert('Template saved')
    }
  }

  async function loadGroups() {
    const { data } = await getGroups()
    if (data) setGroups(data.filter(g => g.memberStatus === 'accepted'))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Create Task</h1>
      <p className="text-stone-500 text-sm mb-6">Add a new assignment or deadline</p>

      {templates.length > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-sm text-stone-600 hover:text-stone-900 underline"
          >
            {showTemplates ? 'Hide templates' : 'Create from template'}
          </button>
          {showTemplates && (
            <div className="mt-3 bg-white border border-stone-200 rounded-lg p-4 space-y-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-stone-50 text-sm"
                >
                  <span className="font-medium">{t.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* basic details */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase text-stone-400 tracking-wide">Basic Details</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
              placeholder="e.g. Database Coursework"
            />
            <p className="text-xs text-stone-400 mt-1 text-right">{title.length}/100</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900 min-h-[100px]"
              placeholder="What needs to be done?"
              rows={4}
            />
          </div>

          {/* course and module selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Course</label>
              {!showNewCourse ? (
                <div>
                  <select
                    value={courseId}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setShowNewCourse(true)
                      } else {
                        setCourseId(e.target.value)
                        setModuleId('')
                      }
                    }}
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Select course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.year ? ` (Year ${c.year})` : ''}
                      </option>
                    ))}
                    <option value="new">+ Add new course</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-stone-50 rounded border border-stone-200">
                  <input
                    type="text"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="Course name"
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
                  />
                  <input
                    type="number"
                    value={newCourseYear}
                    onChange={(e) => setNewCourseYear(e.target.value)}
                    placeholder="Year (e.g. 2)"
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddCourse}
                      className="px-3 py-1.5 text-xs bg-stone-900 text-white rounded">Save</button>
                    <button type="button" onClick={() => setShowNewCourse(false)}
                      className="px-3 py-1.5 text-xs border border-stone-300 rounded">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Module</label>
              {!showNewModule ? (
                <div>
                  <select
                    value={moduleId}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setShowNewModule(true)
                      } else {
                        setModuleId(e.target.value)
                      }
                    }}
                    disabled={!courseId}
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900 disabled:bg-stone-100 disabled:text-stone-400"
                  >
                    <option value="">{courseId ? 'Select module...' : 'Pick a course first'}</option>
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.code ? ` (${m.code})` : ''}
                      </option>
                    ))}
                    {courseId && <option value="new">+ Add new module</option>}
                  </select>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-stone-50 rounded border border-stone-200">
                  <input
                    type="text"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    placeholder="Module name"
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
                  />
                  <input
                    type="text"
                    value={newModuleCode}
                    onChange={(e) => setNewModuleCode(e.target.value)}
                    placeholder="Module code (e.g. CS2001)"
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddModule}
                      className="px-3 py-1.5 text-xs bg-stone-900 text-white rounded">Save</button>
                    <button type="button" onClick={() => setShowNewModule(false)}
                      className="px-3 py-1.5 text-xs border border-stone-300 rounded">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Task Type</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
            >
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
              <option value="coursework">Coursework</option>
              <option value="tutorial">Tutorial</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {groups.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Group (optional)</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
            >
              <option value="">Personal task</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* deadline and priority */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase text-stone-400 tracking-wide">Deadline & Priority</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {deadlineType === 'flexible' ? 'Earliest Date' : 'Due Date'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Deadline Type</label>
              <select
                value={deadlineType}
                onChange={(e) => setDeadlineType(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
              >
                <option value="hard">Hard (fixed)</option>
                <option value="soft">Soft (reminder)</option>
                <option value="flexible">Flexible (date range)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {deadlineType === 'flexible' && (
            <div>
              <label className="block text-sm font-medium mb-1">Latest Date</label>
              <input
                type="date"
                value={dueDateEnd}
                onChange={(e) => setDueDateEnd(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
              />
              <p className="text-xs text-stone-400 mt-1">
                This task can be done anytime between the earliest and latest dates
              </p>
            </div>
          )}

          {deadlineType === 'soft' && (
            <p className="text-xs text-stone-400">
              Soft deadlines show as gentle reminders with muted colours
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Duration (hours)</label>
              <input
                type="number"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
                placeholder="e.g. 4"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weighting (%)</label>
              <input
                type="number"
                value={weighting}
                onChange={(e) => setWeighting(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900"
                placeholder="e.g. 30"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* recurrence */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase text-stone-400 tracking-wide">Recurrence</h2>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`w-10 h-5 rounded-full relative transition-colors ${isRecurring ? 'bg-stone-900' : 'bg-stone-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isRecurring ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-sm">Repeat this task</span>
          </div>

          {isRecurring && (
            <div className="flex gap-2 flex-wrap">
              {['daily', 'weekly', 'fortnightly', 'monthly'].map(pattern => (
                <button
                  key={pattern}
                  type="button"
                  onClick={() => setRecurrencePattern(pattern)}
                  className={`px-3 py-1.5 rounded text-sm border ${recurrencePattern === pattern
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'border-stone-300 hover:border-stone-400'
                    }`}
                >
                  {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* tags */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase text-stone-400 tracking-wide">Tags</h2>

          <div className="flex flex-wrap gap-2 items-center p-2 border border-stone-300 rounded min-h-[42px]">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 rounded text-xs">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}
                  className="text-stone-400 hover:text-stone-600">×</button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="flex-1 min-w-[100px] px-2 py-1 text-sm border-none outline-none"
              placeholder="Type and press Enter to add..."
            />
          </div>
        </div>

        {/* buttons */}
        <div className="flex justify-between pt-4 border-t border-stone-200">
          <button
            type="button"
            onClick={handleSaveAsTemplate}
            className="px-4 py-2 text-sm text-stone-500 hover:text-stone-900 underline"
          >
            Save as template
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="px-4 py-2 text-sm border border-stone-300 rounded hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-stone-900 text-white rounded hover:bg-stone-800 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CreateTask
