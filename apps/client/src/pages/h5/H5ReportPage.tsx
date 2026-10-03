import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  ErrorBlock,
  Form,
  Picker,
  Selector,
  Space,
  TextArea,
  Toast,
} from 'antd-mobile';
import { api, type Elder } from '../../api';
import './h5.less';

const LOCATION_PRESETS = ['客厅', '卧室', '卫生间', '厨房', '小区花园', '楼道/电梯'];

export default function H5ReportPage() {
  const navigate = useNavigate();
  const [elders, setElders] = useState<(Elder & { contacts: unknown[] })[]>([]);
  const [elderId, setElderId] = useState<string>('');
  const [source, setSource] = useState<'wristband' | 'family'>('family');
  const [location, setLocation] = useState('客厅');
  const [locationExtra, setLocationExtra] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [note, setNote] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listElders().then(setElders).catch(() => Toast.show('老人档案加载失败'));
  }, []);

  const selected = useMemo(() => elders.find((e) => e.id === elderId), [elders, elderId]);

  const submit = async (): Promise<void> => {
    if (!elderId) {
      Toast.show('请选择老人');
      return;
    }
    if (!location.trim()) {
      Toast.show('请填写跌倒位置');
      return;
    }
    setSubmitting(true);
    try {
      const detail = await api.reportAlert({
        elderId,
        source,
        location,
        locationDetail:
          source === 'wristband'
            ? `手环自动定位：${location}`
            : `家属上报位置：${location}`,
        reporterName: source === 'family' ? reporterName || '家属' : undefined,
        reporterNote: note || undefined,
      });
      Toast.show({ icon: 'success', content: '已上报，管家即将处理' });
      navigate(`/h5/status/${detail.alert.id}`);
    } catch (e) {
      Toast.show((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (elders.length === 0) {
    return (
      <div className="h5-page">
        <ErrorBlock status="empty" title="暂无老人档案" />
      </div>
    );
  }

  return (
    <div className="h5-page">
      <div className="h5-header">
        <div className="h5-header-title">
          <span className="h5-sos-badge">SOS</span>
          疑似跌倒上报
        </div>
        <div className="h5-header-sub">提交后管家将在规定时限内确认，请保持电话畅通</div>
      </div>

      <Space direction="vertical" block style={{ '--gap': '12px' }}>
        <Card className="h5-card" title="1. 上报方式">
          <Selector
            options={[
              { label: '⌚ 手环自动检测', value: 'wristband' },
              { label: '👪 家属人工上报', value: 'family' },
            ]}
            value={[source]}
            onChange={(v) => v[0] && setSource(v[0] as 'wristband' | 'family')}
          />
        </Card>

        <Card className="h5-card" title="2. 老人">
          <div className="h5-elder-pick" onClick={() => setPickerVisible(true)}>
            {selected ? (
              <div className="h5-elder-row">
                <span
                  className="elder-avatar"
                  style={{ background: selected.photoColor, width: 38, height: 38, fontSize: 14 }}
                >
                  {selected.name.slice(0, 1)}
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>{selected.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {selected.age} 岁 · {selected.address}
                  </div>
                </div>
              </div>
            ) : (
              <span className="muted">请选择需要帮助的老人</span>
            )}
            <span className="h5-chevron">›</span>
          </div>
        </Card>

        <Card className="h5-card" title="3. 跌倒位置">
          <Selector
            options={LOCATION_PRESETS.map((l) => ({ label: l, value: l }))}
            value={[location]}
            onChange={(v) => v[0] && setLocation(v[0] as string)}
          />
          <Form style={{ marginTop: 10 }}>
            <Form.Item label="位置补充">
              <input
                className="h5-input"
                placeholder="如：卫生间马桶旁 / 花园长椅附近"
                value={locationExtra}
                onChange={(e) => setLocationExtra(e.target.value)}
              />
            </Form.Item>
          </Form>
        </Card>

        {source === 'family' && (
          <Card className="h5-card" title="4. 家属信息与现场情况（选填）">
            <input
              className="h5-input"
              placeholder="您的称呼 / 与老人关系，如：女儿 李娜"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
            />
            <TextArea
              style={{ marginTop: 10 }}
              placeholder="老人现在是否清醒？有没有外伤？是否能自行站起？"
              rows={3}
              value={note}
              onChange={setNote}
            />
          </Card>
        )}

        <Button
          block
          color="danger"
          size="large"
          loading={submitting}
          onClick={submit}
          className="h5-submit"
        >
          立即上报
        </Button>
        <div className="h5-tip">
          * 若情况危急请同时拨打 120；误报也可在管家联系时说明，不会影响老人服务记录。
        </div>
      </Space>

      <Picker
        visible={pickerVisible}
        columns={[elders.map((e) => ({ label: `${e.name}（${e.age}岁 · ${e.community}）`, value: e.id }))]}
        value={elderId ? [elderId] : []}
        onClose={() => setPickerVisible(false)}
        onConfirm={(v) => {
          setElderId(v[0] as string);
          setPickerVisible(false);
        }}
      />
    </div>
  );
}
