import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert as AntAlert,
  Button,
  Card,
  Descriptions,
  Divider,
  Popconfirm,
  Result,
  Space,
  Spin,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  SendOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';
import { api, type AlertDetail } from '../../api';
import { formatTime, relativeFromNow } from '../../utils';
import { StatusTag, SourceTag } from '../../components/StatusTag';
import { Countdown } from '../../components/Countdown';
import { CALL_RESULT_META, RESULT_META, TIMELINE_META } from '../../styles/status';
import {
  CallModal,
  DispatchModal,
  FalseAlarmModal,
  ResolveModal,
} from './ActionModals';
import './detail.less';

type ModalKind = 'dispatch' | 'call' | 'false' | 'resolve' | null;

export default function AlertDetailPage() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const dutyMode = sp.get('from') === 'duty';
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setDetail(await api.alertDetail(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, 5000);
    return () => window.clearInterval(timerRef.current);
  }, [load]);

  if (error) {
    return (
      <Result
        status="404"
        title="事件不存在"
        subTitle={error}
        extra={<Button onClick={() => navigate(dutyMode ? '/duty' : '/admin')}>返回列表</Button>}
      />
    );
  }
  if (!detail) {
    return (
      <div style={{ textAlign: 'center', padding: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  const { alert: a, elder, contacts, lastVisit, worker, timeline, calls } = detail;
  const active = !['resolved', 'false_alarm'].includes(a.status);
  const ended = !active;

  const headerAction = dutyMode ? (
    <Button type="primary" ghost icon={<SafetyCertificateOutlined />} onClick={() => navigate('/duty')}>
      返回值班台
    </Button>
  ) : (
    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')}>
      返回工作台
    </Button>
  );

  return (
    <div className="detail-page">
      <header className="detail-topbar">
        <Space>
          {headerAction}
          <span className="mono-id">{a.id}</span>
          {dutyMode && <Tag color="red">社区值班台视图</Tag>}
        </Space>
        <Space>
          <Button onClick={() => navigate(`/admin/elders/${elder.id}`)}>
            <FileProtectOutlined /> 查看健康档案
          </Button>
        </Space>
      </header>

      <div className="page detail-layout">
        {/* 左：聚合信息 */}
        <div className="detail-main">
          {a.status === 'escalated' && (
            <AntAlert
              banner
              type="error"
              showIcon
              className="detail-banner"
              message="该事件已超过规定确认时限，自动升级至社区值班台"
              description={
                dutyMode
                  ? '请值班员立即电话核实现场情况，必要时通知 120，并可继续派遣护工。'
                  : `升级时间：${a.escalatedAt ? formatTime(a.escalatedAt) : '-'}，值班台可在值班视图接单处置。`
              }
              action={
                dutyMode && !a.dutyAckAt ? (
                  <Popconfirm
                    title="确认由值班台接管该事件？"
                    onConfirm={async () => setDetail(await api.dutyAck(a.id))}
                  >
                    <Button danger type="primary" size="small">
                      值班台接单
                    </Button>
                  </Popconfirm>
                ) : a.dutyAckAt ? (
                  <Tag color="red">值班台已接单</Tag>
                ) : undefined
              }
            />
          )}

          <Card className="detail-head card">
            <div className="detail-head-top">
              <Space size={14}>
                <span className="elder-avatar" style={{ width: 56, height: 56, fontSize: 20, background: elder.photoColor }}>
                  {elder.name.slice(0, 1)}
                </span>
                <div>
                  <Space>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      {elder.name}
                    </Typography.Title>
                    <SourceTag source={a.source} />
                    <StatusTag status={a.status} />
                  </Space>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {elder.age} 岁 · {elder.gender === 'female' ? '女' : '男'} · 护理等级{' '}
                    {['', '自理', '半失能', '失能'][elder.careLevel]} · {elder.community}
                  </div>
                </div>
              </Space>
              <div className="sla-panel">
                <div className="sla-panel-label">确认时限</div>
                <Countdown deadline={a.slaDeadline} active={active && !a.acknowledgedAt} />
                <div className="sla-panel-sub">
                  {a.acknowledgedAt
                    ? `${a.acknowledgedBy} 已于 ${relativeFromNow(a.acknowledgedAt)}确认`
                    : '逾期无人确认将自动升级值班台'}
                </div>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div className="info-grid">
              <div className="info-block">
                <div className="info-block-title">
                  <EnvironmentOutlined /> 跌倒位置
                </div>
                <div className="info-block-main">{a.location}</div>
                <div className="muted">{a.locationDetail ?? '—'}</div>
              </div>
              <div className="info-block">
                <div className="info-block-title">
                  <ClockCircleOutlined /> 发生时间
                </div>
                <div className="info-block-main">{formatTime(a.createdAt)}</div>
                <div className="muted">{relativeFromNow(a.createdAt)}</div>
              </div>
              <div className="info-block">
                <div className="info-block-title">
                  🧑‍⚕️ 最近一次上门服务
                </div>
                {lastVisit ? (
                  <>
                    <div className="info-block-main">
                      {lastVisit.workerName} · {lastVisit.serviceType}
                    </div>
                    <Tooltip title={lastVisit.note}>
                      <div className="muted">
                        {relativeFromNow(lastVisit.visitedAt)} · {lastVisit.note}
                      </div>
                    </Tooltip>
                  </>
                ) : (
                  <div className="muted">暂无上门记录</div>
                )}
              </div>
              <div className="info-block info-block-contacts">
                <div className="info-block-title">📞 紧急联系人</div>
                {contacts.length === 0 && <div className="muted">未登记</div>}
                {contacts.map((c) => (
                  <div className="contact-chip" key={c.id}>
                    <span>
                      {c.priority === 1 && <Tag color="red" style={{ marginRight: 6 }}>第一联系人</Tag>}
                      <b>{c.name}</b>（{c.relation}）
                    </span>
                    <a href={`tel:${c.phone}`}>{c.phone}</a>
                  </div>
                ))}
              </div>
            </div>

            {(a.reporterNote || a.reporterName) && (
              <>
                <Divider style={{ margin: '14px 0' }} />
                <Descriptions column={1} size="small">
                  {a.reporterName && <Descriptions.Item label="上报人">{a.reporterName}</Descriptions.Item>}
                  {a.reporterNote && <Descriptions.Item label="现场描述">{a.reporterNote}</Descriptions.Item>}
                </Descriptions>
              </>
            )}
          </Card>

          {/* 处置操作条 */}
          <Card className="action-bar card">
            {ended ? (
              <div className="ended-box">
                {a.status === 'resolved' ? (
                  <>
                    <CheckCircleOutlined style={{ color: '#15803d', fontSize: 22 }} />
                    <span>
                      已复访结案（{RESULT_META[a.revisitResult ?? ''] ?? a.revisitResult}），复访结果已写入
                      <a onClick={() => navigate(`/admin/elders/${elder.id}`)}> 老人健康档案</a>
                      {detail.healthRecordId && <span className="mono-id">（{detail.healthRecordId}）</span>}
                    </span>
                  </>
                ) : (
                  <>
                    <CloseCircleOutlined style={{ color: '#737373', fontSize: 22 }} />
                    <span>事件已标记为误报并关闭</span>
                  </>
                )}
              </div>
            ) : (
              <Space size={12} wrap>
                {!a.acknowledgedAt && (
                  <Button
                    size="large"
                    onClick={async () => setDetail(await api.acknowledge(a.id, dutyMode ? '社区值班员' : '值班管家'))}
                  >
                    ✓ 确认接管
                  </Button>
                )}
                <Button size="large" type="primary" icon={<SendOutlined />} onClick={() => setModal('dispatch')}>
                  派护工上门
                </Button>
                <Button size="large" icon={<PhoneOutlined />} onClick={() => setModal('call')}>
                  拨打电话
                </Button>
                <Popconfirm
                  title="确认为误报？"
                  description="事件将直接关闭，无需派单"
                  onConfirm={() => setModal('false')}
                >
                  <Button size="large" danger ghost icon={<CloseCircleOutlined />}>
                    标记误报
                  </Button>
                </Popconfirm>
                <Button
                  size="large"
                  type="primary"
                  ghost
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => setModal('resolve')}
                  style={{ marginLeft: 'auto' }}
                >
                  复访结案 / 写入健康档案
                </Button>
              </Space>
            )}
          </Card>

          {a.status === 'resolved' && (
            <Card className="card revisit-card" title="复访记录（健康档案）">
              <Descriptions column={2}>
                <Descriptions.Item label="复访结论">
                  <Tag color="green">{RESULT_META[a.revisitResult ?? ''] ?? a.revisitResult}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="复访人">{a.revisitedBy}</Descriptions.Item>
                <Descriptions.Item label="结案时间" span={2}>
                  {a.resolvedAt ? formatTime(a.resolvedAt) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="复访说明" span={2}>
                  <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {a.revisitNote}
                  </Typography.Paragraph>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </div>

        {/* 右：时间线 + 通话 + 派工 */}
        <div className="detail-side">
          {worker && (
            <Card className="card side-card" title="当前上门护工">
              <div className="worker-box">
                <span className="elder-avatar" style={{ background: '#0e7490', width: 40, height: 40 }}>
                  {worker.name.slice(0, 1)}
                </span>
                <div>
                  <b>{worker.name}</b>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {worker.title} · {worker.currentArea}
                  </div>
                  <a href={`tel:${worker.phone}`} style={{ fontSize: 12.5 }}>
                    {worker.phone}
                  </a>
                </div>
              </div>
            </Card>
          )}

          <Card className="card side-card" title={`通话记录（${calls.length}）`}>
            {calls.length === 0 && <div className="muted">暂无通话，可通过上方“拨打电话”登记</div>}
            {calls.map((c) => (
              <div className="call-item" key={c.id}>
                <div className="call-head">
                  <PhoneOutlined /> <b>{c.target}</b>
                  <Tag
                    color={
                      c.result === 'connected'
                        ? 'green'
                        : c.result === 'no_answer'
                          ? 'red'
                          : 'orange'
                    }
                    style={{ marginLeft: 'auto' }}
                  >
                    {CALL_RESULT_META[c.result]?.label}
                  </Tag>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {formatTime(c.at)} · 通话 {c.durationSec}s
                </div>
                {c.note && <div className="call-note">{c.note}</div>}
              </div>
            ))}
          </Card>

          <Card className="card side-card" title="处置时间线">
            <Timeline
              items={timeline.map((t) => ({
                color: TIMELINE_META[t.type]?.color ?? 'gray',
                children: (
                  <div className="tl-item">
                    <div className="tl-head">
                      <b style={{ color: TIMELINE_META[t.type]?.color }}>
                        {TIMELINE_META[t.type]?.label ?? t.type}
                      </b>
                      <span className="muted">{formatTime(t.at)}</span>
                    </div>
                    <div className="tl-detail">{t.detail}</div>
                    <div className="muted tl-actor">{t.actor}</div>
                  </div>
                ),
              }))}
            />
          </Card>
        </div>
      </div>

      <DispatchModal open={modal === 'dispatch'} detail={detail} onClose={() => setModal(null)} onDone={setDetail} />
      <CallModal open={modal === 'call'} detail={detail} onClose={() => setModal(null)} onDone={setDetail} />
      <FalseAlarmModal open={modal === 'false'} detail={detail} onClose={() => setModal(null)} onDone={setDetail} />
      <ResolveModal open={modal === 'resolve'} detail={detail} onClose={() => setModal(null)} onDone={setDetail} />
    </div>
  );
}
