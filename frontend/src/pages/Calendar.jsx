import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Calendar() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchTasks()
  }, [user])

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'archived')

    if (!error) {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  
  let startPadding = firstDay.getDay() - 1
  if (startPadding < 0) startPadding = 6
  
  const daysInMonth = lastDay.getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getTasksForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr))
  }

  const isToday = (day) => {
    const today = new Date()
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="calendar-header">
        <h1 className="page-title">Calendar</h1>
        <div className="calendar-nav">
          <button onClick={prevMonth}>←</button>
          <span style={{ fontWeight: '500', minWidth: '150px', textAlign: 'center' }}>
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth}>→</button>
        </div>
      </div>

      <div className="calendar-grid">
        {}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}

        {}
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="calendar-day other-month" />
        ))}

        {}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayTasks = getTasksForDate(day)
          
          return (
            <div
              key={day}
              className={`calendar-day ${isToday(day) ? 'today' : ''}`}
            >
              <div className="calendar-day-number">{day}</div>
              {dayTasks.slice(0, 3).map(task => (
                <div
                  key={task.id}
                  className={`calendar-task priority-${task.priority}`}
                >
                  {task.title}
                </div>
              ))}
              {dayTasks.length > 3 && (
                <div style={{ fontSize: '11px', color: '#999' }}>
                  +{dayTasks.length - 3} more
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}