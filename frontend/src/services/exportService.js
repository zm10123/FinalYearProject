import { supabase } from './supabaseClient'

// export tasks as CSV
export async function exportTasksCSV() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, modules(name, code)')
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  if (error || !tasks) return { error: error || { message: 'No data' } }

  // build CSV rows
  const headers = ['Title', 'Description', 'Module', 'Module Code', 'Type', 'Priority', 'Status', 'Due Date', 'Deadline Type', 'Duration (h)', 'Weighting (%)', 'Score', 'Score Total', 'Tags', 'Created']

  const rows = tasks.map(t => [
    escapeCsv(t.title),
    escapeCsv(t.description || ''),
    escapeCsv(t.modules?.name || ''),
    escapeCsv(t.modules?.code || ''),
    escapeCsv(t.task_type || ''),
    escapeCsv(t.priority || ''),
    escapeCsv(t.status || ''),
    t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB') : '',
    escapeCsv(t.deadline_type || ''),
    t.estimated_duration || '',
    t.weighting || '',
    t.score_achieved !== null ? t.score_achieved : '',
    t.score_total !== null ? t.score_total : '',
    escapeCsv((t.tags || []).join(', ')),
    new Date(t.created_at).toLocaleDateString('en-GB'),
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  downloadFile(csv, 'tasks_export.csv', 'text/csv')

  return { error: null }
}

// export grades summary as CSV
export async function exportGradesCSV() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, modules(name, code, courses(name))')
    .not('score_achieved', 'is', null)
    .not('score_total', 'is', null)
    .order('module_id', { ascending: true })

  if (error || !tasks) return { error: error || { message: 'No data' } }

  const headers = ['Course', 'Module', 'Module Code', 'Task', 'Score', 'Total', 'Percentage', 'Weighting (%)']

  const rows = tasks.map(t => [
    escapeCsv(t.modules?.courses?.name || ''),
    escapeCsv(t.modules?.name || ''),
    escapeCsv(t.modules?.code || ''),
    escapeCsv(t.title),
    t.score_achieved,
    t.score_total,
    ((t.score_achieved / t.score_total) * 100).toFixed(1),
    t.weighting || '',
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  downloadFile(csv, 'grades_export.csv', 'text/csv')

  return { error: null }
}

// export schedule/calendar as CSV
export async function exportScheduleCSV() {
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('start_time', { ascending: true })

  if (error || !events) return { error: error || { message: 'No data' } }

  const headers = ['Title', 'Type', 'Date', 'Start Time', 'End Time', 'Location']

  const rows = events.map(e => [
    escapeCsv(e.title),
    escapeCsv(e.event_type || ''),
    new Date(e.start_time).toLocaleDateString('en-GB'),
    new Date(e.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    e.end_time ? new Date(e.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
    escapeCsv(e.location || ''),
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  downloadFile(csv, 'schedule_export.csv', 'text/csv')

  return { error: null }
}

// helper: escape CSV values
function escapeCsv(value) {
  if (!value) return ''
  const str = String(value)
  // wrap in quotes if it contains commas, quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

// helper: trigger a download in the browser
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}