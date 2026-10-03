import { useNavigate } from 'react-router-dom';
import './home.less';

const entries = [
  {
    path: '/h5',
    tag: '用户端 · H5',
    title: '家属 / 手环上报',
    desc: '老人疑似跌倒时，家属或智能手环在此一键上报，系统自动锁定位置与时间。',
    icon: '📟',
    tone: 'linear-gradient(135deg, #ff9a62, #ff6b6b)',
  },
  {
    path: '/admin',
    tag: '管理端 · PC',
    title: '管家预警工作台',
    desc: '位置、时间、最近上门服务、紧急联系人同页聚合；可派护工、拨打电话、标记误报。',
    icon: '🖥️',
    tone: 'linear-gradient(135deg, #4f8cff, #1f6feb)',
  },
  {
    path: '/duty',
    tag: '社区端',
    title: '社区值班台',
    desc: '规定时限内无人确认的事件自动升级至此，值班员接单并持续跟进直至结案。',
    icon: '🚨',
    tone: 'linear-gradient(135deg, #f43f5e, #be123c)',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-badge">🛡️ 颐年守护 · 智慧养老平台</div>
        <h1>跌倒预警闭环链路</h1>
        <p>
          从手环 / 家属上报，到管家处置、超时升级社区值班台，
          再到复访结果写入老人健康档案 —— 每一步都有记录、有着落。
        </p>
      </div>
      <div className="home-grid">
        {entries.map((e) => (
          <div key={e.path} className="home-card" onClick={() => navigate(e.path)}>
            <div className="home-card-icon" style={{ background: e.tone }}>
              {e.icon}
            </div>
            <div className="home-card-tag">{e.tag}</div>
            <h2>{e.title}</h2>
            <p>{e.desc}</p>
            <div className="home-card-enter">进入工作台 →</div>
          </div>
        ))}
      </div>
      <div className="home-flow">
        {['疑似跌倒上报', '信息同页聚合', '管家确认处置', '超时升级值班台', '复访入档结案'].map(
          (step, i) => (
            <div className="flow-step" key={step}>
              <div className="flow-dot">{i + 1}</div>
              <span>{step}</span>
              {i < 4 && <div className="flow-arrow">→</div>}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
