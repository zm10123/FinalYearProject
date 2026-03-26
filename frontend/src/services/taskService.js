import { supabase } from './supabaseClient'

export async function getTasks(filters = {}) {
  let query = supabase
    .from('tasks')
    .select('*, modules(id, name, code, courses(id, name))')
    .order('due_date', { ascending: true })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority)
  }
  if (filters.module_id) {
    query = query.eq('module_id', filters.module_id)
  }
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }

  // dont show archived unless specifically asked
  if (!filters.status) {
    query = query.neq('status', 'archived')
  }

  const { data, error } = await query
  return { data, error }
}

export async function getAllTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, modules(id, name, code, courses(id, name))')
    .order('due_date', { ascending: true })

  return { data, error }
}

export async function getTaskById(id) {
  
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select(`
      *,
      modules(id, name, code, courses(id, name)),
      subtasks(*),
      task_notes(*, profiles(first_name, last_name))
    `)
    .eq('id', id)
    .single()

  if (taskError) return { task: null, error: taskError }

  // sort subtasks by position and notes by newest first
  if (task.subtasks) {
    task.subtasks.sort((a, b) => (a.position || 0) - (b.position || 0))
  }
  if (task.task_notes) {
    task.task_notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  // rename task_notes to just notes for the frontend
  task.notes = task.task_notes || []
  delete task.task_notes

  return { task, error: null }
}

export async function createTask(taskData) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...taskData, user_id: user.id })
    .select()
    .single()

  return { data, error }
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deleteTask(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  return { error }
}


export async function completeTask(taskId) {
  const { data: { user } } = await supabase.auth.getUser()

  // check dependencies first
  const { data: deps } = await supabase
    .from('task_dependencies')
    .select('depends_on_id, tasks!task_dependencies_depends_on_id_fkey(status)')
    .eq('task_id', taskId)

  if (deps && deps.length > 0) {
    const blocking = deps.filter(d => d.tasks?.status !== 'completed')
    if (blocking.length > 0) {
      return {
        data: null,
        error: { message: 'Cannot complete — this task has unfinished dependencies' }
      }
    }
  }

  const { data, error } = await supabase
    .from('task_completions')
    .insert({ task_id: taskId, user_id: user.id })
    .select()
    .single()

  return { data, error }
}

export async function uncompleteTask(taskId) {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('task_completions')
    .delete()
    .match({ task_id: taskId, user_id: user.id })

  return { error }
}

export async function getCompletionStatus(taskId) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .match({ task_id: taskId, user_id: user.id })

  return { completed: data && data.length > 0, error }
}

export async function archiveTask(id) {
  return updateTask(id, { status: 'archived' })
}

export async function getArchivedTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, modules(id, name, code, courses(id, name))')
    .eq('status', 'archived')
    .order('updated_at', { ascending: false })

  return { data, error }
}

// subtasks

export async function addSubtask(taskId, title) {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({ task_id: taskId, title })
    .select()
    .single()

  return { data, error }
}

export async function toggleSubtask(id, isCompleted) {
  const { data, error } = await supabase
    .from('subtasks')
    .update({ is_completed: isCompleted })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deleteSubtask(id) {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', id)

  return { error }
}

// notes

export async function addTaskNote(taskId, content) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('task_notes')
    .insert({ task_id: taskId, user_id: user.id, content })
    .select('*, profiles(first_name, last_name)')
    .single()

  return { data, error }
}

export async function deleteTaskNote(id) {
  const { error } = await supabase
    .from('task_notes')
    .delete()
    .eq('id', id)

  return { error }
}

// dependencies

export async function getTaskDependencies(taskId) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*, tasks!task_dependencies_depends_on_id_fkey(id, title, status)')
    .eq('task_id', taskId)

  return { data, error }
}

export async function addDependency(taskId, dependsOnId) {
  const { data: isCircular } = await supabase
    .rpc('check_circular_dependency', {
      p_task_id: taskId,
      p_depends_on_id: dependsOnId
    })

  if (isCircular) {
    return { data: null, error: { message: 'This would create a circular dependency' } }
  }

  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({
      task_id: taskId,
      depends_on_id: dependsOnId
    })
    .select('*, tasks!task_dependencies_depends_on_id_fkey(id, title, status)')
    .single()

  return { data, error }
}

export async function removeDependency(id) {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', id)

  return { error }
}