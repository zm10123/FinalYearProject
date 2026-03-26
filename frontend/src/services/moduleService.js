import { supabase } from './supabaseClient'

// courses 

export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('year', { ascending: true })

  return { data, error }
}

export async function createCourse(name, year, targetGrade) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('courses')
    .insert({
      user_id: user.id,
      name,
      year: year || null,
      target_grade: targetGrade || null
    })
    .select()
    .single()

  return { data, error }
}

export async function updateCourse(id, updates) {
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deleteCourse(id) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id)

  return { error }
}

// modules

export async function getModules(courseId) {
  let query = supabase
    .from('modules')
    .select('*, courses(name, year)')
    .order('name', { ascending: true })

  // if a course is specified, filter by it
  if (courseId) {
    query = query.eq('course_id', courseId)
  }

  const { data, error } = await query
  return { data, error }
}

export async function getAllModules() {
  const { data, error } = await supabase
    .from('modules')
    .select('*, courses(id, name, year)')
    .order('name', { ascending: true })

  return { data, error }
}

export async function createModule(courseId, name, code, targetGrade) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('modules')
    .insert({
      course_id: courseId,
      user_id: user.id,
      name,
      code: code || null,
      target_grade: targetGrade || null
    })
    .select('*, courses(name, year)')
    .single()

  return { data, error }
}

export async function updateModule(id, updates) {
  const { data, error } = await supabase
    .from('modules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deleteModule(id) {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', id)

  return { error }
}