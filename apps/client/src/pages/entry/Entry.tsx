import { Link } from 'react-router-dom';
import '../../styles/entry.less';

export default function Entry() {
  return (
    <div className="entry-page">
      <div className="entry-card">
        <div className="brand">
          <div className="logo">❤</div>
          <div>
            <div className="name">颐家云 · 智慧养老平台</div>
            <div className="sub">社区居家养老照护协同系统</div>
          </div>
        </div>
        <h1>跌倒预警处置中心</h1>
        <p className="desc">
          老人手环自动识别或家属一键上报疑似跌倒，系统自动拉齐位置、发生时间、最近一次上门服务与紧急联系人；
          管家可快速确认、派护工、拨打电话或标记误报，超时未确认自动升级社区值班台，复访结果沉淀进老人健康档案。
        </p>
        <div className="portals">
          <Link to="/h5" className="portal portal-h5">
            <div className="portal-icon">📱</div>
            <div className="portal-title">家属端（H5）</div>
            <div className="portal-desc">
              一键上报老人疑似摔倒 · 实时追踪处置进度 · 接收处置结果
            </div>
          </Link>
          <Link to="/admin" className="portal portal-pc">
            <div className="portal-icon">🖥️</div>
            <div className="portal-title">管家 / 值班台（PC）</div>
            <div className="portal-desc">
              预警工作台 · 派单处置 · 社区值班台升级队列 · 老人健康档案
            </div>
          </Link>
        </div>
        <div className="flow">
          <span className="flow-step">① 手环 / 家属上报</span>
          <span className="flow-arrow">→</span>
          <span className="flow-step">② 信息聚合一页呈现</span>
          <span className="flow-arrow">→</span>
          <span className="flow-step">③ 管家确认 / 派单 / 电话 / 误报</span>
          <span className="flow-arrow">→</span>
          <span className="flow-step">④ 超时升级值班台</span>
          <span className="flow-arrow">→</span>
          <span className="flow-step">⑤ 复访写入健康档案</span>
        </div>
      </div>
    </div>
  );
}
