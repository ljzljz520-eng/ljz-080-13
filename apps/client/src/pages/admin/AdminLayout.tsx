import { Link, Outlet, useLocation } from 'react-router-dom';

const MENUS = [
  { key: 'workbench', path: '/admin', icon: '🚨', label: '预警工作台', end: true },
  { key: 'duty', path: '/admin/duty', icon: '📡', label: '社区值班台' },
  { key: 'records', path: '/admin/records', icon: '📁', label: '老人健康档案' },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const active =
    MENUS.find((m) => (m.end ? pathname === m.path : pathname.startsWith(m.path)))
      ?.key ?? 'workbench';

  return (
    <div className="admin-shell">
      <aside className="admin-sider">
        <div className="logo-area">
          <div className="logo-mark">❤</div>
          <div className="logo-text">
            <div className="t1">颐家云</div>
            <div className="t2">跌倒预警处置平台</div>
          </div>
        </div>
        {MENUS.map((m) => (
          <Link
            key={m.key}
            to={m.path}
            className={`menu-item ${active === m.key ? 'active' : ''}`}
          >
            <span>{m.icon}</span>
            {m.label}
          </Link>
        ))}
        <div className="sider-foot">
          演示账号：管家 林敏
          <br />
          值班员 周倩
          <br />
          <Link to="/" style={{ textDecoration: 'underline', opacity: 0.9 }}>
            返回入口选择
          </Link>
        </div>
      </aside>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
