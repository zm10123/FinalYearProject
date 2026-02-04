export default function Dashboard() {
  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-stone-600">Week 8 of Semester 2</p>
        </div>
        <button className="bg-stone-800 text-white px-4 py-2 rounded-md text-sm">
          + New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg border border-stone-200">
          <div className="text-xs text-stone-400 mb-1">Due This Week</div>
          <div className="text-2xl font-bold">5</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-stone-200">
          <div className="text-xs text-stone-400 mb-1">Completed</div>
          <div className="text-2xl font-bold">12</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-stone-200">
          <div className="text-xs text-stone-400 mb-1">Avg Grade</div>
          <div className="text-2xl font-bold">68%</div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-stone-200">
          <div className="text-xs text-stone-400 mb-1">Est. Hours</div>
          <div className="text-2xl font-bold">14h</div>
        </div>
      </div>

      <p className="text-stone-500">More dashboard content coming soon...</p>
    </div>
  )
}