import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/shell'
import { AdminStoreProvider } from './lib/store'
import { CombinationEditPage } from './pages/CombinationEditPage'
import { CombinationsListPage } from './pages/CombinationsListPage'
import { DashboardPage } from './pages/DashboardPage'
import { MonitoringPage } from './pages/MonitoringPage'
import { PoolDetailPage } from './pages/PoolDetailPage'
import { PoolsListPage } from './pages/PoolsListPage'
import { PreviewPage } from './pages/PreviewPage'
import { RolesListPage } from './pages/RolesListPage'
import { StrategyEditPage } from './pages/StrategyEditPage'
import { StrategiesListPage } from './pages/StrategiesListPage'
import { UsersListPage } from './pages/UsersListPage'

function App() {
  return (
    <AdminStoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/combinations" replace />} />
          <Route element={<AppShell />}>
            <Route path="/pools" element={<PoolsListPage />} />
            <Route path="/pools/:id" element={<PoolDetailPage />} />
            <Route path="/strategies" element={<StrategiesListPage />} />
            <Route path="/strategies/:id/edit" element={<StrategyEditPage />} />
            <Route path="/combinations" element={<CombinationsListPage />} />
            <Route path="/combinations/:id" element={<CombinationEditPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/roles" element={<RolesListPage />} />
            <Route path="/users" element={<UsersListPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/preview" element={<PreviewPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AdminStoreProvider>
  )
}

export default App
