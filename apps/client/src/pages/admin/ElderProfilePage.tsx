import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Segmented,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { api, type ElderProfile } from '../../api';
import { formatTime, relativeFromNow } from '../../utils';
import './elder.less';

const RECORD_META: Record<string, { label: string; color: string }> = {
  fall: { label: '跌倒/复访', color: 'red' },
  chronic: { label: '慢病', color: 'orange' },
  checkup: { label: '体检', color: 'blue' },
  note: { label: '备注', color: 'default' },
};

export default function ElderProfilePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ElderProfile | null>(null);
  const [tab, setTab] = useState<'records' | 'visits'>('records');

  const load = useCallback(async () => {
    setProfile(await api.elderProfile(id));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  const { elder, contacts, visits, records } = profile;

  return (
    <div className="elder-page">
      <header className="detail-topbar">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')}>
            返回工作台
          </Button>
          <span className="mono-id">{elder.id}</span>
        </Space>
      </header>

      <div className="page">
        <Card className="card elder-hero">
          <Space size={18} align="start">
            <span className="elder-avatar" style={{ width: 64, height: 64, fontSize: 24, background: elder.photoColor }}>
              {elder.name.slice(0, 1)}
            </span>
            <div>
              <Space>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {elder.name}
                </Typography.Title>
                <Tag>{elder.gender === 'female' ? '女' : '男'} · {elder.age} 岁</Tag>
                <Tag color="purple">护理等级：{['', '自理', '半失能', '失能'][elder.careLevel]}</Tag>
              </Space>
              <Descriptions column={2} style={{ marginTop: 12 }} size="small">
                <Descriptions.Item label="居住地址">{elder.address}</Descriptions.Item>
                <Descriptions.Item label="所属社区">{elder.community}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{elder.phone}</Descriptions.Item>
                <Descriptions.Item label="紧急联系人">
                  {contacts.map((c) => `${c.name}（${c.relation}）${c.phone}`).join('；') || '未登记'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </Space>
        </Card>

        <div className="elder-tabs">
          <Segmented
            value={tab}
            onChange={(v) => setTab(v as 'records' | 'visits')}
            options={[
              { label: `🩺 健康档案（${records.length}）`, value: 'records' },
              { label: `🧑‍⚕️ 上门服务（${visits.length}）`, value: 'visits' },
            ]}
          />
        </div>

        {tab === 'records' && (
          <div className="record-list">
            {records.length === 0 && <Empty description="暂无健康档案" style={{ padding: 60 }} />}
            {records.map((r) => (
              <Card key={r.id} className="card record-card">
                <div className="record-head">
                  <Space>
                    <FileTextOutlined style={{ color: '#cf1322' }} />
                    <b>{r.title}</b>
                    <Tag color={RECORD_META[r.type]?.color}>{RECORD_META[r.type]?.label ?? r.type}</Tag>
                    {r.alertId && <Tag color="geekblue">来源于跌倒预警复访</Tag>}
                  </Space>
                  <span className="muted">
                    {formatTime(r.createdAt)} · {r.author}
                  </span>
                </div>
                <Typography.Paragraph
                  style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', color: '#3d4655' }}
                >
                  {r.content}
                </Typography.Paragraph>
              </Card>
            ))}
          </div>
        )}

        {tab === 'visits' && (
          <Card className="card">
            {visits.length === 0 ? (
              <Empty description="暂无上门服务记录" />
            ) : (
              <Timeline
                items={visits.map((v) => ({
                  children: (
                    <div>
                      <Space>
                        <b>{v.serviceType}</b>
                        <Tag color="cyan">{v.workerName}</Tag>
                        <span className="muted">
                          {formatTime(v.visitedAt)}（{relativeFromNow(v.visitedAt)}）
                        </span>
                      </Space>
                      <div style={{ color: '#3d4655', marginTop: 4 }}>{v.note}</div>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
