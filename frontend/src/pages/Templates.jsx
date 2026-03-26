import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTemplates, deleteTemplate } from '../services/templateService'

function Templates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    const { data, error } = await getTemplates()
    if (!error && data) setTemplates(data)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this template?')) return
    const { error } = await deleteTemplate(id)
    if (!error) {
      setTemplates(templates.filter(t => t.id !== id))
    }
  }

  function handleUse(templateId) {
    navigate(`/tasks/new?template=${templateId}`)
  }

  if (loading) return <div className="p-8 text-stone-400">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Templates</h1>
      <p className="text-stone-500 text-sm mb-6">
        {templates.length} template{templates.length !== 1 ? 's' : ''}
      </p>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg mb-2">No templates yet</p>
          <p className="text-sm">Save a task as a template from the Create Task page</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-stone-200 rounded-lg p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-sm font-semibold">{t.title}</h3>
                  <div className="flex gap-2 mt-1">
                    {t.modules && (
                      <span className="text-xs bg-stone-100 px-2 py-0.5 rounded">
                        {t.modules.name}
                      </span>
                    )}
                    {t.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        t.priority === 'high' ? 'bg-red-50 text-red-600' :
                        t.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-stone-100 text-stone-500'
                      }`}>{t.priority}</span>
                    )}
                  </div>
                </div>
              </div>
              {t.description && (
                <p className="text-xs text-stone-500 mb-3 line-clamp-2">{t.description}</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => handleUse(t.id)}
                  className="px-3 py-1.5 text-xs bg-stone-900 text-white rounded hover:bg-stone-800">
                  Use Template
                </button>
                <button onClick={() => handleDelete(t.id)}
                  className="px-3 py-1.5 text-xs border border-stone-300 rounded hover:bg-stone-50 text-stone-500">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Templates
