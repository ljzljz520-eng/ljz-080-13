import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import H5ReportPage from './pages/h5/H5ReportPage';
import H5StatusPage from './pages/h5/H5StatusPage';
import AdminConsolePage from './pages/admin/AdminConsolePage';
import AlertDetailPage from './pages/admin/AlertDetailPage';
import ElderProfilePage from './pages/admin/ElderProfilePage';
import DutyDeskPage from './pages/duty/DutyDeskPage';
import './styles/global.less';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* 用户端 H5：家属 / 手环上报 */}
      <Route path="/h5" element={<H5ReportPage />} />
      <Route path="/h5/status/:id" element={<H5StatusPage />} />

      {/* 管理端 PC：管家工作台 */}
      <Route path="/admin" element={<AdminConsolePage />} />
      <Route path="/admin/alerts/:id" element={<AlertDetailPage />} />
      <Route path="/admin/elders/:id" element={<ElderProfilePage />} />

      {/* 社区值班台 */}
      <Route path="/duty" element={<DutyDeskPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
