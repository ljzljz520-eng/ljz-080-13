import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
  message,
} from 'antd';
import { api } from '../../api/client';
import type {
  Caregiver,
  IncidentDetail,
} from '../../api/types';
import { OUTCOME_LABEL, STATUS_META } from '../../api/types';
import { formatDateTime, relativeFromNow } from '../../utils/format';
import { usePolling } from '../../utils/usePolling';

const MANAGER = '管家 林敏';

const TIMELINE_COLOR: Record<string, string> = {
  created: '#f5222d',
  acknowledged: '#fa8c16',
  dispatched: '#1677ff',
  called: '#13c2c2',
  escalated: '#722ed1',
  claimed: '#9254de',
  false_alarm: '#8c8c8c',
  revisited: '#52c41a',
};
const TIMELINE_TITLE: Record<string, string> = {
  created: '事件上报',
  acknowledged: '管家确认接单',
  dispatched: '派护工上门',
  called: '电话联系',
  escalated: '超时自动升级值班台',
  claimed: '社区值班台认领',
  false_alarm: '标记误报',
  revisited: '复访完成 · 已写入健康档案',
};

const RISK_LABEL: Record<string, { text: string; cls: string }> = {
  high: { text: '高跌倒风险', cls: 'risk-high' },
  medium: { text: '中风险', cls: 'risk-medium' },
  low: { text: '低风险', cls: 'risk-low' },
};

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<IncidentDetail | null>(null);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [falseOpen, setFalseOpen] = useState(false);
  const [revisitOpen, setRevisitOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    api.caregivers().then(setCaregivers).catch(() => undefined);
  }, []);

  const load = () => {
    if (id) api.incident(id).then(setData).catch(() => undefined);
  };
  useEffect(load, [id]);
  usePolling(() => {
    if (data && ['pending', 'acting', 'dispatched', 'escalated'].includes(data.status)) {
      load();
    }
  }, 5000);

  const closed = useMemo(
    () => !!data && ['revisited', 'false_alarm'].includes(data.status),
    [data],
  );

  if (!data) {
    return (
      <>
        <header className="admin-topbar">
          <div className="page-title">事件处置</div>
        </header>
        <div className="admin-content">加载中…</div>
      </>
    );
  }

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      message.success(success);
      setDispatchOpen(false);
      setCallOpen(false);
      setFalseOpen(false);
      setRevisitOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      message.error((e as Error).message || '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const onCallContact = (name: string, phone: string) => {
    form.setFieldsValue({
      target: 'emergency_contact',
      targetName: name,
      phone,
    });
    setCallOpen(true);
  };

  const dutyCaregivers = caregivers.filter((c) =>
    c.zones.includes(data.elder.location),
  );

  return (
    <>
      <header className="admin-topbar">
        <div className="page-title">
          <Button
            type="link"
            onClick={() => navigate(-1)}
            style={{ paddingLeft: 0 }}
          >
            ‹ 返回
          </Button>
          事件处置 · {data.code}
          <Badge
            color={STATUS_META[data.status].color}
            text={
              <span style={{ fontWeight: 700, marginLeft: 6 }}>
                {STATUS_META[data.status].label}
              </span>
            }
          />
        </div>
        <div className="top-right">
          上报于 {formatDateTime(data.createdAt)}（{relativeFromNow(data.createdAt)}）
        </div>
      </header>

      <div className="admin-content">
        {data.status === 'escalated' && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="该事件已超时升级至社区值班台"
            description={
              <Space direction="vertical" size={2}>
                <span>{data.escalatedReason}</span>
                <span>升级时间：{formatDateTime(data.escalatedAt)}</span>
                <Button
                  size="small"
                  type="primary"
                  danger
                  loading={busy}
                  onClick={() =>
                    run(
                      () => api.claim(data.id, '值班员 周倩'),
                      '值班台已认领，开始接手处置',
                    )
                  }
                >
                  值班台认领并接手（值班员 周倩）
                </Button>
              </Space>
            }
          />
        )}
        {data.status === 'pending' && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`事件等待管家中确认，需在 ${data.slaSeconds} 秒内响应，超时将自动升级社区值班台`}
          />
        )}

        <div className="action-bar" style={{ marginBottom: 16 }}>
          {!data.acknowledgedAt && data.status !== 'escalated' && (
            <Button
              type="primary"
              size="large"
              loading={busy}
              onClick={() =>
                run(
                  () => api.acknowledge(data.id, MANAGER),
                  '已确认接单，升级计时停止',
                )
              }
            >
              ✅ 确认接单
            </Button>
          )}
          <Button
            size="large"
            disabled={closed}
            onClick={() => {
              form.setFieldsValue({
                caregiverId: dutyCaregivers[0]?.id,
                etaMinutes: 10,
                by: MANAGER,
              });
              setDispatchOpen(true);
            }}
          >
            🚑 派护工上门
          </Button>
          <Button size="large" disabled={closed} onClick={() => setCallOpen(true)}>
            📞 拨打电话
          </Button>
          <Button
            size="large"
            disabled={closed}
            onClick={() =>
              onCallContact(data.elder.name, data.elder.phone)
            }
          >
            ☎ 呼叫老人
          </Button>
          <Button
            size="large"
            danger
            disabled={closed}
            onClick={() => setFalseOpen(true)}
          >
            误报撤销
          </Button>
          <Button
            size="large"
            type="primary"
            ghost
            disabled={closed}
            style={{ borderColor: '#0e7c86', color: '#0e7c86' }}
            onClick={() => {
              form.setFieldsValue({
                outcome: 'minor',
                injuryFound: true,
                hospitalAdvised: false,
                measures: [],
                note: '',
                by: MANAGER,
              });
              setRevisitOpen(true);
            }}
          >
            📝 录入复访结果
          </Button>
        </div>

        <div className="detail-grid">
          {/* 左列 */}
          <div>
            <div className="info-card">
              <div className="info-head">📍 位置与事件时间</div>
              <div className="info-body">
                <div className="kv-grid">
                  <div className="kv-key">上报位置</div>
                  <div className="kv-val" style={{ gridColumn: 'span 3' }}>
                    {data.address}
                    {data.locationDetail && (
                      <Tag style={{ marginLeft: 8 }}>{data.locationDetail}</Tag>
                    )}
                  </div>
                  <div className="kv-key">发生时间</div>
                  <div className="kv-val">{formatDateTime(data.occurredAt)}</div>
                  <div className="kv-key">上报来源</div>
                  <div className="kv-val">
                    {data.source === 'wristband' ? '⌚ 手环自动预警' : '📱 家属上报'}
                    {data.sensorConfidence !== undefined &&
                      `（置信度 ${data.sensorConfidence}%）`}
                    {data.reporterName && ` · ${data.reporterName}`}
                  </div>
                  <div className="kv-key">确认时限</div>
                  <div className="kv-val">{data.slaSeconds} 秒</div>
                  <div className="kv-key">确认时间</div>
                  <div className="kv-val">
                    {data.acknowledgedAt
                      ? `${formatDateTime(data.acknowledgedAt)}（${data.acknowledgedBy}）`
                      : '未确认'}
                  </div>
                  {data.reporterPhone && (
                    <>
                      <div className="kv-key">上报人电话</div>
                      <div className="kv-val">{data.reporterPhone}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="info-head">🏥 最近一次上门服务</div>
              <div className="info-body">
                {data.latestVisit ? (
                  <div className="visit-item">
                    <div style={{ fontWeight: 700 }}>
                      {data.latestVisit.serviceType}
                    </div>
                    <div style={{ color: '#7a8699', margin: '3px 0' }}>
                      {formatDateTime(data.latestVisit.visitedAt)} · 护工{' '}
                      {data.latestVisit.caregiverName}
                    </div>
                    <div>{data.latestVisit.note}</div>
                  </div>
                ) : (
                  <span style={{ color: '#98a1ae' }}>暂无上门服务记录</span>
                )}
              </div>
            </div>

            {data.revisit && (
              <div className="info-card">
                <div className="info-head">📝 复访结果（已归档至健康档案）</div>
                <div className="info-body">
                  <p style={{ marginBottom: 8 }}>
                    <Tag color="green">{OUTCOME_LABEL[data.revisit.outcome]}</Tag>
                    {data.revisit.hospitalAdvised && (
                      <Tag color="red">建议送医</Tag>
                    )}
                  </p>
                  <p style={{ lineHeight: 1.8 }}>{data.revisit.note}</p>
                  <Space wrap>
                    {data.revisit.measures.map((m) => (
                      <Tag key={m} color="cyan">
                        {m}
                      </Tag>
                    ))}
                  </Space>
                  <div style={{ color: '#98a1ae', fontSize: 12, marginTop: 10 }}>
                    上门护工：{data.revisit.caregiverName} · 记录人：
                    {data.revisit.by} · {formatDateTime(data.revisit.at)}
                  </div>
                </div>
              </div>
            )}

            <div className="info-card">
              <div className="info-head">🕓 处置时间线</div>
              <div className="info-body">
                <div className="timeline-pc">
                  {[...data.timeline].reverse().map((t) => (
                    <div className="tl-node" key={t.id}>
                      <span
                        className="tl-dot"
                        style={{ background: TIMELINE_COLOR[t.type] ?? '#8c8c8c' }}
                      />
                      <div>
                        <div className="tl-title">
                          {TIMELINE_TITLE[t.type] ?? t.type}
                        </div>
                        {t.detail && <div className="tl-detail">{t.detail}</div>}
                        <div className="tl-time">
                          {formatDateTime(t.at)} · {t.actor}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右列 */}
          <div>
            <div className="info-card">
              <div className="info-head">👵 老人档案</div>
              <div className="info-body">
                <div className="elder-card-top">
                  <div
                    className="e-avatar"
                    style={{ background: data.elder.avatarColor }}
                  >
                    {data.elder.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="e-name">
                      {data.elder.name}
                      <span className={RISK_LABEL[data.elder.riskLevel].cls} style={{ marginLeft: 8, fontSize: 12 }}>
                        {RISK_LABEL[data.elder.riskLevel].text}
                      </span>
                    </div>
                    <div className="e-meta">
                      {data.elder.gender} · {data.elder.age} 岁 ·{' '}
                      {data.elder.address}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  <div style={{ color: '#8a94a3' }}>基础病 / 注意事项</div>
                  <Space wrap style={{ marginBottom: 10 }}>
                    {data.elder.conditions.map((c) => (
                      <Tag key={c}>{c}</Tag>
                    ))}
                  </Space>
                </div>
                <Button
                  block
                  style={{ marginBottom: 4 }}
                  onClick={() => navigate(`/admin/records?elder=${data.elderId}`)}
                >
                  📁 查看完整健康档案
                </Button>
              </div>
            </div>

            <div className="info-card">
              <div className="info-head">📞 紧急联系人</div>
              <div className="info-body">
                {data.elder.emergencyContacts.map((c) => (
                  <div className="contact-item" key={c.phone}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <b>
                        {c.name}
                        <Tag style={{ marginLeft: 6 }}>{c.relation}</Tag>
                      </b>
                      <Button
                        size="small"
                        type="link"
                        disabled={closed}
                        onClick={() => onCallContact(`${c.name}（${c.relation}）`, c.phone)}
                      >
                        拨打 {c.phone}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="info-card">
              <div className="info-head">🚑 派单与通话记录</div>
              <div className="info-body">
                {data.dispatches.length === 0 && data.calls.length === 0 && (
                  <span style={{ color: '#98a1ae', fontSize: 13 }}>暂无处置动作</span>
                )}
                {data.dispatches.map((d, idx) => (
                  <div className="visit-item" key={idx}>
                    <b>派单：{d.caregiverName}</b>
                    <div style={{ color: '#7a8699', margin: '3px 0' }}>
                      预计 {d.etaMinutes} 分钟到达 · {formatDateTime(d.at)} · {d.by}
                    </div>
                    {d.arrivedAt && (
                      <Tag color="blue">已于 {formatDateTime(d.arrivedAt)} 完成处置</Tag>
                    )}
                  </div>
                ))}
                {data.calls.map((c, idx) => (
                  <div className="contact-item" key={idx}>
                    📞 {c.targetName} · {c.phone}
                    <div style={{ color: '#98a1ae', fontSize: 12 }}>
                      {formatDateTime(c.at)} · {c.by}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 派单弹窗 */}
      <Modal
        title="派护工上门"
        open={dispatchOpen}
        onCancel={() => setDispatchOpen(false)}
        confirmLoading={busy}
        onOk={() =>
          form.validateFields().then((v) =>
            run(
              () =>
                api.dispatch(data.id, {
                  caregiverId: v.caregiverId,
                  etaMinutes: Number(v.etaMinutes),
                  by: v.by || MANAGER,
                }),
              '派单成功，护工将尽快上门',
            ),
          )
        }
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="caregiverId"
            label="值班护工（按片区筛选）"
            rules={[{ required: true, message: '请选择护工' }]}
          >
            <Select
              options={(dutyCaregivers.length ? dutyCaregivers : caregivers).map(
                (c) => ({
                  value: c.id,
                  label: `${c.name} · ${c.title} · ${c.phone}${
                    c.onDuty ? '' : '（休息中）'
                  }`,
                  disabled: !c.onDuty,
                }),
              )}
            />
          </Form.Item>
          <Form.Item name="etaMinutes" label="预计到达（分钟）">
            <Select
              options={[5, 8, 10, 15, 20, 30].map((m) => ({
                value: m,
                label: `${m} 分钟`,
              }))}
            />
          </Form.Item>
          <Form.Item name="by" label="操作人">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 电话弹窗 */}
      <Modal
        title="拨打电话登记"
        open={callOpen}
        onCancel={() => setCallOpen(false)}
        confirmLoading={busy}
        onOk={() =>
          form.validateFields().then((v) =>
            run(
              () => api.logCall(data.id, v),
              '通话动作已登记',
            ),
          )
        }
      >
        <Alert
          style={{ marginBottom: 14 }}
          type="info"
          showIcon
          message="演示环境仅登记拨打动作，生产环境对接云呼叫中心自动录音并回写。"
        />
        <Form form={form} layout="vertical">
          <Form.Item name="target" label="通话对象类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'emergency_contact', label: '紧急联系人' },
                { value: 'elder', label: '老人本人' },
                { value: 'caregiver', label: '上门护工' },
                { value: 'duty', label: '社区值班台' },
              ]}
            />
          </Form.Item>
          <Form.Item name="targetName" label="对象姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话号码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="by" label="拨打人" initialValue={MANAGER}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 误报弹窗 */}
      <Modal
        title="标记误报"
        open={falseOpen}
        onCancel={() => setFalseOpen(false)}
        confirmLoading={busy}
        okButtonProps={{ danger: true }}
        okText="确认误报并关闭"
        onOk={() =>
          form.validateFields().then((v) =>
            run(
              () => api.falseAlarm(data.id, MANAGER, v.reason),
              '事件已按误报关闭',
            ),
          )
        }
      >
        <Alert
          style={{ marginBottom: 14 }}
          type="warning"
          showIcon
          message="误报事件将关闭且不写入健康档案，请先电话核实老人安全。"
        />
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="误报原因 / 核实情况"
            rules={[{ required: true, message: '请填写误报原因' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="如：手环脱落误触发，已电话联系老人确认安全"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 复访弹窗 */}
      <Modal
        title="录入复访结果（将写入老人健康档案）"
        open={revisitOpen}
        width={560}
        onCancel={() => setRevisitOpen(false)}
        confirmLoading={busy}
        okText="提交复访并归档"
        onOk={() =>
          form.validateFields().then((v) =>
            run(
              () =>
                api.revisit(data.id, {
                  by: v.by || MANAGER,
                  outcome: v.outcome,
                  injuryFound: v.injuryFound,
                  measures: v.measures ?? [],
                  hospitalAdvised: v.hospitalAdvised,
                  note: v.note,
                }),
              '复访结果已提交并写入老人健康档案',
            ),
          )
        }
      >
        <Form form={form} layout="vertical" style={{ marginTop: 10 }}>
          <Form.Item name="outcome" label="现场结论" rules={[{ required: true }]}>
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="no_fall">{OUTCOME_LABEL.no_fall}</Radio>
                <Radio value="minor">{OUTCOME_LABEL.minor}</Radio>
                <Radio value="fall_treated">{OUTCOME_LABEL.fall_treated}</Radio>
                <Radio value="fall_hospital">{OUTCOME_LABEL.fall_hospital}</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="injuryFound" valuePropName="checked" label="是否发现伤情">
            <Checkbox>发现外伤 / 疼痛等情况</Checkbox>
          </Form.Item>
          <Form.Item name="measures" label="已采取处置措施（可多选/自定义后由护工补充）">
            <Select
              mode="tags"
              placeholder="如：擦伤消毒包扎、测量血压、冰敷"
              options={[
                { value: '外伤消毒包扎', label: '外伤消毒包扎' },
                { value: '生命体征监测', label: '生命体征监测' },
                { value: '冰敷处理', label: '冰敷处理' },
                { value: '已通知家属', label: '已通知家属' },
                { value: '协助卧床休息', label: '协助卧床休息' },
              ]}
            />
          </Form.Item>
          <Form.Item name="hospitalAdvised" valuePropName="checked">
            <Checkbox>建议 / 已安排送医进一步检查</Checkbox>
          </Form.Item>
          <Form.Item
            name="note"
            label="复访记录"
            rules={[{ required: true, message: '请填写复访情况' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="老人跌倒经过、现场表现、处置与后续安排…"
            />
          </Form.Item>
          <Form.Item name="by" label="记录人">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
