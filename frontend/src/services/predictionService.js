import { supabase } from './supabaseClient'

// monte carlo grade prediction
// runs 1000 simulations per module to predict final grade

const ITERATIONS = 1000

// get all the user's completed scored tasks grouped by task type
// this gives us the distribution to sample from when predicting
async function getHistoricalStats() {
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('task_type, score_achieved, score_total')
        .not('score_achieved', 'is', null)
        .not('score_total', 'is', null)


    if (error || !tasks || tasks.length === 0) return null

    // group percentages by task type
    const byType = {}
    tasks.forEach(t => {
        const pct = (t.score_achieved / t.score_total) * 100
        if (!byType[t.task_type]) byType[t.task_type] = []
        byType[t.task_type].push(pct)
    })

    // calc mean and stddev for each type
    const stats = {}
    for (const type in byType) {
        const scores = byType[type]
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length
        const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length
        stats[type] = {
            mean,
            stdDev: Math.sqrt(variance),
            sampleSize: scores.length,
        }
    }

    // overall stats as fallback when a task type has too few samples
    const allScores = tasks.map(t => (t.score_achieved / t.score_total) * 100)
    const overallMean = allScores.reduce((a, b) => a + b, 0) / allScores.length
    const overallVariance = allScores.reduce((a, b) => a + (b - overallMean) ** 2, 0) / allScores.length

    stats._overall = {
        mean: overallMean,
        stdDev: Math.sqrt(overallVariance),
        sampleSize: allScores.length,
    }

    return stats
}

// generate a random sample from a gaussian distribution
// using box-muller transform
function gaussianSample(mean, stdDev) {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    const sample = mean + stdDev * z
    // clamp to 0-100 so we cant sample invalid percentages
    return Math.max(0, Math.min(100, sample))
}

// the main prediction function
export async function predictModuleGrade(moduleId) {
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, task_type, score_achieved, score_total, weighting, status')
        .eq('module_id', moduleId)

    if (!tasks || tasks.length === 0) {
        return { empty: true, completed: 0, remaining: 0 }
    }

    const completed = tasks.filter(t => t.score_achieved !== null && t.score_total !== null)
    const remaining = tasks.filter(t => t.score_achieved === null || t.score_total === null)

    // if everything is done, return the actual grade
    if (remaining.length === 0) {
        const grade = calculateGrade(completed)
        return {
            mean: grade,
            median: grade,
            p10: grade,
            p90: grade,
            complete: true,
            probabilities: classifyGradeProbs(grade),
            completed: completed.length,
            remaining: 0,
            impactAnalysis: [],
            historicalSampleSize: 0,
        }
    }

    const stats = await getHistoricalStats()

    if (!stats) {
        return { error: 'Not enough historical data to make predictions' }
    }

    // run 1000 monte carlo simulations
    const simulatedGrades = []

    for (let i = 0; i < ITERATIONS; i++) {
        const sampledRemaining = remaining.map(task => {
            // use task type stats if enough data, else fall back to overall
            const typeStat = stats[task.task_type]
            const useStat = (typeStat && typeStat.sampleSize >= 3) ? typeStat : stats._overall
            const sampled = gaussianSample(useStat.mean, useStat.stdDev)
            return { ...task, simulated_pct: sampled }
        })

        const allTasks = [
            ...completed.map(t => ({ ...t, pct: (t.score_achieved / t.score_total) * 100 })),
            ...sampledRemaining.map(t => ({ ...t, pct: t.simulated_pct })),
        ]

        simulatedGrades.push(weightedAverage(allTasks))
    }

    simulatedGrades.sort((a, b) => a - b)

    const mean = simulatedGrades.reduce((a, b) => a + b, 0) / ITERATIONS
    const p10 = simulatedGrades[Math.floor(ITERATIONS * 0.1)]
    const p50 = simulatedGrades[Math.floor(ITERATIONS * 0.5)]
    const p90 = simulatedGrades[Math.floor(ITERATIONS * 0.9)]

    // classification probabilities
    const probFirst = simulatedGrades.filter(g => g >= 70).length / ITERATIONS
    const prob21 = simulatedGrades.filter(g => g >= 60 && g < 70).length / ITERATIONS
    const prob22 = simulatedGrades.filter(g => g >= 50 && g < 60).length / ITERATIONS
    const probThird = simulatedGrades.filter(g => g >= 40 && g < 50).length / ITERATIONS
    const probFail = simulatedGrades.filter(g => g < 40).length / ITERATIONS

    // impact = weighting, shows user which remaining task affects grade most
    const impactAnalysis = remaining.map(task => ({
        task_id: task.id,
        title: task.title,
        weighting: task.weighting || 0,
        impact_score: task.weighting || 0,
    })).sort((a, b) => b.impact_score - a.impact_score)

    return {
        mean,
        median: p50,
        p10,
        p90,
        complete: false,
        probabilities: {
            first: probFirst,
            upperSecond: prob21,
            lowerSecond: prob22,
            third: probThird,
            fail: probFail,
        },
        impactAnalysis,
        historicalSampleSize: stats._overall.sampleSize,
        remaining: remaining.length,
        completed: completed.length,
    }
}

// calc what score user needs on remaining tasks to hit a target
export async function scoreNeededForTarget(moduleId, targetGrade) {
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('module_id', moduleId)
        .is('deleted_at', null)

    if (!tasks) return null

    const completed = tasks.filter(t => t.score_achieved !== null)
    const remaining = tasks.filter(t => t.score_achieved === null)

    if (remaining.length === 0) return null

    let completedContribution = 0
    let completedWeight = 0
    completed.forEach(t => {
        const pct = (t.score_achieved / t.score_total) * 100
        const w = t.weighting || 0
        completedContribution += pct * w
        completedWeight += w
    })

    let remainingWeight = 0
    remaining.forEach(t => { remainingWeight += (t.weighting || 0) })

    const totalWeight = completedWeight + remainingWeight
    const requiredAvg = (targetGrade * totalWeight - completedContribution) / remainingWeight

    return {
        requiredAverage: requiredAvg,
        achievable: requiredAvg <= 100,
        impossible: requiredAvg > 100,
        alreadyHit: requiredAvg <= 0,
    }
}

// helper: weighted average of task percentages
function weightedAverage(tasks) {
    const hasWeights = tasks.some(t => t.weighting)
    if (!hasWeights) {
        return tasks.reduce((sum, t) => sum + t.pct, 0) / tasks.length
    }
    let weightedSum = 0
    let totalWeight = 0
    tasks.forEach(t => {
        const w = t.weighting || 0
        weightedSum += t.pct * w
        totalWeight += w
    })
    return totalWeight > 0 ? weightedSum / totalWeight : 0
}

function calculateGrade(tasks) {
    return weightedAverage(tasks.map(t => ({
        ...t,
        pct: (t.score_achieved / t.score_total) * 100,
    })))
}

function classifyGradeProbs(grade) {
    return {
        first: grade >= 70 ? 1 : 0,
        upperSecond: grade >= 60 && grade < 70 ? 1 : 0,
        lowerSecond: grade >= 50 && grade < 60 ? 1 : 0,
        third: grade >= 40 && grade < 50 ? 1 : 0,
        fail: grade < 40 ? 1 : 0,
    }
}