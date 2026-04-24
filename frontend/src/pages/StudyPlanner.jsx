import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { generateStudyPlan, savePlan, getLastPlan } from '../services/studyPlannerService'

function StudyPlanner() {
    const [plan, setPlan] = useState(null)
    const [loading, setLoading] = useState(false)
    const [loadingLast, setLoadingLast] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        loadLastPlan()
    }, [])

    async function loadLastPlan() {
        setLoadingLast(true)
        const { plan: saved } = await getLastPlan()
        if (saved) setPlan(saved)
        setLoadingLast(false)
    }

    async function handleGenerate() {
        setLoading(true)
        setError('')

        const { plan: newPlan, error: err } = await generateStudyPlan()

        if (err) {
            setError(err.message || 'Failed to generate plan')
            setLoading(false)
            return
        }

        const planData = {
            plan: newPlan,
            generated_at: new Date().toISOString(),
        }

        setPlan(planData)
        await savePlan(newPlan)
        setLoading(false)
    }

    // get the actual plan data (handle both saved and fresh formats)
    const planData = plan?.plan || plan
    const generatedAt = plan?.generated_at

    // colours for different block types
    function getBlockColour(type) {
        switch (type) {
            case 'study': return 'bg-blue-50 border-blue-200 text-blue-800'
            case 'break': return 'bg-green-50 border-green-200 text-green-700'
            case 'lecture': return 'bg-purple-50 border-purple-200 text-purple-800'
            case 'tutorial': return 'bg-amber-50 border-amber-200 text-amber-800'
            case 'review': return 'bg-teal-50 border-teal-200 text-teal-800'
            default: return 'bg-stone-50 border-stone-200 text-stone-700'
        }
    }

    if (loadingLast) return <div className="p-8 text-stone-400">Loading...</div>

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold">AI Study Planner</h1>
                    <p className="text-stone-500 text-sm">
                        Generate a personalised weekly schedule based on your tasks and deadlines
                    </p>
                </div>
                {planData && !loading && (
                    <button onClick={handleGenerate} disabled={loading}
                        className="px-4 py-2 text-sm border border-stone-300 rounded hover:bg-stone-50 whitespace-nowrap">
                        Regenerate
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg mb-6">{error}</div>
            )}

            {/* how it works - shown when no plan exists */}
            {!planData && !loading && (
                <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">🧠</div>
                    <h2 className="text-lg font-semibold mb-2">Smart Study Planning</h2>
                    <p className="text-sm text-stone-500 mb-6 max-w-md mx-auto">
                        The AI analyses your tasks, deadlines, priorities, estimated durations, and existing
                        schedule to create an optimised weekly study plan.
                    </p>
                    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                        <div className="p-3 bg-stone-50 rounded-lg">
                            <div className="text-lg mb-1">📋</div>
                            <div className="text-xs font-medium">Your Tasks</div>
                            <div className="text-xs text-stone-400">Deadlines, priorities, weightings</div>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-lg">
                            <div className="text-lg mb-1">📅</div>
                            <div className="text-xs font-medium">Your Schedule</div>
                            <div className="text-xs text-stone-400">Lectures, tutorials, work</div>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-lg">
                            <div className="text-lg mb-1">⏱️</div>
                            <div className="text-xs font-medium">Study Patterns</div>
                            <div className="text-xs text-stone-400">Recent session data</div>
                        </div>
                    </div>
                    <button onClick={handleGenerate} disabled={loading}
                        className="px-6 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 disabled:opacity-50">
                        {loading ? 'Generating...' : 'Generate My Schedule'}
                    </button>
                </div>
            )}

            {/* loading state */}
            {loading && (
                <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
                    <div className="text-3xl mb-4 animate-pulse">🧠</div>
                    <p className="text-sm text-stone-500 mb-2">Analysing your tasks and schedule...</p>
                    <p className="text-xs text-stone-400">This usually takes 5-10 seconds</p>
                </div>
            )}

            {/* generated plan */}
            {planData && !loading && (
                <div>
                    {/* meta info */}
                    {generatedAt && (
                        <p className="text-xs text-stone-400 mb-4">
                            Generated {new Date(generatedAt).toLocaleString('en-GB', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                        </p>
                    )}

                    {/* summary */}
                    {planData.summary && (
                        <div className="bg-white border border-stone-200 rounded-lg p-5 mb-4">
                            <h3 className="text-sm font-semibold mb-2">Weekly Overview</h3>
                            <p className="text-sm text-stone-600">{planData.summary}</p>
                        </div>
                    )}

                    {/* risks */}
                    {planData.risks && planData.risks.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-4">
                            <h3 className="text-sm font-semibold text-amber-800 mb-2">⚠ Heads Up</h3>
                            <ul className="space-y-1">
                                {planData.risks.map((risk, i) => (
                                    <li key={i} className="text-sm text-amber-700">• {risk}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* day-by-day schedule */}
                    {planData.days && planData.days.length > 0 && (
                        <div className="space-y-4">
                            {planData.days.map((day, dayIdx) => (
                                <div key={dayIdx} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                                    <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
                                        <div>
                                            <span className="text-sm font-semibold">{day.dayName}</span>
                                            <span className="text-xs text-stone-400 ml-2">
                                                {new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        <span className="text-xs text-stone-400">
                                            {day.blocks?.filter(b => b.type === 'study').length || 0} study sessions
                                        </span>
                                    </div>

                                    <div className="p-4">
                                        {!day.blocks || day.blocks.length === 0 ? (
                                            <p className="text-xs text-stone-400 py-2">Rest day — no sessions planned</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {day.blocks.map((block, blockIdx) => (
                                                    <div key={blockIdx}
                                                        className={`flex items-start gap-3 p-3 rounded-lg border ${getBlockColour(block.type)}`}>
                                                        <div className="text-xs font-mono w-24 flex-shrink-0 pt-0.5">
                                                            {block.startTime} – {block.endTime}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium">{block.title}</div>
                                                            {block.taskTitle && block.type === 'study' && (
                                                                <div className="text-xs opacity-70 mt-0.5">Task: {block.taskTitle}</div>
                                                            )}
                                                            {block.notes && (
                                                                <div className="text-xs opacity-70 mt-0.5">{block.notes}</div>
                                                            )}
                                                        </div>
                                                        {block.type === 'study' && (
                                                            <span className="text-xs opacity-50">
                                                                {calculateDuration(block.startTime, block.endTime)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* fallback for raw text response */}
                    {planData.rawText && !planData.days && (
                        <div className="bg-white border border-stone-200 rounded-lg p-5">
                            <h3 className="text-sm font-semibold mb-3">Your Study Plan</h3>
                            <pre className="text-sm text-stone-600 whitespace-pre-wrap font-sans leading-relaxed">
                                {planData.rawText}
                            </pre>
                        </div>
                    )}


                </div>
            )}
        </div>
    )
}

// helper to show duration like "1h 30m"
function calculateDuration(start, end) {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default StudyPlanner
