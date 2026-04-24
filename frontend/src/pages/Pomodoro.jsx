import { useState, useEffect, useRef } from 'react'
import { getTasks } from '../services/taskService'
import {
    startPomodoroSession, completePomodoroSession, cancelPomodoroSession,
    getTodaySessions, getWeekSessions
} from '../services/pomodoroService'

function Pomodoro() {
    // timer state, track end time and compute remaining
    const [endTime, setEndTime] = useState(null) // ms timestamp when session ends
    const [pausedRemaining, setPausedRemaining] = useState(null) // ms left when paused
    const [displayMinutes, setDisplayMinutes] = useState(25)
    const [displaySeconds, setDisplaySeconds] = useState(0)

    const [isRunning, setIsRunning] = useState(false)
    const [sessionId, setSessionId] = useState(null)
    const [sessionType, setSessionType] = useState('focus')
    const [duration, setDuration] = useState(25)

    // task
    const [tasks, setTasks] = useState([])
    const [selectedTask, setSelectedTask] = useState('')

    // stats
    const [todaySessions, setTodaySessions] = useState([])
    const [weekSessions, setWeekSessions] = useState([])

    const intervalRef = useRef(null)

    useEffect(() => {
        loadTasks()
        loadStats()
    }, [])

    // timer loop, uses endTime timestamp so it cant drift or skip
    useEffect(() => {
        if (!isRunning || !endTime) return

        function tick() {
            const now = Date.now()
            const remainingMs = endTime - now

            if (remainingMs <= 0) {
                setDisplayMinutes(0)
                setDisplaySeconds(0)
                handleTimerComplete()
                return
            }

            setDisplayMinutes(Math.floor(remainingMs / 60000))
            setDisplaySeconds(Math.floor((remainingMs % 60000) / 1000))
        }

        tick() // update straight away
        intervalRef.current = setInterval(tick, 500)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [isRunning, endTime])

    async function loadTasks() {
        const { data } = await getTasks({})
        if (data) setTasks(data.filter(t => t.status !== 'completed'))
    }

    async function loadStats() {
        const [todayRes, weekRes] = await Promise.all([
            getTodaySessions(),
            getWeekSessions()
        ])
        if (todayRes.data) setTodaySessions(todayRes.data.filter(s => s.ended_at !== null))
        if (weekRes.data) setWeekSessions(weekRes.data.filter(s => s.ended_at !== null))
    }

    async function handleStart() {
        const { data } = await startPomodoroSession(
            selectedTask || null,
            duration
        )
        if (data) setSessionId(data.id)

        // set end time as now + duration
        setEndTime(Date.now() + duration * 60 * 1000)
        setIsRunning(true)
    }

    function handlePause() {
        setIsRunning(false)
        // save remaining time
        if (endTime) {
            setPausedRemaining(endTime - Date.now())
        }
    }

    function handleResume() {
        if (pausedRemaining !== null) {
            setEndTime(Date.now() + pausedRemaining)
            setPausedRemaining(null)
        }
        setIsRunning(true)
    }

    async function handleTimerComplete() {
        setIsRunning(false)

        if (sessionId) {
            await completePomodoroSession(sessionId)
            setSessionId(null)
        }

        await loadStats()

        // switch between focus and break
        if (sessionType === 'focus') {
            setSessionType('break')
            setDisplayMinutes(5)
            setDisplaySeconds(0)
            setEndTime(null)
        } else {
            setSessionType('focus')
            setDisplayMinutes(duration)
            setDisplaySeconds(0)
            setEndTime(null)
        }
    }

    // end the session early but still log it as complete
    async function handleComplete() {
        const confirmed = window.confirm(
            'End this session early?'
        )
        if (!confirmed) return

        setIsRunning(false)
        if (intervalRef.current) clearInterval(intervalRef.current)

        if (sessionId) {
            await completePomodoroSession(sessionId)
            setSessionId(null)
        }

        await loadStats()

        setSessionType('focus')
        setDisplayMinutes(duration)
        setDisplaySeconds(0)
        setEndTime(null)
        setPausedRemaining(null)
    }

    async function handleReset() {
        setIsRunning(false)
        if (intervalRef.current) clearInterval(intervalRef.current)

        if (sessionId) {
            await cancelPomodoroSession(sessionId)
            setSessionId(null)
        }

        setSessionType('focus')
        setDisplayMinutes(duration)
        setDisplaySeconds(0)
        setEndTime(null)
        setPausedRemaining(null)
    }

    function handleDurationChange(newDuration) {
        if (isRunning || sessionId) return
        setDuration(newDuration)
        setDisplayMinutes(newDuration)
        setDisplaySeconds(0)
    }

    const todayTotal = todaySessions.reduce((sum, s) => sum + (s.actual_duration || s.planned_duration || 25), 0)
    const weekTotal = weekSessions.reduce((sum, s) => sum + (s.actual_duration || s.planned_duration || 25), 0)

    function formatMinutes(mins) {
        const h = Math.floor(mins / 60)
        const m = mins % 60
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-1">Pomodoro Timer</h1>
            <p className="text-stone-500 text-sm mb-8">Stay focused with timed work sessions</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* timer */}
                <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
                    <div className="text-xs uppercase tracking-wide text-stone-400 mb-4">
                        {sessionType === 'focus' ? 'Focus Session' : 'Break Time'}
                    </div>

                    <div className="text-6xl font-bold font-mono mb-6">
                        {String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
                    </div>

                    {/* duration presets */}
                    {!isRunning && !sessionId && (
                        <div className="flex justify-center gap-2 mb-6">
                            {[15, 25, 45, 60].map(d => (
                                <button key={d} onClick={() => handleDurationChange(d)}
                                    className={`px-3 py-1.5 rounded text-xs font-medium ${duration === d ? 'bg-stone-900 text-white' : 'bg-stone-100 hover:bg-stone-200'}`}>
                                    {d}min
                                </button>
                            ))}
                        </div>
                    )}

                    {/* task selector */}
                    {!isRunning && !sessionId && (
                        <div className="mb-6">
                            <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}
                                className="w-full px-3 py-2 border border-stone-300 rounded text-sm">
                                <option value="">No specific task</option>
                                {tasks.map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* controls */}
                    <div className="flex justify-center gap-3 flex-wrap">
                        {!isRunning && !sessionId && (
                            <button onClick={handleStart}
                                className="px-6 py-2.5 bg-stone-900 text-white rounded font-medium hover:bg-stone-800">
                                Start
                            </button>
                        )}
                        {isRunning && (
                            <button onClick={handlePause}
                                className="px-6 py-2.5 bg-stone-100 rounded font-medium hover:bg-stone-200">
                                Pause
                            </button>
                        )}
                        {!isRunning && sessionId && (
                            <button onClick={handleResume}
                                className="px-6 py-2.5 bg-stone-900 text-white rounded font-medium hover:bg-stone-800">
                                Resume
                            </button>
                        )}
                        {sessionId && (
                            <button onClick={handleReset}
                                className="px-6 py-2.5 bg-stone-100 rounded font-medium hover:bg-stone-200">
                                Reset
                            </button>
                        )}
                    </div>

                    {/* complete */}
                    {sessionId && (
                        <div className="flex justify-center mt-4 pt-4 border-t border-stone-200">
                            <button onClick={handleComplete}
                                className="px-4 py-1.5 text-sm text-green-700 border border-green-300 rounded hover:bg-green-50">
                                End Session Early
                            </button>
                        </div>
                    )}
                </div>

                {/* stats */}
                <div className="space-y-4">
                    <div className="bg-white border border-stone-200 rounded-lg p-5">
                        <h3 className="text-sm font-semibold mb-4">Today's Sessions</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold font-mono">{todaySessions.length}</div>
                                <div className="text-xs text-stone-400">Sessions</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold font-mono">{formatMinutes(todayTotal)}</div>
                                <div className="text-xs text-stone-400">Focus Time</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold font-mono">{weekSessions.length}</div>
                                <div className="text-xs text-stone-400">This Week</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-stone-200 rounded-lg p-5">
                        <h3 className="text-sm font-semibold mb-3">Recent Sessions</h3>
                        {todaySessions.length === 0 ? (
                            <p className="text-xs text-stone-400">No sessions today. Start your first one!</p>
                        ) : (
                            <div className="space-y-2">
                                {todaySessions.slice(0, 5).map(s => (
                                    <div key={s.id} className="flex justify-between items-center text-xs py-1.5 border-b border-stone-100 last:border-b-0">
                                        <div>
                                            <span className="font-medium">{s.tasks?.title || 'General focus'}</span>
                                            <span className="text-stone-400 ml-2">{s.actual_duration || s.planned_duration}min</span>
                                        </div>
                                        <span className="text-stone-400">
                                            {new Date(s.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-stone-200 rounded-lg p-5">
                        <h3 className="text-sm font-semibold mb-3">Weekly Summary</h3>
                        <div className="text-center py-2">
                            <div className="text-3xl font-bold font-mono text-purple-600">{formatMinutes(weekTotal)}</div>
                            <div className="text-xs text-stone-400 mt-1">Total focus time this week</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Pomodoro
