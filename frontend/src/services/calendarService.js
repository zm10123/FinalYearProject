import { supabase } from './supabaseClient'

//  calendar events (lectures, tutorials, work, etc) 

export async function getCalendarEvents(startDate, endDate) {

    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .lte('start_time', endDate)
        .order('start_time', { ascending: true })

    if (error) return { data: null, error }

    // filter non-recurring events that ended before the visible start
    const filtered = (data || []).filter(e => {
        const recurrence = e.recurrence || 'none'
        if (recurrence === 'none') {
            // keep if start_time is within visible range
            return e.start_time >= startDate
        }
        // recurring - keep if the window overlaps the visible range
        // window ends at recurrence_end_date (or infinity if null)
        if (!e.recurrence_end_date) return true
        return e.recurrence_end_date >= startDate.split('T')[0]
    })

    return { data: filtered, error: null }
}

export async function createCalendarEvent(eventData) {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
        .from('calendar_events')
        .insert({ ...eventData, user_id: user.id })
        .select()
        .single()

    return { data, error }
}

export async function updateCalendarEvent(id, updates) {
    const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    return { data, error }
}

export async function deleteCalendarEvent(id) {
    const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)

    return { error }
}

//  floating notes 

export async function getFloatingNotes(groupId) {
    let query = supabase
        .from('floating_notes')
        .select('*, profiles:created_by(first_name, last_name)')
        .order('target_date', { ascending: true })

    if (groupId) {
        query = query.eq('group_id', groupId)
    }

    const { data, error } = await query
    return { data, error }
}

export async function createFloatingNote(noteData) {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
        .from('floating_notes')
        .insert({ ...noteData, created_by: user.id })
        .select('*, profiles:created_by(first_name, last_name)')
        .single()

    return { data, error }
}

export async function updateFloatingNote(id, updates) {
    const { data, error } = await supabase
        .from('floating_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    return { data, error }
}

export async function deleteFloatingNote(id) {
    const { error } = await supabase
        .from('floating_notes')
        .delete()
        .eq('id', id)

    return { error }
}