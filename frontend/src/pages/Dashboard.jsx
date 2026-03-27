import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTasks, getScoredTasks } from '../services/taskService'
import { getAllModules, getCourses } from '../services/moduleService'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [scoredTasks, setScoredTasks] = useState([])
  const [modules, setModules] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    const [tasksRes, scoredRes, modulesRes, coursesRes] = await Promise.all([
      getTasks({}),
      getScoredTasks(),
      getAllModules(),
      getCourses()
    ])
    if (tasksRes.data) setTasks(tasksRes.data)
    if (scoredRes.data) setScoredTasks(scoredRes.data)
    if (modulesRes.data) setModules(modulesRes.data)
    if (coursesRes.data) setCourses(coursesRes.data)
    setLoading(false)
  }

 

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false
    return new Date(t.due_date) < startOfToday
  })

  const weekEnd = new Date(startOfToday)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const dueThisWeek = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false
    const due = new Date(t.due_date)
    return due >= startOfToday && due <= weekEnd
  })

  const weekStart = new Date(startOfToday)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const completedThisWeek = tasks.filter(t => {
    if (t.status !== 'completed') return false
    return new Date(t.updated_at) >= weekStart
  })

  const activeTasks = tasks.filter(t => t.status !== 'completed')

  // upcoming deadlines sorted by due date
  const upcoming = tasks
    .filter(t => t.due_date && t.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6)

  // average grade
  const avgGrade = scoredTasks.length > 0
    ? scoredTasks.reduce((sum, t) => sum + (t.score_achieved / t.score_total) * 100, 0) / scoredTasks.length
    : null

  // grade per module
  function getModuleGrade(moduleId) {
    const mt = scoredTasks.filter(t => t.module_id === moduleId)
    if (mt.length === 0) return null
    const hasWeights = mt.some(t => t.weighting)
    if (hasWeights) {
      let wSum = 0, wTotal = 0
      mt.forEach(t => {
        const pct = (t.score_achieved / t.score_total) * 100
        wSum += pct * (t.weighting || 0)
        wTotal += (t.weighting || 0)
      })
      return wTotal > 0 ? wSum / wTotal : null
    }
    return mt.reduce((s, t) => s + (t.score_achieved / t.score_total) * 100, 0) / mt.length
  }

  // eisenhower matrix
  const threeDays = new Date(startOfToday)
  threeDays.setDate(threeDays.getDate() + 3)

  function isUrgent(t) {
    if (!t.due_date) return false
    return new Date(t.due_date) <= threeDays
  }

  const quadrants = {
    doFirst: activeTasks.filter(t => isUrgent(t) && t.priority === 'high'),
    schedule: activeTasks.filter(t => !isUrgent(t) && t.priority === 'high'),
    doNext: activeTasks.filter(t => isUrgent(t) && t.priority !== 'high'),
    later: activeTasks.filter(t => !isUrgent(t) && t.priority !== 'high'),
  }

  // timeline data - recent completed + upcoming
  const recentCompleted = tasks
    .filter(t => t.status === 'completed' && t.due_date)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 2)

  const timelineUpcoming = tasks
    .filter(t => t.due_date && t.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 3)

  const timelineItems = [
    ...recentCompleted.map(t => ({ ...t, _type: 'completed' })),
    ...timelineUpcoming.map(t => ({ ...t, _type: 'upcoming' }))
  ].sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  // gantt chart data - next 5 active tasks with due dates
  const ganttTasks = tasks
    .filter(t => t.due_date && t.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5)

  const ganttStart = ganttTasks.length > 0
    ? new Date(Math.min(startOfToday, new Date(ganttTasks[0].due_date)))
    : startOfToday
  const ganttEnd = ganttTasks.length > 0
    ? new Date(Math.max(...ganttTasks.map(t => new Date(t.due_date).getTime())))
    : new Date(startOfToday.getTime() + 14 * 86400000)
  const ganttRange = Math.max((ganttEnd - ganttStart) / 86400000, 7)

  // mini calendar
  const calYear = now.getFullYear()
  const calMonth = now.getMonth()
  const firstDay = new Date(calYear, calMonth, 1)
  const lastDay = new Date(calYear, calMonth + 1, 0)
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

  const calendarDays = []
  for (let i = 0; i < startDay; i++) {
    calendarDays.push({ date: new Date(calYear, calMonth, -startDay + i + 1), current: false })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    calendarDays.push({ date: new Date(calYear, calMonth, i), current: true })
  }

  function dayHasTasks(date) {
    return tasks.some(t => {
      if (!t.due_date) return false
      return new Date(t.due_date).toDateString() === date.toDateString()
    })
  }

  // --- helpers ---

  function getDueLabel(task) {
    if (!task.due_date) return { text: 'No date', colour: 'text-stone-400' }
    const due = new Date(task.due_date)
    const diff = Math.ceil((due - startOfToday) / 86400000)
    const isSoft = task.deadline_type === 'soft'

    if (diff < 0) return { text: `Overdue by ${Math.abs(diff)}d`, colour: isSoft ? 'text-amber-500' : 'text-red-600' }
    if (diff === 0) return { text: 'Due today', colour: isSoft ? 'text-amber-500' : 'text-red-600' }
    if (diff === 1) return { text: 'Due tomorrow', colour: isSoft ? 'text-amber-400' : 'text-amber-600' }
    if (diff <= 3) return { text: `Due in ${diff} days`, colour: isSoft ? 'text-stone-400' : 'text-amber-600' }
    if (diff <= 7) return { text: `Due in ${diff} days`, colour: isSoft ? 'text-stone-400' : 'text-stone-600' }
    return { text: `Due in ${diff} days`, colour: 'text-stone-500' }
  }

  function formatShortDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  function gradeColour(grade) {
    if (grade >= 70) return '#16a34a'
    if (grade >= 60) return '#2563eb'
    if (grade >= 50) return '#d97706'
    if (grade >= 40) return '#ea580c'
    return '#dc2626'
  }

  function gradeClass(grade) {
    if (grade >= 70) return 'First'
    if (grade >= 60) return '2:1'
    if (grade >= 50) return '2:2'
    if (grade >= 40) return 'Third'
    return 'Below'
  }

  const ganttColours = ['bg-purple-500', 'bg-blue-500', 'bg-teal-500', 'bg-amber-500', 'bg-red-400']

  if (loading) return <div className="p-8 text-stone-400">Loading dashboard...</div>

  return (
    <div>
      {/* header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-stone-500 text-sm">
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link to="/tasks/new"
          className="px-4 py-2 bg-stone-900 text-white rounded text-sm font-medium hover:bg-stone-800">
          + New Task
        </Link>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-stone-200 rounded-lg p-5">
          <div className="text-xs text-stone-400 mb-1">Due This Week</div>
          <div className="text-2xl font-bold">{dueThisWeek.length}</div>
          {overdueTasks.length > 0 && (
            <div className="text-xs text-red-600 mt-1">{overdueTasks.length} overdue</div>
          )}
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-5">
          <div className="text-xs text-stone-400 mb-1">Completed</div>
          <div className="text-2xl font-bold">{completedThisWeek.length}</div>
          <div className="text-xs text-green-600 mt-1">This week</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-5">
          <div className="text-xs text-stone-400 mb-1">Avg Grade</div>
          <div className="text-2xl font-bold">{avgGrade !== null ? `${avgGrade.toFixed(0)}%` : '—'}</div>
          {avgGrade !== null && (
            <div className="text-xs mt-1" style={{ color: gradeColour(avgGrade) }}>{gradeClass(avgGrade)}</div>
          )}
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-5">
          <div className="text-xs text-stone-400 mb-1">Est. Hours</div>
          <div className="text-2xl font-bold">{activeTasks.reduce((s, t) => s + (t.estimated_duration || 0), 0)}h</div>
          <div className="text-xs text-stone-500 mt-1">remaining</div>
        </div>
      </div>

      {/* section 1: tasks + progress  */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* upcoming deadlines */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-lg">
          <div className="flex justify-between items-center px-5 py-3 border-b border-stone-100">
            <h3 className="text-sm font-semibold">Upcoming Deadlines</h3>
            <Link to="/tasks" className="text-xs text-stone-400 hover:text-stone-600">View all →</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-stone-400">No upcoming deadlines</div>
          ) : (
            <div>
              {upcoming.map(task => {
                const label = getDueLabel(task)
                const isOverdue = task.due_date && new Date(task.due_date) < startOfToday
                return (
                  <Link key={task.id} to={`/tasks/${task.id}`}
                    className={`flex items-center gap-3 px-5 py-3 border-b border-stone-100 last:border-b-0 hover:bg-stone-50 ${
                      isOverdue ? 'bg-red-50/50' : ''}`}>
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${
                      task.status === 'completed' ? 'bg-stone-900 border-stone-900' : 'border-stone-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.modules && (
                          <span className="text-xs bg-stone-100 px-1.5 py-0.5 rounded">{task.modules.code || task.modules.name}</span>
                        )}
                        <span className={`text-xs font-medium ${label.colour}`}>{label.text}</span>
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

        {/* right sidebar - module progress and calendar */}
        <div className="space-y-4">

          {/* module progress */}
          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Module Progress</h3>
            {modules.length === 0 ? (
              <p className="text-xs text-stone-400">No modules yet</p>
            ) : (
              <div className="space-y-4">
                {modules.map(mod => {
                  const grade = getModuleGrade(mod.id)
                  const target = mod.target_grade
                  return (
                    <div key={mod.id}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium">
                          {mod.code ? `${mod.code} ` : ''}{mod.name}
                        </span>
                        <span className="text-xs font-mono" style={grade !== null ? { color: gradeColour(grade) } : {}}>
                          {grade !== null ? `${grade.toFixed(0)}%` : '—'}
                        </span>
                      </div>
                      <div className="relative h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        {grade !== null && (
                          <div className="absolute h-full rounded-full"
                            style={{ width: `${Math.min(grade, 100)}%`, backgroundColor: gradeColour(grade) }} />
                        )}
                        {target && (
                          <div className="absolute top-0 h-full w-0.5 bg-stone-400"
                            style={{ left: `${Math.min(target, 100)}%` }} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* course overview */}
          {courses.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-3">Course Overview</h3>
              {courses.map(course => {
                const cMods = modules.filter(m => m.course_id === course.id)
                const cGrades = cMods.map(m => getModuleGrade(m.id)).filter(g => g !== null)
                const cAvg = cGrades.length > 0 ? cGrades.reduce((a, b) => a + b, 0) / cGrades.length : null
                return (
                  <div key={course.id} className="flex justify-between items-center py-2 border-b border-stone-100 last:border-b-0">
                    <div>
                      <div className="text-xs font-medium">{course.name}</div>
                      <div className="text-xs text-stone-400">{cMods.length} module{cMods.length !== 1 ? 's' : ''}{course.year && ` · Year ${course.year}`}</div>
                    </div>
                    {cAvg !== null ? (
                      <div className="text-sm font-bold font-mono" style={{ color: gradeColour(cAvg) }}>{cAvg.toFixed(0)}%</div>
                    ) : (
                      <div className="text-xs text-stone-400">—</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* mini calendar */}
          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">
              {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const isToday = day.date.toDateString() === now.toDateString()
                const hasTasks = dayHasTasks(day.date)
                return (
                  <div key={i} className={`text-center text-xs py-1.5 rounded relative cursor-default ${
                    !day.current ? 'text-stone-300' :
                    isToday ? 'bg-stone-900 text-white font-semibold' : 'text-stone-700 hover:bg-stone-50'
                  }`}>
                    {day.date.getDate()}
                    {hasTasks && (
                      <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        isToday ? 'bg-white' : 'bg-red-400'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* planning & productivity tools */}
      <div className="border-t border-stone-200 pt-8 mt-4">
        <h2 className="text-lg font-bold mb-6">Planning & Productivity Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* timeline */}
          <div className="bg-white border border-stone-200 rounded-lg">
            <div className="flex justify-between items-center px-5 py-3 border-b border-stone-100">
              <span className="text-sm font-semibold">Timeline</span>
              <Link to="/calendar" className="text-xs text-stone-400 hover:text-stone-600">View full →</Link>
            </div>
            <div className="p-5">
              {timelineItems.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No timeline data yet</p>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-[5px] top-1 bottom-1 w-0.5 bg-stone-200" />
                  {timelineItems.map((item, i) => {
                    const isCompleted = item._type === 'completed'
                    const isOverdue = !isCompleted && new Date(item.due_date) < startOfToday
                    return (
                      <div key={item.id} className={`relative pb-5 ${i === timelineItems.length - 1 ? 'pb-0' : ''}`}>
                        <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                          isCompleted ? 'bg-green-500 border-green-500' :
                          isOverdue ? 'border-red-500 bg-white' : 'border-stone-400 bg-white'
                        }`} />
                        <div className="text-xs text-stone-400 font-mono mb-0.5">{formatShortDate(item.due_date)}</div>
                        <Link to={`/tasks/${item.id}`} className="text-sm font-medium hover:underline">{item.title}</Link>
                        <div className="text-xs text-stone-400">
                          {item.modules ? item.modules.name : ''}{isCompleted && ' · Completed'}{isOverdue && ' · Overdue'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* gantt chart */}
          <div className="bg-white border border-stone-200 rounded-lg">
            <div className="flex justify-between items-center px-5 py-3 border-b border-stone-100">
              <span className="text-sm font-semibold">Gantt Chart</span>
            </div>
            <div className="p-5 overflow-x-auto">
              {ganttTasks.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">No tasks with due dates</p>
              ) : (
                <div>
                  <div className="flex mb-3">
                    <div className="w-28 flex-shrink-0" />
                    <div className="flex-1 flex">
                      {[...Array(Math.min(Math.ceil(ganttRange), 14))].map((_, i) => {
                        if (i % 2 !== 0) return null
                        const d = new Date(ganttStart.getTime() + i * 86400000)
                        return (
                          <div key={i} className="text-xs text-stone-400 text-center"
                            style={{ width: `${(2 / ganttRange) * 100}%` }}>
                            {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </div>
                        )
                      }).filter(Boolean)}
                    </div>
                  </div>
                  {ganttTasks.map((task, idx) => {
                    const taskStart = new Date(task.created_at || startOfToday)
                    const taskEnd = new Date(task.due_date)
                    const left = Math.max(0, (taskStart - ganttStart) / 86400000 / ganttRange * 100)
                    const width = Math.max(5, (taskEnd - taskStart) / 86400000 / ganttRange * 100)
                    return (
                      <div key={task.id} className="flex items-center mb-2">
                        <div className="w-28 flex-shrink-0 text-xs font-medium truncate pr-3">{task.title}</div>
                        <div className="flex-1 h-6 bg-stone-100 rounded relative">
                          <Link to={`/tasks/${task.id}`}
                            className={`absolute h-full rounded ${ganttColours[idx % ganttColours.length]} opacity-80 hover:opacity-100`}
                            style={{ left: `${Math.min(left, 90)}%`, width: `${Math.min(width, 100 - left)}%` }}
                            title={`${task.title} — due ${formatShortDate(task.due_date)}`} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="text-xs text-stone-400 mt-2 text-right">Today: {formatShortDate(now)}</div>
                </div>
              )}
            </div>
          </div>

          {/* eisenhower matrix */}
          <div className="bg-white border border-stone-200 rounded-lg">
            <div className="px-5 py-3 border-b border-stone-100">
              <span className="text-sm font-semibold">Priority Matrix</span>
              <p className="text-xs text-stone-400 mt-0.5">Urgent = due within 3 days · Important = high priority</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-stone-200 m-4 rounded overflow-hidden">
              <div className="bg-red-50 p-3">
                <div className="text-xs font-semibold text-red-700 mb-2">Do First</div>
                {quadrants.doFirst.length === 0 ? <p className="text-xs text-stone-400">None</p> : (
                  <div className="space-y-1">
                    {quadrants.doFirst.slice(0, 4).map(t => (
                      <Link key={t.id} to={`/tasks/${t.id}`} className="block text-xs text-red-800 hover:underline truncate">{t.title}</Link>
                    ))}
                    {quadrants.doFirst.length > 4 && <span className="text-xs text-red-400">+{quadrants.doFirst.length - 4} more</span>}
                  </div>
                )}
              </div>
              <div className="bg-blue-50 p-3">
                <div className="text-xs font-semibold text-blue-700 mb-2">Schedule</div>
                {quadrants.schedule.length === 0 ? <p className="text-xs text-stone-400">None</p> : (
                  <div className="space-y-1">
                    {quadrants.schedule.slice(0, 4).map(t => (
                      <Link key={t.id} to={`/tasks/${t.id}`} className="block text-xs text-blue-800 hover:underline truncate">{t.title}</Link>
                    ))}
                    {quadrants.schedule.length > 4 && <span className="text-xs text-blue-400">+{quadrants.schedule.length - 4} more</span>}
                  </div>
                )}
              </div>
              <div className="bg-amber-50 p-3">
                <div className="text-xs font-semibold text-amber-700 mb-2">Do Next</div>
                {quadrants.doNext.length === 0 ? <p className="text-xs text-stone-400">None</p> : (
                  <div className="space-y-1">
                    {quadrants.doNext.slice(0, 4).map(t => (
                      <Link key={t.id} to={`/tasks/${t.id}`} className="block text-xs text-amber-800 hover:underline truncate">{t.title}</Link>
                    ))}
                    {quadrants.doNext.length > 4 && <span className="text-xs text-amber-400">+{quadrants.doNext.length - 4} more</span>}
                  </div>
                )}
              </div>
              <div className="bg-stone-50 p-3">
                <div className="text-xs font-semibold text-stone-600 mb-2">Low Priority</div>
                {quadrants.later.length === 0 ? <p className="text-xs text-stone-400">None</p> : (
                  <div className="space-y-1">
                    {quadrants.later.slice(0, 4).map(t => (
                      <Link key={t.id} to={`/tasks/${t.id}`} className="block text-xs text-stone-600 hover:underline truncate">{t.title}</Link>
                    ))}
                    {quadrants.later.length > 4 && <span className="text-xs text-stone-400">+{quadrants.later.length - 4} more</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* time tracker placeholder */}
          <div className="bg-white border border-stone-200 rounded-lg">
            <div className="flex justify-between items-center px-5 py-3 border-b border-stone-100">
              <span className="text-sm font-semibold">Time Tracker</span>
              <span className="text-xs text-stone-400">Est. vs Actual</span>
            </div>
            <div className="p-5">
              {tasks.filter(t => t.estimated_duration && t.status === 'completed').length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">Complete tasks with estimated durations to see comparisons</p>
              ) : (
                <div className="space-y-3">
                  {tasks.filter(t => t.estimated_duration && t.status === 'completed').slice(0, 4).map(t => (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate mb-1">{t.title}</div>
                        <div className="flex gap-1 items-center">
                          <div className="h-1.5 bg-stone-300 rounded-full" style={{ width: `${t.estimated_duration * 15}px` }} />
                          <span className="text-xs text-stone-400 font-mono">{t.estimated_duration}h est</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* goals & motivation */}
          <div className="md:col-span-2 bg-white border border-stone-200 rounded-lg">
            <div className="flex justify-between items-center px-5 py-3 border-b border-stone-100">
              <span className="text-sm font-semibold">Goals & Motivation</span>
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-semibold text-amber-600">
                  {completedThisWeek.length > 0 ? `${completedThisWeek.length} this week` : 'Get started!'}
                </span>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-center p-4 bg-stone-50 rounded-lg mb-4">
                  <div className="text-3xl font-bold text-purple-600">{tasks.filter(t => t.status === 'completed').length}</div>
                  <div className="text-xs text-stone-400">Tasks Completed</div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-stone-50 rounded">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium">Complete 5 tasks this week</span>
                      <span className="text-xs text-stone-400 font-mono">{completedThisWeek.length}/5</span>
                    </div>
                    <div className="h-1.5 bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((completedThisWeek.length / 5) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium">No overdue tasks</span>
                      <span className="text-xs text-stone-400 font-mono">{overdueTasks.length === 0 ? '✓' : `${overdueTasks.length} overdue`}</span>
                    </div>
                    <div className="h-1.5 bg-white rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${overdueTasks.length === 0 ? 'bg-green-500' : 'bg-red-400'}`}
                        style={{ width: overdueTasks.length === 0 ? '100%' : `${Math.max(100 - overdueTasks.length * 20, 10)}%` }} />
                    </div>
                  </div>
                  {avgGrade !== null && (
                    <div className="p-3 bg-stone-50 rounded">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium">Maintain 60%+ average</span>
                        <span className="text-xs text-stone-400 font-mono">{avgGrade.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-white rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${Math.min((avgGrade / 60) * 100, 100)}%`, backgroundColor: avgGrade >= 60 ? '#16a34a' : '#d97706' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="p-4 bg-stone-50 rounded-lg">
                  <div className="text-xs font-medium mb-3">Achievements</div>
                  <div className="flex flex-wrap gap-2">
                    {tasks.filter(t => t.status === 'completed').length >= 1 && (
                      <span className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-full">✓ First Task Done</span>
                    )}
                    {tasks.filter(t => t.status === 'completed').length >= 10 && (
                      <span className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-full">✓ 10 Tasks Done</span>
                    )}
                    {completedThisWeek.length >= 5 && (
                      <span className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full">🏆 5 in a Week</span>
                    )}
                    {overdueTasks.length === 0 && tasks.length > 0 && (
                      <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full">⏰ All On Time</span>
                    )}
                    {avgGrade !== null && avgGrade >= 70 && (
                      <span className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full">⭐ First Class</span>
                    )}
                    {scoredTasks.length === 0 && tasks.filter(t => t.status === 'completed').length === 0 && (
                      <span className="text-xs text-stone-400">Complete tasks to earn achievements</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-200">
                  <div className="text-xs text-stone-400 mb-3">How are you feeling about your tasks?</div>
                  <div className="flex gap-2">
                    {[
                      { emoji: '😫', label: 'Overwhelmed' },
                      { emoji: '😐', label: 'Neutral' },
                      { emoji: '🙂', label: 'Good' },
                      { emoji: '😄', label: 'Great' },
                    ].map(f => (
                      <button key={f.label}
                        className="flex-1 py-2 border border-stone-200 rounded text-center hover:border-stone-400 transition-colors">
                        <div className="text-lg">{f.emoji}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{f.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
