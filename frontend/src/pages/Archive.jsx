import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Archive() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchArchived()
  }, [user])

  const fetchArchived = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'archived')
      .order('updated_at', { ascending: false })

    setTasks(data || [])
    setLoading(false)
  }

  const restoreTask = async (taskId) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'pending' })
      .eq('id', taskId)

    if (!error) setTasks(tasks.filter(t => t.id !== taskId))
  }

  const deleteTask = async (taskId) => {
    if (!confirm('Permanently delete this task?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) setTasks(tasks.filter(t => t.id !== taskId))
  }

  if (loading) return <div className="text-stone-500">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Archive</h1>

      <div className="bg-white border border-stone-200 rounded-lg">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No archived tasks</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {tasks.map(task => (
              <div key={task.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-sm text-stone-500">{task.description || 'No description'}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => restoreTask(task.id)}
                    className="px-3 py-1 text-sm border border-stone-200 rounded-md"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded-md"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}