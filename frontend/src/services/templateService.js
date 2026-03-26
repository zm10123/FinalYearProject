import { supabase } from './supabaseClient'

export async function getTemplates() {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*, modules(id, name, code)')
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function getTemplateById(id) {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*, modules(id, name, code, course_id)')
    .eq('id', id)
    .single()

  return { data, error }
}

export async function saveTaskAsTemplate(templateData) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('task_templates')
    .insert({ ...templateData, created_by: user.id })
    .select()
    .single()

  return { data, error }
}

export async function deleteTemplate(id) {
  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', id)

  return { error }
}