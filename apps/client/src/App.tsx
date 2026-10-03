import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Entry from './pages/entry/Entry';

// 路由级分包：H5(antd-mobile) 与 PC(antd) 各自按需加载
const H5Layout = lazy(() => import('./pages/h5/H5Layout'));
const ReportPage = lazy(() => import('./pages/h5/ReportPage'));
const TrackPage = lazy(() => import('./pages/h5/TrackPage'));
const IncidentDetailPage = lazy(() => import('./pages/h5/IncidentDetail'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Workbench = lazy(() => import('./pages/admin/Workbench'));
const IncidentDetailAdmin = lazy(() => import('./pages/admin/IncidentDetail'));
const DutyDesk = lazy(() => import('./pages/admin/DutyDesk'));
const Records = lazy(() => import('./pages/admin/Records'));

function PageLoading() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#7a8699',
      }}
    >
      加载中…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Entry />} />

          {/* 家属端 H5（antd-mobile） */}
          <Route path="/h5" element={<H5Layout />}>
            <Route index element={<ReportPage />} />
            <Route path="track" element={<TrackPage />} />
          </Route>
          <Route path="/h5/incident/:id" element={<IncidentDetailPage />} />

          {/* 管理端 PC（antd） */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Workbench />} />
            <Route path="duty" element={<DutyDesk />} />
            <Route path="records" element={<Records />} />
          </Route>
          <Route path="/admin/incidents/:id" element={<IncidentDetailAdmin />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
