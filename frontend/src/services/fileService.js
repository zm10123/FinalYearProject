import { supabase } from './supabaseClient'

export async function getGroupFiles(groupId) {
  const { data, error } = await supabase
    .from('files')
    .select('*, profiles:uploaded_by(first_name, last_name, email)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function uploadFile(groupId, file) {
  const { data: { user } } = await supabase.auth.getUser()

  // create a unique path so filenames dont clash
  const filePath = `${groupId}/${Date.now()}_${file.name}`

  // upload to supabase storage
  const { error: uploadError } = await supabase.storage
    .from('group-files')
    .upload(filePath, file)

  if (uploadError) return { data: null, error: uploadError }

  // save metadata to the files table
  const { data, error } = await supabase
    .from('files')
    .insert({
      group_id: groupId,
      uploaded_by: user.id,
      file_name: file.name,
      storage_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })
    .select('*, profiles:uploaded_by(first_name, last_name)')
    .single()

  return { data, error }
}

export async function deleteFile(fileId, storagePath) {
  // remove from storage first
  await supabase.storage.from('group-files').remove([storagePath])

  // then remove the metadata row
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)

  return { error }
}

export async function getFileUrl(storagePath) {
  // signed url lasts 1 hour
  const { data, error } = await supabase.storage
    .from('group-files')
    .createSignedUrl(storagePath, 3600)

  if (error) return { url: null, error }
  return { url: data.signedUrl, error: null }
}

export async function logFileAccess(fileId) {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('file_access_logs')
    .insert({
      file_id: fileId,
      user_id: user.id,
      action_type: 'viewed',
    })

  return { error }
}

// helper to format file size
export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}