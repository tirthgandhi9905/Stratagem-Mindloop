import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
import LandingPage from './pages/LandingPage'
import CreateOrganization from './pages/CreateOrganization'
import JoinOrganization from './pages/JoinOrganization'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import OrgOnboarding from './pages/OrgOnboarding'
import DashboardRedirect from './pages/DashboardRedirect'
import DashboardLayout from './components/layout/DashboardLayout'
import Overview from './pages/dashboard/Overview'
import Teams from './pages/dashboard/Teams'
import Members from './pages/dashboard/Members'
import Tasks from './pages/dashboard/Tasks'
import Calendar from './pages/dashboard/Calendar'
import Integrations from './pages/dashboard/Integrations'
import OrganizationSettings from './pages/settings/OrganizationSettings'
import TeamSettings from './pages/settings/TeamSettings'
import ProfileSettings from './pages/settings/ProfileSettings'

import Profile from './components/layout/Profile'
import ChangePassword from './pages/dashboard/ChangePassword'

function App() {
  const initializeSubscription = useAuthStore((state) => state.initializeSubscription)
  const initTheme = useThemeStore((state) => state.initTheme)

  useEffect(() => {
    initTheme()
    const unsubscribe = initializeSubscription()
    return () => unsubscribe()
  }, [initializeSubscription, initTheme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/loading" element={<DashboardRedirect />} />
        <Route path="/get-started" element={<OrgOnboarding />} />
        <Route path="/create-org" element={<CreateOrganization />} />
        <Route path="/join-org" element={<JoinOrganization />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="teams" element={<Teams />} />
          <Route path="members" element={<Members />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="integrations" element={<Integrations />} />

          {/* Profile */}
          <Route path="profile" element={<Profile />} />

          {/* ✅ Change Password */}
          <Route path="change-password" element={<ChangePassword />} />

          <Route path="settings">
            <Route index element={<Navigate to="organization" replace />} />
            <Route path="organization" element={<OrganizationSettings />} />
            <Route path="teams" element={<TeamSettings />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
