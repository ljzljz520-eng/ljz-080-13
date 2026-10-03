import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Empty, List, Tag } from 'antd';
import { api } from '../../api/client';
import type {
  Elder,
  ElderProfile,
  HealthRecord,
} from '../../api/types';
import { OUTCOME_LABEL } from '../../api/types';
import { formatDateTime } from '../../utils/format';

const RISK: Record<string, { text: string; color: string }> = {
  high: { text: '高风险', color: 'red' },
  medium: { text: '中风险', color: 'orange' },
  low: { text: '低风险', color: 'green' },
};

export default function Records() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const elderId = params.get('elder');
  const [elders, setElders] = useState<Elder[]>([]);
  const [profile, setProfile] = useState<ElderProfile | null>(null);
  const [allRecords, setAllRecords] = useState<HealthRecord[]>([]);

  useEffect(() => {
    api.elders().then(setElders).catch(() => undefined);
    api.healthRecords().then(setAllRecords).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (elderId) {
      api.elderProfile(elderId).then(setProfile).catch(() => undefined);
    }
  }, [elderId]);

  const shownProfile = elderId && profile?.elder.id === elderId ? profile : null;

  const elderMap = useMemo(
    () => new Map(elders.map((e) => [e.id, e])),
    [elders],
  );

  return (
    <>
      <header className="admin-topbar">
        <div className="page-title">📁 老人健康档案</div>
        <div className="top-right">
          跌倒复访结果会自动归档，作为后续照护依据
        </div>
      </header>
      <div className="admin-content" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div className="panel" style={{ width: 260, flexShrink: 0 }}>
          <div className="panel-head">
            <span className="panel-title">服务老人</span>
          </div>
          <List
            dataSource={elders}
            renderItem={(e) => (
              <List.Item
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: elderId === e.id ? '#eef8f7' : undefined,
                  borderLeft:
                    elderId === e.id ? '3px solid #0e7c86' : '3px solid transparent',
                }}
                onClick={() => setParams({ elder: e.id })}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: e.avatarColor,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {e.name.slice(0, 1)}
                    </div>
                  }
                  title={
                    <span>
                      {e.name}
                      <Tag
                        color={RISK[e.riskLevel].color}
                        style={{ marginLeft: 6 }}
                      >
                        {RISK[e.riskLevel].text}
                      </Tag>
                    </span>
                  }
                  description={
                    <span style={{ fontSize: 12 }}>
                      {e.gender} · {e.age} 岁 · {e.location}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!shownProfile ? (
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">全部跌倒健康记录</span>
                <span className="panel-sub">
                  共 {allRecords.length} 条，均来自已完成复访的跌倒预警事件
                </span>
              </div>
              <div style={{ padding: 18 }}>
                {allRecords.length === 0 && (
                  <Empty description="暂无健康记录，复访完成后自动生成" />
                )}
                {allRecords.map((r) => (
                  <div className="health-record" key={r.id}>
                    <div className="hr-title">
                      {elderMap.get(r.elderId)?.name ?? '老人'} · {r.title}
                    </div>
                    <div className="hr-meta">
                      {r.incidentCode} · {formatDateTime(r.createdAt)} · 上门护工
                      {r.caregiverName} / 记录人 {r.recorderName}
                    </div>
                    <div className="hr-content">
                      {r.content}
                      <div style={{ marginTop: 8 }}>
                        <Tag color="cyan">{OUTCOME_LABEL[r.outcome]}</Tag>
                        {r.hospitalAdvised && <Tag color="red">建议送医</Tag>}
                        {r.measures.map((m) => (
                          <Tag key={m}>{m}</Tag>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="info-card">
                <div className="info-head">
                  <span>👵 {shownProfile.elder.name} 的档案</span>
                  <Tag color={RISK[shownProfile.elder.riskLevel].color} style={{ marginLeft: 6 }}>
                    {RISK[shownProfile.elder.riskLevel].text}
                  </Tag>
                  <Button
                    size="small"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setParams({})}
                  >
                    返回全部记录
                  </Button>
                </div>
                <div className="info-body" style={{ lineHeight: 2 }}>
                  <div>
                    <b>基本信息：</b>
                    {shownProfile.elder.gender} · {shownProfile.elder.age} 岁 ·{' '}
                    {shownProfile.elder.address} · 联系电话 {shownProfile.elder.phone}
                  </div>
                  <div>
                    <b>基础病 / 注意事项：</b>
                    {shownProfile.elder.conditions.join('、')}
                  </div>
                  <div>
                    <b>紧急联系人：</b>
                    {shownProfile.elder.emergencyContacts
                      .map((c) => `${c.name}（${c.relation}）${c.phone}`)
                      .join('；')}
                  </div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-head">
                  📋 跌倒与复访记录（{shownProfile.records.length}）
                </div>
                <div className="info-body">
                  {shownProfile.records.length === 0 && (
                    <Empty description="暂无跌倒记录" />
                  )}
                  {shownProfile.records.map((r) => (
                    <div className="health-record" key={r.id}>
                      <div className="hr-title">{r.title}</div>
                      <div className="hr-meta">
                        关联事件 {r.incidentCode} · {formatDateTime(r.createdAt)} ·
                        护工 {r.caregiverName} / {r.recorderName}
                      </div>
                      <div className="hr-content">
                        {r.content}
                        <div style={{ marginTop: 8 }}>
                          <Tag color="cyan">{OUTCOME_LABEL[r.outcome]}</Tag>
                          {r.hospitalAdvised && <Tag color="red">建议送医</Tag>}
                          {r.measures.map((m) => (
                            <Tag key={m}>{m}</Tag>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="small"
                        type="link"
                        style={{ padding: '4px 0 0' }}
                        onClick={() =>
                          navigate(`/admin/incidents/${r.incidentId}`)
                        }
                      >
                        查看原始事件处置过程 ›
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-card">
                <div className="info-head">
                  🧹 近期上门服务（{shownProfile.visits.length}）
                </div>
                <div className="info-body">
                  {shownProfile.visits.map((v) => (
                    <div className="visit-item" key={v.id}>
                      <div style={{ fontWeight: 700 }}>{v.serviceType}</div>
                      <div style={{ color: '#7a8699', margin: '3px 0' }}>
                        {formatDateTime(v.visitedAt)} · {v.caregiverName}
                      </div>
                      <div>{v.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
