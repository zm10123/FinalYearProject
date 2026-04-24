import { supabase } from './supabaseClient'


export async function getGroups() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }

  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, role, status, groups(id, name, description, module, created_by, created_at)')
    .eq('user_id', user.id)  
    .in('status', ['accepted', 'pending'])
    .order('joined_at', { ascending: false })

  if (error) return { data: null, error }

  const groups = data
    .filter(gm => gm.groups !== null)
    .map(gm => ({
      ...gm.groups,
      userRole: gm.role,
      memberStatus: gm.status
    }))

  return { data: groups, error: null }
}

export async function getGroupById(id) {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (groupError) return { group: null, error: groupError }

  // get members with their profile info
  const { data: members } = await supabase
    .from('group_members')
    .select('*, profiles:user_id(id, first_name, last_name, email)')
    .eq('group_id', id)
    .order('joined_at', { ascending: true })

  // get group tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, modules(id, name, code)')
    .eq('group_id', id)
    .is('deleted_at', null)
    .neq('status', 'archived')
    .order('due_date', { ascending: true })

  // get recent activity
  const { data: activity } = await supabase
    .from('group_activity')
    .select('*, profiles:user_id(first_name, last_name)')
    .eq('group_id', id)
    .order('created_at', { ascending: false })
    .limit(15)

  return {
    group: {
      ...group,
      members: members || [],
      tasks: tasks || [],
      activity: activity || [],
    },
    error: null,
  }
}

export async function createGroup(name, description, module) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      description: description || null,
      module: module || null,
      created_by: user.id,
    })
    .select()
    .single()

  return { data, error }
}

export async function updateGroup(id, updates) {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deleteGroup(id) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id)

  return { error }
}

//  members 

export async function getGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profiles:user_id(id, first_name, last_name, email)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })

  return { data, error }
}

export async function inviteMember(groupId, email, role) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single()

  if (profileError || !profile) {
    return { data: null, error: { message: 'No user found with that email' } }
  }

  const { data: { user } } = await supabase.auth.getUser()

  // check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id, status')
    .match({ group_id: groupId, user_id: profile.id })
    .single()

  if (existing) {
    if (existing.status === 'accepted') {
      return { data: null, error: { message: 'This person is already a member' } }
    }
    // reinvite if they previously declined
    const { data, error } = await supabase
      .from('group_members')
      .update({ status: 'pending', role: role || 'viewer', invited_by: user.id })
      .eq('id', existing.id)
      .select('*, profiles:user_id(id, first_name, last_name, email)')
      .single()
    return { data, error }
  }

  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: profile.id,
      role: role || 'viewer',
      status: 'pending',
      invited_by: user.id,
    })
    .select('*, profiles:user_id(id, first_name, last_name, email)')
    .single()

  return { data, error }
}

export async function acceptInvite(groupId) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('group_members')
    .update({ status: 'accepted' })
    .match({ group_id: groupId, user_id: user.id })
    .select()
    .single()

  return { data, error }
}

export async function declineInvite(groupId) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('group_members')
    .update({ status: 'declined' })
    .match({ group_id: groupId, user_id: user.id })
    .select()
    .single()

  return { data, error }
}

export async function updateMemberRole(groupId, userId, newRole) {
  const { data, error } = await supabase
    .from('group_members')
    .update({ role: newRole })
    .match({ group_id: groupId, user_id: userId })
    .select()
    .single()

  return { data, error }
}

export async function removeMember(groupId, userId) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .match({ group_id: groupId, user_id: userId })

  return { error }
}

export async function leaveGroup(groupId) {
  const { data: { user } } = await supabase.auth.getUser()
  return removeMember(groupId, user.id)
}

// group tasks 

export async function addTaskToGroup(groupId, taskData) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...taskData,
      group_id: groupId,
      user_id: user.id,
    })
    .select()
    .single()

  return { data, error }
}