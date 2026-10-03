import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  Mask,
  Result,
  TextArea,
  Toast,
} from 'antd-mobile';
import { api } from '../../api/client';
import type { Elder, IncidentDetail, IncidentSummary } from '../../api/types';
import { STATUS_META } from '../../api/types';
import { formatDateTime, relativeFromNow } from '../../utils/format';
import { usePolling } from '../../utils/usePolling';

export default function ReportPage() {
  const navigate = useNavigate();
  const [elders, setElders] = useState<Elder[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<IncidentDetail | null>(null);
  const [recent, setRecent] = useState<IncidentSummary[]>([]);

  useEffect(() => {
    api.elders().then((list) => {
      setElders(list);
      setSelected(list[0]?.id ?? '');
    });
  }, []);

  usePolling(() => {
    api.listIncidents().then(setRecent).catch(() => undefined);
  }, 8000);

  const elder = useMemo(
    () => elders.find((e) => e.id === selected),
    [elders, selected],
  );

  const openForm = () => {
    if (!elder) {
      Toast.show('暂无可上报的老人');
      return;
    }
    setAddress(elder.address);
    setNote('');
    setShowForm(true);
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      Toast.show('当前设备不支持定位，可手动填写位置');
      return;
    }
    Toast.show({ content: '正在获取定位…', duration: 1000 });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setAddress(
          `${elder?.address ?? ''}（GPS ${latitude.toFixed(5)}, ${longitude.toFixed(
            5,
          )}，精度约 ${Math.round(accuracy)}m）`,
        );
      },
      () => Toast.show('定位失败，请手动填写位置'),
    );
  };

  const submit = async () => {
    if (!address.trim()) {
      Toast.show('请填写老人摔倒位置');
      return;
    }
    setSubmitting(true);
    try {
      const detail = await api.createIncident({
        elderId: elder!.id,
        source: 'family',
        address: address.trim(),
        reporterName: '家属',
        note: note.trim() || undefined,
      });
      setShowForm(false);
      setCreated(detail);
    } catch (e) {
      Toast.show((e as Error).message || '上报失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="h5-header">
        <div className="h5-title">
          ❤ 跌倒一键上报
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              fontWeight: 400,
              opacity: 0.9,
            }}
            onClick={() => navigate('/')}
          >
            切换入口 ›
          </span>
        </div>
        <div className="h5-sub">
          发现老人疑似摔倒请立即上报，管家将在 3 分钟内确认处置；
          手环也会自动识别并同步到预警工作台。
        </div>
      </div>

      <div className="sos-card">
        <button className="sos-btn" onClick={openForm}>
          <span className="sos-icon">🆘</span>
          老人疑似摔倒
          <span className="sos-small">点按立即上报 · 管家实时响应</span>
        </button>
        <div className="sos-tip">误报可在管家端随时撤销，不会造成任何影响</div>
      </div>

      <div className="h5-body">
        <div className="h5-section-title">👵 选择要上报的老人</div>
        <div className="elder-pick">
          {elders.map((e) => (
            <div
              key={e.id}
              className={`elder-chip ${selected === e.id ? 'active' : ''}`}
              onClick={() => setSelected(e.id)}
            >
              <div className="avatar" style={{ background: e.avatarColor }}>
                {e.name.slice(0, 1)}
              </div>
              <div className="e-name">{e.name}</div>
              <div className="e-meta">
                {e.gender} · {e.age} 岁
                <br />
                {e.location}
              </div>
            </div>
          ))}
        </div>

        <div className="h5-section-title">🕓 近期上报记录</div>
        {recent.filter((i) => i.source === 'family').slice(0, 5).length === 0 && (
          <div style={{ color: '#a2abb7', fontSize: 13, padding: '6px 2px' }}>
            暂无上报记录
          </div>
        )}
        {recent
          .filter((i) => i.source === 'family')
          .slice(0, 5)
          .map((i) => (
            <div
              className="track-card"
              key={i.id}
              onClick={() => navigate(`/h5/incident/${i.id}`)}
            >
              <div className="track-head">
                <div>
                  <div className="t-name">{i.elderName}</div>
                  <div className="t-code">{i.code}</div>
                </div>
                <span
                  className="badge"
                  style={{ background: STATUS_META[i.status].color }}
                >
                  {STATUS_META[i.status].label}
                </span>
              </div>
              <div className="track-meta">📍 {i.elderAddress}</div>
              <div className="track-foot">
                <span>{formatDateTime(i.createdAt)}</span>
                <span>{relativeFromNow(i.createdAt)}</span>
              </div>
            </div>
          ))}
      </div>

      <Dialog
        visible={showForm}
        title="上报疑似摔倒"
        content={
          <div style={{ paddingTop: 10 }}>
            <div
              style={{
                fontSize: 13,
                color: '#5b6573',
                marginBottom: 10,
                lineHeight: 1.6,
              }}
            >
              老人：<b>{elder?.name}</b>（{elder?.gender} · {elder?.age} 岁）
              <br />
              上报后事件将进入管家预警工作台
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: '8px 0 6px',
              }}
            >
              摔倒位置
            </div>
            <TextArea
              placeholder="如：家中卫生间 / 小区花园步道"
              value={address}
              onChange={setAddress}
              rows={2}
              maxLength={120}
            />
            <Button
              size="small"
              fill="outline"
              style={{ marginTop: 8, '--border-color': '#e8765f' }}
              onClick={useGps}
            >
              📡 使用当前定位补充
            </Button>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: '12px 0 6px',
              }}
            >
              现场情况（选填）
            </div>
            <TextArea
              placeholder="如：老人意识清醒，说腿有点疼"
              value={note}
              onChange={setNote}
              rows={3}
              maxLength={200}
            />
          </div>
        }
        closeOnAction
        actions={[
          [
            {
              key: 'cancel',
              text: '取消',
            },
            {
              key: 'confirm',
              text: submitting ? '提交中…' : '确认上报',
              bold: true,
              danger: true,
              disabled: submitting,
              onClick: submit,
            },
          ],
        ]}
      />

      {created && (
        <Mask visible={true} onMaskClick={() => setCreated(null)}>
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              margin: '60px 20px',
              padding: '8px 12px 20px',
            }}
          >
            <Result
              status="success"
              title="上报成功"
              description={
                <div style={{ lineHeight: 1.8 }}>
                  事件编号 <b>{created.code}</b>
                  <br />
                  管家将在 {created.slaSeconds} 秒内确认
                  <br />
                  可在「处置进度」中实时查看
                </div>
              }
            />
            <div style={{ display: 'flex', gap: 10, padding: '0 8px' }}>
              <Button
                block
                fill="outline"
                onClick={() => setCreated(null)}
              >
                返回首页
              </Button>
              <Button
                block
                color="danger"
                onClick={() => navigate(`/h5/incident/${created.id}`)}
              >
                查看处置进度
              </Button>
            </div>
          </div>
        </Mask>
      )}
    </>
  );
}
