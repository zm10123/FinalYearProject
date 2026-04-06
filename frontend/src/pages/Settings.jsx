import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import { getCourses, getAllModules, createCourse, createModule, updateCourse, updateModule, deleteCourse, deleteModule } from '../services/moduleService'
function Settings() {
  const { user } = useAuth()

  // profile
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // courses and modules
  const [courses, setCourses] = useState([])
  const [allModules, setAllModules] = useState([])
  const [expandedCourse, setExpandedCourse] = useState(null)
  const [loadingCourses, setLoadingCourses] = useState(true)

  // add course form
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseYear, setNewCourseYear] = useState('')
  const [newCourseTarget, setNewCourseTarget] = useState('')

  // add module form
  const [addingModuleTo, setAddingModuleTo] = useState(null) // course id
  const [newModuleName, setNewModuleName] = useState('')
  const [newModuleCode, setNewModuleCode] = useState('')
  const [newModuleTarget, setNewModuleTarget] = useState('')

  // edit states
  const [editingCourse, setEditingCourse] = useState(null)
  const [editingModule, setEditingModule] = useState(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadProfile()
    loadCoursesAndModules()
  }, [])

  async function loadProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setFirstName(data.first_name || '')
      setLastName(data.last_name || '')
      setEmail(data.email || user.email || '')
    }
  }

  async function loadCoursesAndModules() {
    setLoadingCourses(true)
    const [coursesRes, modulesRes] = await Promise.all([
      getCourses(),
      getAllModules()
    ])
    if (coursesRes.data) setCourses(coursesRes.data)
    if (modulesRes.data) setAllModules(modulesRes.data)
    setLoadingCourses(false)
  }

  // --- profile ---

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSavingProfile(true)
    setError('')
    setSuccess('')

    const { error: err } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      })
      .eq('id', user.id)

    if (err) {
      setError(err.message)
    } else {
      setSuccess('Profile updated')
      setTimeout(() => setSuccess(''), 3000)
    }
    setSavingProfile(false)
  }

  // --- courses ---

  async function handleAddCourse(e) {
    e.preventDefault()
    if (!newCourseName.trim()) return
    setError('')

    const { data, error: err } = await createCourse(
      newCourseName.trim(),
      newCourseYear ? parseInt(newCourseYear) : null,
      newCourseTarget ? parseFloat(newCourseTarget) : null
    )

    if (err) {
      setError(err.message)
    } else {
      setCourses([...courses, data])
      setNewCourseName('')
      setNewCourseYear('')
      setNewCourseTarget('')
      setShowAddCourse(false)
    }
  }

  async function handleUpdateCourse(courseId, updates) {
    const { data, error: err } = await updateCourse(courseId, updates)
    if (err) {
      setError(err.message)
    } else {
      setCourses(courses.map(c => c.id === courseId ? { ...c, ...data } : c))
      setEditingCourse(null)
    }
  }

  async function handleDeleteCourse(courseId, name) {
    if (!window.confirm(`Delete "${name}"? This will also delete all modules in this course.`)) return
    const { error: err } = await deleteCourse(courseId)
    if (err) {
      setError(err.message)
    } else {
      setCourses(courses.filter(c => c.id !== courseId))
      setAllModules(allModules.filter(m => m.course_id !== courseId))
    }
  }

  // --- modules ---

  async function handleAddModule(e, courseId) {
    e.preventDefault()
    if (!newModuleName.trim()) return
    setError('')

    const { data, error: err } = await createModule(
      courseId,
      newModuleName.trim(),
      newModuleCode.trim() || null,
      newModuleTarget ? parseFloat(newModuleTarget) : null
    )

    if (err) {
      setError(err.message)
    } else {
      setAllModules([...allModules, data])
      setNewModuleName('')
      setNewModuleCode('')
      setNewModuleTarget('')
      setAddingModuleTo(null)
    }
  }

  async function handleUpdateModule(moduleId, updates) {
    const { data, error: err } = await updateModule(moduleId, updates)
    if (err) {
      setError(err.message)
    } else {
      setAllModules(allModules.map(m => m.id === moduleId ? { ...m, ...data } : m))
      setEditingModule(null)
    }
  }

  async function handleDeleteModule(moduleId, name) {
    if (!window.confirm(`Delete "${name}"? Tasks linked to this module will be unlinked.`)) return
    const { error: err } = await deleteModule(moduleId)
    if (err) {
      setError(err.message)
    } else {
      setAllModules(allModules.filter(m => m.id !== moduleId))
    }
  }

  function getModulesForCourse(courseId) {
    return allModules.filter(m => m.course_id === courseId)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-stone-500 text-sm mb-6">Manage your profile and academic setup</p>

      {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 text-sm p-3 rounded mb-4">{success}</div>}

      {/* profile section */}
      <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} disabled
              className="w-full px-3 py-2 border border-stone-200 rounded text-sm bg-stone-50 text-stone-500" />
            <p className="text-xs text-stone-400 mt-1">Email is managed through your account and cannot be changed here</p>
          </div>
          <button type="submit" disabled={savingProfile}
            className="px-4 py-2 text-sm bg-stone-900 text-white rounded hover:bg-stone-800 disabled:opacity-50">
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* courses & modules section */}
      <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold">Courses & Modules</h2>
          <button onClick={() => setShowAddCourse(!showAddCourse)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {showAddCourse ? 'Cancel' : '+ Add Course'}
          </button>
        </div>

        {/* add course form */}
        {showAddCourse && (
          <form onSubmit={handleAddCourse} className="bg-stone-50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <input type="text" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Course name"
                className="col-span-2 px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              <input type="number" value={newCourseYear} onChange={(e) => setNewCourseYear(e.target.value)}
                placeholder="Year"
                className="px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div className="flex gap-3 items-center">
              <input type="number" value={newCourseTarget} onChange={(e) => setNewCourseTarget(e.target.value)}
                placeholder="Target grade %" step="0.1" min="0" max="100"
                className="w-32 px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-900" />
              <button type="submit" className="px-3 py-2 text-xs bg-stone-900 text-white rounded">Add Course</button>
            </div>
          </form>
        )}

        {/* course list */}
        {loadingCourses ? (
          <p className="text-xs text-stone-400">Loading...</p>
        ) : courses.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">No courses yet. Add one to get started.</p>
        ) : (
          <div className="space-y-3">
            {courses.map(course => {
              const courseMods = getModulesForCourse(course.id)
              const isExpanded = expandedCourse === course.id

              return (
                <div key={course.id} className="border border-stone-200 rounded-lg">
                  {/* course header */}
                  <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-stone-50"
                    onClick={() => setExpandedCourse(isExpanded ? null : course.id)}>
                    <span className="text-xs text-stone-400">{isExpanded ? '▼' : '▶'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{course.name}</div>
                      <div className="text-xs text-stone-400">
                        {course.year && `Year ${course.year} · `}
                        {courseMods.length} module{courseMods.length !== 1 ? 's' : ''}
                        {course.target_grade && ` · Target: ${course.target_grade}%`}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id, course.name) }}
                      className="text-stone-300 hover:text-red-500 text-sm px-2">×</button>
                  </div>

                  {/* expanded: modules */}
                  {isExpanded && (
                    <div className="border-t border-stone-200 p-3 bg-stone-50/50">
                      {courseMods.length === 0 ? (
                        <p className="text-xs text-stone-400 mb-3">No modules yet</p>
                      ) : (
                        <div className="space-y-2 mb-3">
                          {courseMods.map(mod => (
                            <div key={mod.id} className="flex items-center gap-2 bg-white rounded p-2 border border-stone-100">
                              <div className="flex-1">
                                <div className="text-xs font-medium">{mod.name}{mod.code && ` (${mod.code})`}</div>
                                {mod.target_grade && (
                                  <div className="text-xs text-stone-400">Target: {mod.target_grade}%</div>
                                )}
                              </div>
                              <button onClick={() => handleDeleteModule(mod.id, mod.name)}
                                className="text-stone-300 hover:text-red-500 text-xs px-1">×</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* add module form */}
                      {addingModuleTo === course.id ? (
                        <form onSubmit={(e) => handleAddModule(e, course.id)} className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)}
                              placeholder="Module name"
                              className="px-2 py-1.5 border border-stone-300 rounded text-xs focus:outline-none focus:border-stone-900" />
                            <input type="text" value={newModuleCode} onChange={(e) => setNewModuleCode(e.target.value)}
                              placeholder="Code (e.g. CS2001)"
                              className="px-2 py-1.5 border border-stone-300 rounded text-xs focus:outline-none focus:border-stone-900" />
                          </div>
                          <div className="flex gap-2 items-center">
                            <input type="number" value={newModuleTarget} onChange={(e) => setNewModuleTarget(e.target.value)}
                              placeholder="Target %" step="0.1" min="0" max="100"
                              className="w-24 px-2 py-1.5 border border-stone-300 rounded text-xs focus:outline-none focus:border-stone-900" />
                            <button type="submit" className="px-2 py-1.5 text-xs bg-stone-900 text-white rounded">Add</button>
                            <button type="button" onClick={() => setAddingModuleTo(null)}
                              className="px-2 py-1.5 text-xs border border-stone-300 rounded">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => setAddingModuleTo(course.id)}
                          className="text-xs text-blue-600 hover:text-blue-800">+ Add Module</button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* The danger zone */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h2>
        <p className="text-xs text-stone-500 mb-4">
          Deleting your account will permanently remove all your tasks, groups, and data.
        </p>
        <button
          onClick={async () => {
            if (!window.confirm('Are you sure? This will permanently delete your account and all your data. This cannot be undone.')) return
            const typed = window.prompt('Type DELETE to confirm')
            if (typed !== 'DELETE') return

            const { error } = await supabase.rpc('delete_own_account')
            if (error) {
              alert('Failed to delete account: ' + error.message)
            } else {
              await signOut()
            }
          }}
          className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
        >
          Delete Account
        </button>
      </div>
    </div>
  )
}

export default Settings
