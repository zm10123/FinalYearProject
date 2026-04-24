import { supabase } from './supabaseClient'

//  pomodoro sessions 


export async function getPomodoroSessions(limit = 20) {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*, tasks(title)')
    .order('started_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

export async function getTodaySessions() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*, tasks(title)')
    .gte('started_at', today.toISOString())
    .order('started_at', { ascending: false })

  return { data, error }
}

export async function getWeekSessions() {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*, tasks(title)')
    .gte('started_at', weekAgo.toISOString())
    .order('started_at', { ascending: false })

  return { data, error }
}

export async function startPomodoroSession(taskId, durationMinutes) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .insert({
      user_id: user.id,
      task_id: taskId || null,
      planned_duration: durationMinutes || 25,
      is_break: false,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  return { data, error }
}

export async function completePomodoroSession(sessionId) {
  // work out actual_duration from started_at
  const { data: existing } = await supabase
    .from('pomodoro_sessions')
    .select('started_at, planned_duration')
    .eq('id', sessionId)
    .single()

  let actualDuration = existing?.planned_duration || 25
  if (existing?.started_at) {
    const elapsedMs = Date.now() - new Date(existing.started_at).getTime()
    actualDuration = Math.round(elapsedMs / 60000)
  }

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .update({
      ended_at: new Date().toISOString(),
      actual_duration: actualDuration,
    })
    .eq('id', sessionId)
    .select()
    .single()

  return { data, error }
}

export async function cancelPomodoroSession(sessionId) {
  // cancellation = delete row since we have no status column
  const { error } = await supabase
    .from('pomodoro_sessions')
    .delete()
    .eq('id', sessionId)

  return { error }
}

//  time blocks 

export async function getTimeBlocks(date) {
  const { data, error } = await supabase
    .from('time_blocks')
    .select('*, tasks(title)')
    .eq('block_date', date)
    .order('start_time', { ascending: true })

  return { data, error }
}

export async function createTimeBlock(blockData) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('time_blocks')
    .insert({ ...blockData, user_id: user.id })
    .select()
    .single()

  return { data, error }
}

export async function updateTimeBlock(id, updates) {
  const { data, error } = await supabase
    .from('time_blocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deleteTimeBlock(id) {
  const { error } = await supabase
    .from('time_blocks')
    .delete()
    .eq('id', id)

  return { error }
}

//  feelings log 

export async function logFeeling(feeling, note) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('feelings_log')
    .insert({
      user_id: user.id,
      feeling,
      note: note || null,
    })
    .select()
    .single()

  return { data, error }
}

export async function getRecentFeelings(limit = 7) {
  const { data, error } = await supabase
    .from('feelings_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}