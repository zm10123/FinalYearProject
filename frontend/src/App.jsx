import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import CreateTask from './pages/CreateTask'
import TaskDetail from './pages/TaskDetail'
import Calendar from './pages/Calendar'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import History from './pages/History'
import Settings from './pages/Settings'
import Templates from './pages/Templates'
import Pomodoro from './pages/Pomodoro'
import StudyPlanner from './pages/StudyPlanner'
import GradePrediction from './pages/GradePrediction'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tasks" element={
            <ProtectedRoute>
              <Layout><Tasks /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tasks/new" element={
            <ProtectedRoute>
              <Layout><CreateTask /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tasks/:id" element={
            <ProtectedRoute>
              <Layout><TaskDetail /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/calendar" element={
            <ProtectedRoute>
              <Layout><Calendar /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/groups" element={
            <ProtectedRoute>
              <Layout><Groups /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/groups/:id" element={
            <ProtectedRoute>
              <Layout><GroupDetail /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/history" element={
            <ProtectedRoute>
              <Layout><History /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout><Settings /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/templates" element={
            <ProtectedRoute>
              <Layout><Templates /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/pomodoro" element={
            <ProtectedRoute>
              <Layout><Pomodoro /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/study-planner" element={
              <ProtectedRoute>
                <Layout> <StudyPlanner /> </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="/predictions" element={
            <ProtectedRoute>
              <Layout><GradePrediction /></Layout>
            </ProtectedRoute>
          } />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App