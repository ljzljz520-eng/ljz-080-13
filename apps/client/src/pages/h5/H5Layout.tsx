import { Outlet } from 'react-router-dom';
import { TabBar } from 'antd-mobile';
import { useLocation, useNavigate } from 'react-router-dom';

export default function H5Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.includes('/track') ? 'track' : 'home';

  return (
    <div className="h5-shell">
      <Outlet />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <TabBar
            safeArea
            activeKey={active}
            onChange={(key) => navigate(key === 'home' ? '/h5' : '/h5/track')}
          >
            <TabBar.Item key="home" icon={<span>🆘</span>} title="一键上报" />
            <TabBar.Item key="track" icon={<span>🧭</span>} title="处置进度" />
          </TabBar>
        </div>
      </div>
    </div>
  );
}
