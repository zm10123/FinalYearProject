import { supabase } from './supabaseClient'

// calls the edge function to generate a plan
export async function generateStudyPlan() {
  const [tasksRes, eventsRes, sessionsRes] = await Promise.all([
    getTasksForPlanner(),
    getEventsForPlanner(),
    getRecentSessions(),
  ])

  const payload = {
    tasks: tasksRes.data || [],
    events: eventsRes.data || [],
    recentSessions: sessionsRes.data || [],
  }

  console.log('sending to planner:', payload)

  const { data, error } = await supabase.functions.invoke('generate-study-plan', {
    body: payload,
  })

  if (error) return { plan: null, error }
  return { plan: data.plan, error: null }
}

// active tasks with all the useful fields for planning
async function getTasksForPlanner() {
  const { data, error } = await supabase
    .from('tasks')
    .select('title, description, priority, status, due_date, due_date_end, deadline_type, estimated_duration, weighting, score_achieved, score_total, modules(name, code, target_grade)')
    .neq('status', 'completed')
    .neq('status', 'archived')
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  return { data, error }
}

// calendar events for next 2 weeks
async function getEventsForPlanner() {
  const now = new Date()
  const twoWeeks = new Date(now)
  twoWeeks.setDate(twoWeeks.getDate() + 14)

  const { data, error } = await supabase
    .from('calendar_events')
    .select('title, start_time, end_time')
    .gte('start_time', now.toISOString())
    .lte('start_time', twoWeeks.toISOString())
    .order('start_time', { ascending: true })

  // if it errors, just return empty so planner still works
  if (error) {
    console.log('events fetch failed (non-fatal):', error.message)
    return { data: [], error: null }
  }

  return { data, error }
}

// recent pomodoro sessions - using actual column names from the db
async function getRecentSessions() {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('task_id, planned_duration, started_at, ended_at, tasks(title)')
    .gte('started_at', weekAgo.toISOString())
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })

  // if it errors, just return empty
  if (error) {
    console.log('sessions fetch failed (non-fatal):', error.message)
    return { data: [], error: null }
  }

  // reshape to match what the edge function expects
  const reshaped = (data || []).map(s => ({
    task_id: s.task_id,
    duration_minutes: s.planned_duration,
    started_at: s.started_at,
    tasks: s.tasks,
  }))

  return { data: reshaped, error: null }
}

// save the plan - uses upsert so it works whether row exists or not
export async function savePlan(planData) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      last_study_plan: planData,
      last_study_plan_generated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .maybeSingle()

  if (error) console.log('save plan error:', error)
  return { data, error }
}

// load the last saved plan
export async function getLastPlan() {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('user_settings')
    .select('last_study_plan, last_study_plan_generated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data || !data.last_study_plan) {
    return { plan: null, error: null }
  }

  return {
    plan: {
      plan: data.last_study_plan,
      generated_at: data.last_study_plan_generated_at,
    },
    error: null,
  }
}