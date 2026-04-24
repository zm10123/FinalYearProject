import { supabase } from './supabaseClient'

export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return { data, error }
}

export async function getUnreadCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  return { count, error }
}

export async function markAsRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)

  return { error }
}

export async function markAllAsRead() {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return { error }
}

export async function deleteNotification(id) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)

  return { error }
}

// create a notification 
export async function createNotification(type, title, message, referenceId, referenceType) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type,
      title,
      message,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
    })
    .select()
    .single()

  return { data, error }
}

// check for upcoming deadlines and create reminders
export async function checkDeadlineReminders() {
  const { data: { user } } = await supabase.auth.getUser()

  // get tasks due in next 24 hours that dont have a reminder yet
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: upcomingTasks } = await supabase
    .from('tasks')
    .select('id, title, due_date')
    .eq('user_id', user.id)
    .neq('status', 'completed')
    .neq('status', 'archived')
    .is('deleted_at', null)
    .lte('due_date', tomorrow.toISOString())
    .gte('due_date', new Date().toISOString())

  if (!upcomingTasks || upcomingTasks.length === 0) return

  // check which ones already have reminders
  for (const task of upcomingTasks) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('reference_id', task.id)
      .eq('type', 'deadline_reminder')
      .single()

    if (!existing) {
      await createNotification(
        'deadline_reminder',
        'Deadline approaching',
        `"${task.title}" is due soon`,
        task.id,
        'task'
      )
    }
  }
}