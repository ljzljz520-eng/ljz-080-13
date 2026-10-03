import { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
  message,
} from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import { api, type AlertDetail, type Worker } from '../../api';
import { CALL_RESULT_META } from '../../styles/status';

interface ModalProps {
  open: boolean;
  detail: AlertDetail;
  onClose: () => void;
  onDone: (d: AlertDetail) => void;
}

/* ---------------- 派护工 ---------------- */
export function DispatchModal({ open, detail, onClose, onDone }: ModalProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerId, setWorkerId] = useState<string>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      api.workers().then((ws) => {
        setWorkers(ws);
        const preferred =
          detail.lastVisit?.workerName
            ? ws.find((w) => w.name === detail.lastVisit?.workerName)?.id
            : undefined;
        setWorkerId(detail.worker?.id ?? preferred ?? ws.find((w) => w.status !== 'off_duty')?.id ?? '');
      });
    }
  }, [open, detail]);

  const submit = async () => {
    if (!workerId) return message.warning('请选择护工');
    setLoading(true);
    try {
      onDone(await api.dispatch(detail.alert.id, { workerId, note }));
      message.success('已派单，护工将尽快上门');
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="派遣护工上门" open={open} onCancel={onClose} onOk={submit} confirmLoading={loading} okText="确认派单" cancelText="取消">
      <Form layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item label="选择护工（按距离 / 状态推荐）" required>
          <Radio.Group
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
          >
            {workers.map((w) => (
              <Radio key={w.id} value={w.id} className="worker-radio" style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <span>
                    <b>{w.name}</b>
                    <span className="muted" style={{ marginLeft: 8 }}>
                      {w.title}
                    </span>
                  </span>
                  <Space>
                    <Tag color={w.status === 'idle' ? 'green' : w.status === 'on_duty' ? 'blue' : 'default'}>
                      {w.status === 'idle' ? '空闲' : w.status === 'on_duty' ? '服务中' : '休息'}
                    </Tag>
                    <span className="muted" style={{ fontSize: 12 }}>
                      📍 {w.currentArea}
                    </span>
                  </Space>
                </Space>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item label="派单备注">
          <Input.TextArea
            rows={2}
            placeholder="如：老人半失能，请携带防滑转移垫；优先从最近楼栋进入"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ---------------- 拨打电话 ---------------- */
export function CallModal({ open, detail, onClose, onDone }: ModalProps) {
  const [targetType, setTargetType] = useState<'elder' | 'contact' | 'worker' | 'duty'>('contact');
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<'connected' | 'no_answer' | 'busy' | 'voicemail'>('connected');
  const [durationSec, setDurationSec] = useState(60);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const c = detail.contacts[0];
      setTargetType(c ? 'contact' : 'elder');
      setTarget(c ? c.phone : detail.elder.phone);
      setResult('connected');
      setDurationSec(60);
      setNote('');
    }
  }, [open, detail]);

  const presetTargets = [
    { value: 'elder', label: `老人本人 ${detail.elder.name}`, phone: detail.elder.phone },
    ...detail.contacts.map((c) => ({
      value: 'contact' as const,
      label: `${c.name}（${c.relation}）`,
      phone: c.phone,
    })),
    ...(detail.worker
      ? [{ value: 'worker' as const, label: `上门护工 ${detail.worker.name}`, phone: detail.worker.phone }]
      : []),
    { value: 'duty', label: '社区值班台', phone: '0571-12349' },
  ];

  const submit = async () => {
    if (!target.trim()) return message.warning('请填写拨打号码');
    setLoading(true);
    try {
      onDone(
        await api.call(detail.alert.id, { targetType, target, result, durationSec, note }),
      );
      message.success('通话结果已登记');
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <PhoneOutlined style={{ color: '#6d28d9' }} /> 拨打电话
        </span>
      }
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={loading}
      okText="登记通话结果"
      cancelText="取消"
    >
      <Form layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item label="拨打对象">
          <Select
            value={`${targetType}:${target}`}
            onChange={(v) => {
              const [type, phone] = v.split(':');
              setTargetType(type as typeof targetType);
              setTarget(phone);
            }}
            options={presetTargets.map((t) => ({
              value: `${t.value}:${t.phone}`,
              label: `${t.label} · ${t.phone}`,
            }))}
          />
        </Form.Item>
        <Form.Item label="号码">
          <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="电话号码" />
        </Form.Item>
        <Form.Item label="接通结果">
          <Radio.Group
            value={result}
            onChange={(e) => setResult(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            {Object.entries(CALL_RESULT_META).map(([k, v]) => (
              <Radio.Button key={k} value={k} style={result === k ? { background: v.color, borderColor: v.color } : undefined}>
                {v.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item label="通话时长（秒）">
          <Input type="number" min={0} value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} />
        </Form.Item>
        <Form.Item label="沟通要点">
          <Input.TextArea
            rows={2}
            placeholder="如：家属 5 分钟内到家；老人意识清醒，臀部疼痛无法站立"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ---------------- 标记误报 ---------------- */
export function FalseAlarmModal({ open, detail, onClose, onDone }: ModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const submit = async () => {
    if (!reason.trim()) return message.warning('请填写误报原因（用于校准手环灵敏度）');
    setLoading(true);
    try {
      onDone(await api.falseAlarm(detail.alert.id, reason));
      message.success('已标记误报并结案');
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="标记为误报" open={open} onCancel={onClose} onOk={submit} confirmLoading={loading} okText="确认误报" okButtonProps={{ danger: true }} cancelText="取消">
      <p className="muted" style={{ marginTop: 8 }}>
        标记后事件关闭，不会产生护工单；误报原因会用于优化 <b>{detail.elder.name}</b> 手环的跌倒识别灵敏度。
      </p>
      <Input.TextArea
        rows={3}
        placeholder="如：老人只是坐下动作较大，电话确认本人无碍"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Modal>
  );
}

/* ---------------- 复访结案（写入健康档案） ---------------- */
export function ResolveModal({ open, detail, onClose, onDone }: ModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        revisitResult: detail.alert.revisitResult ?? 'minor_injury',
        revisitedBy: detail.worker?.name ?? '',
        revisitNote: detail.alert.revisitNote ?? '',
      });
    }
  }, [open, detail, form]);

  const submit = async () => {
    const v = await form.validateFields();
    setLoading(true);
    try {
      onDone(
        await api.resolve(detail.alert.id, {
          revisitResult: v.revisitResult,
          revisitedBy: v.revisitedBy,
          revisitNote: v.revisitNote,
        }),
      );
      message.success('复访结果已写入老人健康档案，事件结案');
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="复访结果登记并结案"
      open={open}
      onCancel={onClose}
      width={560}
      onOk={submit}
      confirmLoading={loading}
      okText="提交并写入健康档案"
      cancelText="取消"
    >
      <div
        style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: 8,
          padding: '8px 12px',
          margin: '12px 0 4px',
          fontSize: 12.8,
          color: '#0369a1',
        }}
      >
        ℹ️ 提交后复访结论将同步写入 {detail.elder.name} 的健康档案，作为后续照护依据，不只是一条消息。
      </div>
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="revisitResult" label="复访结论" rules={[{ required: true }]}>
          <Radio.Group>
            <Space direction="vertical">
              <Radio value="no_fall">未发生跌倒（有惊无险）</Radio>
              <Radio value="confirmed_fall">确认跌倒，无明显外伤</Radio>
              <Radio value="minor_injury">轻微受伤（擦伤 / 淤青等）</Radio>
              <Radio value="serious_injury">严重受伤（骨折 / 头部撞击等）</Radio>
              <Radio value="hospitalized">已送医 / 已通知 120</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="revisitedBy" label="复访人" rules={[{ required: true, message: '请填写复访人' }]}>
          <Input placeholder="上门护工 / 管家姓名" />
        </Form.Item>
        <Form.Item
          name="revisitNote"
          label="复访说明（将原文写入健康档案）"
          rules={[{ required: true, message: '复访说明必填' }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="现场情况、生命体征、已采取的处置、用药 / 就医建议、家属是否到场……"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
