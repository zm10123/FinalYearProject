import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTasks } from '../services/taskService'
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '../services/calendarService'
import { getFloatingNotes, createFloatingNote, deleteFloatingNote } from '../services/calendarService'

function Calendar() {
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('month') // month or week
  const [currentDate, setCurrentDate] = useState(new Date())

  // add event form
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState('lecture')
  const [eventDate, setEventDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('09:00')
  const [eventEndTime, setEventEndTime] = useState('10:00')
  const [eventLocation, setEventLocation] = useState('')
  const [addingEvent, setAddingEvent] = useState(false)

  // add note form
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteDate, setNoteDate] = useState('')
  const [noteColour, setNoteColour] = useState('yellow')
  const [addingNote, setAddingNote] = useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    loadCalendarData()
  }, [currentDate])

  async function loadCalendarData() {
    setLoading(true)

    // figure out the date range we need
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    const [tasksRes, eventsRes, notesRes] = await Promise.all([
      getTasks({}),
      getCalendarEvents(start, end),
      getFloatingNotes(),
    ])

    if (tasksRes.data) setTasks(tasksRes.data)
    if (eventsRes.data) setEvents(eventsRes.data)
    if (notesRes.data) setNotes(notesRes.data)
    setLoading(false)
  }

  // --- navigation ---

  function goToPrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function goToPrevWeek() {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }

  function goToNextWeek() {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  // --- add event ---

  async function handleAddEvent(e) {
    e.preventDefault()
    if (!eventTitle.trim() || !eventDate) return
    setAddingEvent(true)
    setError('')

    const startTime = new Date(`${eventDate}T${eventStartTime}:00`)
    const endTime = new Date(`${eventDate}T${eventEndTime}:00`)

    const { error: err } = await createCalendarEvent({
      title: eventTitle.trim(),
      event_type: eventType,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      location: eventLocation.trim() || null,
    })

    if (err) {
      setError(err.message)
    } else {
      setEventTitle('')
      setEventDate('')
      setEventLocation('')
      setShowAddEvent(false)
      await loadCalendarData()
    }
    setAddingEvent(false)
  }

  // --- add floating note ---

  async function handleAddNote(e) {
    e.preventDefault()
    if (!noteContent.trim() || !noteDate) return
    setAddingNote(true)
    setError('')

    const { error: err } = await createFloatingNote({
      content: noteContent.trim(),
      target_date: noteDate,
      colour: noteColour,
    })

    if (err) {
      setError(err.message)
    } else {
      setNoteContent('')
      setNoteDate('')
      setShowAddNote(false)
      await loadCalendarData()
    }
    setAddingNote(false)
  }

  async function handleDeleteNote(noteId) {
    const { error: err } = await deleteFloatingNote(noteId)
    if (!err) {
      setNotes(notes.filter(n => n.id !== noteId))
    }
  }

  async function handleDeleteEvent(eventId) {
    const { error: err } = await deleteCalendarEvent(eventId)
    if (!err) {
      setEvents(events.filter(e => e.id !== eventId))
    }
  }

  // --- calendar data helpers ---

  const now = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // month view grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

  const monthDays = []
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, -startPad + i + 1)
    monthDays.push({ date: d, current: false })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    monthDays.push({ date: new Date(year, month, i), current: true })
  }
  // pad end to complete the grid row
  while (monthDays.length % 7 !== 0) {
    const d = new Date(year, month + 1, monthDays.length - startPad - lastDay.getDate() + 1)
    monthDays.push({ date: d, current: false })
  }

  // week view - get the monday of the current week
  function getWeekStart(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const weekStart = getWeekStart(currentDate)
  const weekDays = [...Array(7)].map((_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

  // get tasks for a specific date
  function getTasksForDate(date) {
    return tasks.filter(t => {
      if (!t.due_date) return false
      const due = new Date(t.due_date)
      return due.toDateString() === date.toDateString()

    })
  }

  // get events for a specific date
  function getEventsForDate(date) {
    return events.filter(e => {
      const start = new Date(e.start_time)
      return start.toDateString() === date.toDateString()
    })
  }

  // get floating notes for a date
  function getNotesForDate(date) {
    return notes.filter(n => {
      if (!n.target_date) return false
      return new Date(n.target_date).toDateString() === date.toDateString()
    })
  }

  // count items on a day for workload colouring
  function getDayLoad(date) {
    const count = getTasksForDate(date).length + getEventsForDate(date).length
    if (count === 0) return ''
    if (count <= 2) return 'bg-green-50'
    if (count <= 4) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  // event type colours
  function getEventColour(type) {
    switch (type) {
      case 'lecture': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'tutorial': return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'work': return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'personal': return 'bg-green-100 text-green-700 border-green-300'
      default: return 'bg-stone-100 text-stone-700 border-stone-300'
    }
  }

  // note colours
  function getNoteColourClass(colour) {
    switch (colour) {
      case 'blue': return 'bg-blue-100'
      case 'pink': return 'bg-pink-100'
      case 'green': return 'bg-green-100'
      default: return 'bg-yellow-100'
    }
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div className="p-8 text-stone-400">Loading calendar...</div>

  return (
    <div>
      {/* header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{monthName}</h1>
          <div className="flex gap-1">
            <button onClick={view === 'month' ? goToPrevMonth : goToPrevWeek}
              className="w-8 h-8 rounded bg-stone-100 hover:bg-stone-200 text-sm">‹</button>
            <button onClick={goToToday}
              className="px-3 h-8 rounded bg-stone-100 hover:bg-stone-200 text-xs font-medium">Today</button>
            <button onClick={view === 'month' ? goToNextMonth : goToNextWeek}
              className="w-8 h-8 rounded bg-stone-100 hover:bg-stone-200 text-sm">›</button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-stone-100 rounded p-0.5">
            <button onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${view === 'month' ? 'bg-white shadow-sm' : ''}`}>
              Month
            </button>
            <button onClick={() => setView('week')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${view === 'week' ? 'bg-white shadow-sm' : ''}`}>
              Week
            </button>
          </div>
          <button onClick={() => setShowAddNote(true)}
            className="px-3 py-1.5 text-sm border border-stone-300 rounded hover:bg-stone-50">
            Add Note
          </button>
          <button onClick={() => setShowAddEvent(true)}
            className="px-3 py-1.5 text-sm bg-stone-900 text-white rounded hover:bg-stone-800">
            + Add Event
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* main calendar area - 3 cols */}
        <div className="lg:col-span-3">

          {/* === MONTH VIEW === */}
          {view === 'month' && (
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              {/* day headers */}
              <div className="grid grid-cols-7 border-b border-stone-200">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-stone-500 bg-stone-50">
                    {d}
                  </div>
                ))}
              </div>

              {/* day cells */}
              <div className="grid grid-cols-7">
                {monthDays.map((day, i) => {
                  const isToday = day.date.toDateString() === now.toDateString()
                  const dayTasks = getTasksForDate(day.date)
                  const dayEvents = getEventsForDate(day.date)
                  const dayNotes = getNotesForDate(day.date)
                  const load = getDayLoad(day.date)

                  return (
                    <div key={i}
                      className={`min-h-[100px] border-b border-r border-stone-100 p-1.5 ${
                        !day.current ? 'bg-stone-50 opacity-50' : load
                      }`}>
                      <div className={`text-xs font-medium mb-1 ${
                        isToday ? 'w-6 h-6 bg-stone-900 text-white rounded-full flex items-center justify-center' : 'text-stone-600 px-1'
                      }`}>
                        {day.date.getDate()}
                      </div>

                      {/* events */}
                      {dayEvents.slice(0, 2).map(evt => (
                        <div key={evt.id}
                          className={`text-xs px-1.5 py-0.5 rounded mb-0.5 truncate border-l-2 ${getEventColour(evt.event_type)}`}>
                          {evt.title}
                        </div>
                      ))}

                      {/* tasks */}
                      {dayTasks.slice(0, 2).map(task => {
                        const isOverdue = new Date(task.due_date) < now && task.status !== 'completed'
                        const isSoft = task.deadline_type === 'soft'
                        return (
                          <Link key={task.id} to={`/tasks/${task.id}`}
                            className={`block text-xs px-1.5 py-0.5 rounded mb-0.5 truncate border-l-2 ${
                              task.status === 'completed' ? 'bg-stone-100 text-stone-400 border-stone-300' :
                              isOverdue ? 'bg-red-50 text-red-700 border-red-400' :
                              isSoft ? 'bg-amber-50 text-amber-600 border-amber-300' :
                              'bg-stone-100 text-stone-700 border-stone-400'
                            }`}>
                            {task.title}
                          </Link>
                        )
                      })}

                      {/* floating notes */}
                      {dayNotes.slice(0, 1).map(note => (
                        <div key={note.id}
                          className={`text-xs px-1.5 py-0.5 rounded mb-0.5 truncate ${getNoteColourClass(note.colour)}`}>
                          📌 {note.content}
                        </div>
                      ))}

                      {/* overflow count */}
                      {(dayTasks.length + dayEvents.length + dayNotes.length) > 3 && (
                        <div className="text-xs text-stone-400 px-1">
                          +{dayTasks.length + dayEvents.length + dayNotes.length - 3} more
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* === WEEK VIEW === */}
          {view === 'week' && (
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              {/* day headers */}
              <div className="grid grid-cols-8 border-b border-stone-200">
                <div className="py-2 text-center text-xs text-stone-400 bg-stone-50" />
                {weekDays.map((d, i) => {
                  const isToday = d.toDateString() === now.toDateString()
                  return (
                    <div key={i} className={`py-2 text-center border-l border-stone-100 ${isToday ? 'bg-blue-50' : 'bg-stone-50'}`}>
                      <div className="text-xs font-medium text-stone-500">
                        {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </div>
                      <div className={`text-sm font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                        {d.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* time grid */}
              {timeSlots.map(time => (
                <div key={time} className="grid grid-cols-8 border-b border-stone-100">
                  <div className="py-2 px-2 text-right text-xs text-stone-400 font-mono border-r border-stone-100">
                    {time}
                  </div>
                  {weekDays.map((day, di) => {
                    const dayEvents = getEventsForDate(day)
                    const hour = parseInt(time.split(':')[0])
                    const slotEvents = dayEvents.filter(e => {
                      const startHour = new Date(e.start_time).getHours()
                      return startHour === hour
                    })

                    // show tasks at 9am slot
                    const dayTasks = hour === 9 ? getTasksForDate(day) : []

                    return (
                      <div key={di} className="min-h-[48px] border-l border-stone-100 p-0.5">
                        {slotEvents.map(evt => (
                          <div key={evt.id}
                            className={`text-xs px-1.5 py-1 rounded mb-0.5 ${getEventColour(evt.event_type)} cursor-pointer`}
                            onClick={() => { if (window.confirm(`Delete "${evt.title}"?`)) handleDeleteEvent(evt.id) }}>
                            <div className="font-medium truncate">{evt.title}</div>
                            <div className="opacity-70">{formatTime(evt.start_time)}</div>
                          </div>
                        ))}
                        {dayTasks.map(task => (
                          <Link key={task.id} to={`/tasks/${task.id}`}
                            className={`block text-xs px-1.5 py-1 rounded mb-0.5 ${
                              task.status === 'completed' ? 'bg-stone-100 text-stone-400' :
                              task.priority === 'high' ? 'bg-red-50 text-red-700' :
                              'bg-stone-100 text-stone-600'
                            }`}>
                            <div className="font-medium truncate">{task.title}</div>
                          </Link>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* sidebar - 1 col */}
        <div className="space-y-4">

          {/* today's agenda */}
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">
              Today · {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </h3>
            {(() => {
              const todayTasks = getTasksForDate(now)
              const todayEvents = getEventsForDate(now)
              if (todayTasks.length === 0 && todayEvents.length === 0) {
                return <p className="text-xs text-stone-400">Nothing scheduled</p>
              }
              return (
                <div className="space-y-2">
                  {todayEvents.map(evt => (
                    <div key={evt.id} className="flex gap-2">
                      <span className="text-xs text-stone-400 font-mono w-12 flex-shrink-0">{formatTime(evt.start_time)}</span>
                      <div>
                        <div className="text-xs font-medium">{evt.title}</div>
                        {evt.location && <div className="text-xs text-stone-400">{evt.location}</div>}
                      </div>
                    </div>
                  ))}
                  {todayTasks.map(task => (
                    <Link key={task.id} to={`/tasks/${task.id}`} className="flex gap-2 hover:bg-stone-50 rounded p-1 -m-1">
                      <span className="text-xs text-red-400 font-mono w-12 flex-shrink-0">Due</span>
                      <div>
                        <div className="text-xs font-medium">{task.title}</div>
                        {task.modules && <div className="text-xs text-stone-400">{task.modules.name}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* upcoming deadlines */}
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Upcoming Deadlines</h3>
            {(() => {
              const upcoming = tasks
                .filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) >= now)
                .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                .slice(0, 5)
              if (upcoming.length === 0) return <p className="text-xs text-stone-400">No upcoming deadlines</p>
              return (
                <div className="space-y-2">
                  {upcoming.map(task => (
                    <Link key={task.id} to={`/tasks/${task.id}`} className="block hover:bg-stone-50 rounded p-1 -m-1">
                      <div className="text-xs font-medium">{task.title}</div>
                      <div className="text-xs text-stone-400">
                        {new Date(task.due_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {task.modules && ` · ${task.modules.name}`}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* floating notes list */}
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">Floating Notes</h3>
              <button onClick={() => setShowAddNote(true)} className="text-xs text-blue-600 hover:text-blue-800">+ Add</button>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-stone-400">No notes yet</p>
            ) : (
              <div className="space-y-2">
                {notes.slice(0, 5).map(note => (
                  <div key={note.id} className={`p-2 rounded text-xs ${getNoteColourClass(note.colour)}`}>
                    <div className="flex justify-between items-start">
                      <span className="line-clamp-2">{note.content}</span>
                      <button onClick={() => handleDeleteNote(note.id)}
                        className="text-stone-400 hover:text-red-500 ml-2 flex-shrink-0">×</button>
                    </div>
                    <div className="text-stone-400 mt-1">
                      {new Date(note.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {note.profiles && ` · ${note.profiles.first_name}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === ADD EVENT MODAL === */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddEvent(false) }}>
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-stone-200">
              <h3 className="text-lg font-semibold">Add Event</h3>
              <button onClick={() => setShowAddEvent(false)} className="text-stone-400 hover:text-stone-600 text-xl">×</button>
            </div>
            <form onSubmit={handleAddEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Database Systems Lecture"
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm">
                    <option value="lecture">Lecture</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input type="time" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input type="time" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location (optional)</label>
                <input type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g. Room 3.01"
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddEvent(false)}
                  className="px-4 py-2 text-sm border border-stone-300 rounded">Cancel</button>
                <button type="submit" disabled={addingEvent}
                  className="px-4 py-2 text-sm bg-stone-900 text-white rounded disabled:opacity-50">
                  {addingEvent ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === ADD NOTE MODAL === */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddNote(false) }}>
          <div className="bg-white rounded-lg w-full max-w-sm mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-stone-200">
              <h3 className="text-lg font-semibold">Add Floating Note</h3>
              <button onClick={() => setShowAddNote(false)} className="text-stone-400 hover:text-stone-600 text-xl">×</button>
            </div>
            <form onSubmit={handleAddNote} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Note</label>
                <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Quick reminder..." rows={3}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Colour</label>
                <div className="flex gap-2">
                  {['yellow', 'blue', 'pink', 'green'].map(c => (
                    <button key={c} type="button" onClick={() => setNoteColour(c)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        noteColour === c ? 'border-stone-900' : 'border-transparent'
                      } ${getNoteColourClass(c)}`} />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddNote(false)}
                  className="px-4 py-2 text-sm border border-stone-300 rounded">Cancel</button>
                <button type="submit" disabled={addingNote}
                  className="px-4 py-2 text-sm bg-stone-900 text-white rounded disabled:opacity-50">
                  {addingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
