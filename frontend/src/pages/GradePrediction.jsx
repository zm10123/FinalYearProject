import { useState, useEffect } from 'react'
import { predictModuleGrade } from '../services/predictionService'
import { getAllModules } from '../services/moduleService'

function GradePrediction() {
    const [modules, setModules] = useState([])
    const [predictions, setPredictions] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadPredictions()
    }, [])

    async function loadPredictions() {
        setLoading(true)
        const { data } = await getAllModules()
        if (data) {
            setModules(data)
            const preds = {}
            for (const mod of data) {
                preds[mod.id] = await predictModuleGrade(mod.id)
            }
            setPredictions(preds)
        }
        setLoading(false)
    }

    function gradeColour(grade) {
        if (grade >= 70) return '#16a34a'
        if (grade >= 60) return '#2563eb'
        if (grade >= 50) return '#d97706'
        if (grade >= 40) return '#ea580c'
        return '#dc2626'
    }

    if (loading) return <div className="p-8 text-stone-400">Calculating predictions...</div>

    if (modules.length === 0) {
        return (
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-1">Grade Predictions</h1>
                <p className="text-stone-500 text-sm mb-6">Monte Carlo simulation based on your historical performance</p>
                <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
                    <p className="text-sm text-stone-500">
                        Add modules and score some tasks first to see predictions.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-1">Grade Predictions</h1>
            <p className="text-stone-500 text-sm mb-6">
                Monte Carlo simulation based on your historical performance
            </p>

            <div className="space-y-6">
                {modules.map(mod => {
                    const pred = predictions[mod.id]
                    if (!pred) return null

                    if (pred.error) {
                        return (
                            <div key={mod.id} className="bg-white border border-stone-200 rounded-lg p-6">
                                <h2 className="text-lg font-semibold mb-2">{mod.name}</h2>
                                <p className="text-xs text-stone-400">{pred.error}</p>
                            </div>
                        )
                    }

                    if (pred.empty) {
                        return (
                            <div key={mod.id} className="bg-white border border-stone-200 rounded-lg p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-lg font-semibold">{mod.name}</h2>
                                        <p className="text-xs text-stone-500">No tasks yet</p>
                                    </div>
                                    {mod.target_grade && (
                                        <div className="text-right">
                                            <div className="text-xs text-stone-400">Target</div>
                                            <div className="text-sm font-medium">{mod.target_grade}%</div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-stone-400 mt-3">
                                    Add tasks to this module to see predictions.
                                </p>
                            </div>
                        )
                    }

                    return (
                        <div key={mod.id} className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold">{mod.name}</h2>
                                    <p className="text-xs text-stone-500">
                                        {pred.completed} completed · {pred.remaining} remaining
                                    </p>
                                </div>
                                {mod.target_grade && (
                                    <div className="text-right">
                                        <div className="text-xs text-stone-400">Target</div>
                                        <div className="text-sm font-medium">{mod.target_grade}%</div>
                                    </div>
                                )}
                            </div>

                            {pred.complete ? (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold" style={{ color: gradeColour(pred.mean) }}>
                                        {pred.mean.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-stone-400">Final grade (all tasks completed)</div>
                                </div>
                            ) : (
                                <div>
                                    {/* predicted range */}
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="text-center p-3 bg-stone-50 rounded">
                                            <div className="text-xs text-stone-400">Pessimistic (P10)</div>
                                            <div className="text-xl font-bold" style={{ color: gradeColour(pred.p10) }}>
                                                {pred.p10.toFixed(0)}%
                                            </div>
                                        </div>
                                        <div className="text-center p-3 bg-stone-900 text-white rounded">
                                            <div className="text-xs opacity-70">Most Likely</div>
                                            <div className="text-xl font-bold">{pred.median.toFixed(0)}%</div>
                                        </div>
                                        <div className="text-center p-3 bg-stone-50 rounded">
                                            <div className="text-xs text-stone-400">Optimistic (P90)</div>
                                            <div className="text-xl font-bold" style={{ color: gradeColour(pred.p90) }}>
                                                {pred.p90.toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* classification bars */}
                                    <div className="mb-4">
                                        <div className="text-xs font-semibold mb-2">Classification Probability</div>
                                        <div className="space-y-1">
                                            {[
                                                { label: 'First (70+)', prob: pred.probabilities.first, colour: '#16a34a' },
                                                { label: '2:1 (60-69)', prob: pred.probabilities.upperSecond, colour: '#2563eb' },
                                                { label: '2:2 (50-59)', prob: pred.probabilities.lowerSecond, colour: '#d97706' },
                                                { label: 'Third (40-49)', prob: pred.probabilities.third, colour: '#ea580c' },
                                                { label: 'Fail (<40)', prob: pred.probabilities.fail, colour: '#dc2626' },
                                            ].filter(x => x.prob > 0.01).map(x => (
                                                <div key={x.label} className="flex items-center gap-3">
                                                    <div className="text-xs w-24">{x.label}</div>
                                                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full"
                                                            style={{ width: `${x.prob * 100}%`, backgroundColor: x.colour }} />
                                                    </div>
                                                    <div className="text-xs font-mono w-12 text-right">
                                                        {(x.prob * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* highest impact remaining tasks */}
                                    {pred.impactAnalysis.length > 0 && (
                                        <div>
                                            <div className="text-xs font-semibold mb-2">Highest Impact Tasks</div>
                                            <div className="space-y-1">
                                                {pred.impactAnalysis.slice(0, 3).map(t => (
                                                    <div key={t.task_id} className="flex justify-between text-xs py-1">
                                                        <span>{t.title}</span>
                                                        <span className="text-stone-500">{t.weighting}% weighting</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-xs text-stone-400 mt-4 pt-4 border-t">
                                        Based on {pred.historicalSampleSize} historical task results · 1000 simulations
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default GradePrediction