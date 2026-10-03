import {
  Caregiver,
  Elder,
  FallIncident,
  HealthRecord,
  ServiceVisit,
} from '../common/domain';

const now = Date.now();
const iso = (offsetMin: number) =>
  new Date(now - offsetMin * 60_000).toISOString();

export const seedElders: Elder[] = [
  {
    id: 'el-001',
    name: '王秀兰',
    age: 82,
    gender: '女',
    address: '幸福里社区 3 栋 2 单元 501',
    location: '幸福里社区',
    phone: '13800000001',
    avatarColor: '#e8836b',
    riskLevel: 'high',
    conditions: ['高血压', '骨质疏松', '半年前有跌倒史'],
    emergencyContacts: [
      { name: '周建国', relation: '儿子', phone: '13911112222' },
      { name: '周梅', relation: '女儿', phone: '13933334444' },
    ],
  },
  {
    id: 'el-002',
    name: '李长根',
    age: 76,
    gender: '男',
    address: '幸福里社区 5 栋 1 单元 302',
    location: '幸福里社区',
    phone: '13800000002',
    avatarColor: '#5b8def',
    riskLevel: 'medium',
    conditions: ['糖尿病', '膝关节炎'],
    emergencyContacts: [
      { name: '李晓', relation: '女儿', phone: '13755556666' },
    ],
  },
  {
    id: 'el-003',
    name: '张桂芳',
    age: 88,
    gender: '女',
    address: '和平里社区 12 栋 3 单元 601',
    location: '和平里社区',
    phone: '13800000003',
    avatarColor: '#7ab87a',
    riskLevel: 'high',
    conditions: ['冠心病', '行动不便，日常使用助行器'],
    emergencyContacts: [
      { name: '陈军', relation: '孙子', phone: '13677778888' },
    ],
  },
];

export const seedCaregivers: Caregiver[] = [
  {
    id: 'cg-001',
    name: '刘护',
    phone: '15012340001',
    title: '高级养老护工',
    onDuty: true,
    zones: ['幸福里社区'],
  },
  {
    id: 'cg-002',
    name: '赵护',
    phone: '15012340002',
    title: '养老护理员',
    onDuty: true,
    zones: ['幸福里社区', '和平里社区'],
  },
  {
    id: 'cg-003',
    name: '孙护',
    phone: '15012340003',
    title: '康复护理员',
    onDuty: false,
    zones: ['和平里社区'],
  },
];

export const seedVisits: ServiceVisit[] = [
  {
    id: 'v-001',
    elderId: 'el-001',
    caregiverId: 'cg-001',
    caregiverName: '刘护',
    serviceType: '居家助浴 + 用药提醒',
    visitedAt: iso(26 * 60),
    note: '王奶奶状态正常，提醒过浴室防滑垫已铺好；降压药已服用。',
  },
  {
    id: 'v-002',
    elderId: 'el-001',
    caregiverId: 'cg-001',
    caregiverName: '刘护',
    serviceType: '上门巡访',
    visitedAt: iso(3 * 24 * 60),
    note: '测量血压 148/92，建议清淡饮食，家属已知情。',
  },
  {
    id: 'v-003',
    elderId: 'el-002',
    caregiverId: 'cg-002',
    caregiverName: '赵护',
    serviceType: '血糖监测',
    visitedAt: iso(50 * 60),
    note: '空腹血糖 7.2，膝盖贴敷了膏药，无异常。',
  },
  {
    id: 'v-004',
    elderId: 'el-003',
    caregiverId: 'cg-002',
    caregiverName: '赵护',
    serviceType: '康复训练陪练',
    visitedAt: iso(6 * 24 * 60),
    note: '助行器使用训练 30 分钟，家属在场。',
  },
];

const sla = Number(process.env.FALL_ACK_SLA_SECONDS ?? 180);

export const seedIncidents: FallIncident[] = [
  {
    id: 'in-1001',
    code: 'FALL-2610-1001',
    elderId: 'el-001',
    source: 'wristband',
    status: 'pending',
    address: '幸福里社区 3 栋 2 单元 501（卫生间）',
    locationDetail: '卫生间',
    occurredAt: iso(2),
    createdAt: iso(2),
    sensorConfidence: 92,
    slaSeconds: sla,
    calls: [],
    dispatches: [],
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        at: iso(2),
        actor: '老人手环',
        detail: '手环检测到疑似跌倒，置信度 92%',
      },
    ],
  },
  {
    id: 'in-1002',
    code: 'FALL-2610-1002',
    elderId: 'el-002',
    source: 'family',
    status: 'dispatched',
    address: '幸福里社区小广场步道',
    locationDetail: '小广场步道长椅旁',
    occurredAt: iso(35),
    createdAt: iso(34),
    acknowledgedAt: iso(31),
    acknowledgedBy: '管家 林敏',
    reporterName: '李晓',
    reporterPhone: '13755556666',
    slaSeconds: sla,
    calls: [
      {
        at: iso(30),
        target: 'emergency_contact',
        targetName: '李晓（女儿）',
        phone: '13755556666',
        by: '管家 林敏',
      },
    ],
    dispatches: [
      {
        caregiverId: 'cg-002',
        caregiverName: '赵护',
        at: iso(29),
        by: '管家 林敏',
        etaMinutes: 8,
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        at: iso(34),
        actor: '家属 李晓',
        detail: '家属通过 H5 上报：老人在小广场摔倒，意识清醒',
      },
      { id: 'tl-2', type: 'acknowledged', at: iso(31), actor: '管家 林敏' },
      {
        id: 'tl-3',
        type: 'called',
        at: iso(30),
        actor: '管家 林敏',
        detail: '致电女儿 李晓 13755556666',
      },
      {
        id: 'tl-4',
        type: 'dispatched',
        at: iso(29),
        actor: '管家 林敏',
        detail: '派单护工 赵护，预计 8 分钟到达',
      },
    ],
  },
  {
    id: 'in-1003',
    code: 'FALL-2610-1003',
    elderId: 'el-003',
    source: 'wristband',
    status: 'revisited',
    address: '和平里社区 12 栋 3 单元 601（客厅）',
    locationDetail: '客厅',
    occurredAt: iso(60 * 26),
    createdAt: iso(60 * 26),
    acknowledgedAt: iso(60 * 26 - 3),
    acknowledgedBy: '管家 林敏',
    resolvedAt: iso(60 * 25),
    sensorConfidence: 87,
    slaSeconds: sla,
    calls: [],
    dispatches: [
      {
        caregiverId: 'cg-002',
        caregiverName: '赵护',
        at: iso(60 * 26 - 4),
        by: '管家 林敏',
        etaMinutes: 10,
        arrivedAt: iso(60 * 26 - 14),
      },
    ],
    revisit: {
      outcome: 'minor',
      injuryFound: true,
      measures: ['右肘擦伤已消毒包扎', '生命体征平稳', '已通知家属'],
      hospitalAdvised: false,
      note: '老人起身时绊倒，右肘轻微擦伤，处置后在家休息，护工 24 小时后复访。',
      caregiverName: '赵护',
      by: '管家 林敏',
      at: iso(60 * 25),
    },
    timeline: [
      {
        id: 'tl-1',
        type: 'created',
        at: iso(60 * 26),
        actor: '老人手环',
        detail: '手环检测到疑似跌倒，置信度 87%',
      },
      {
        id: 'tl-2',
        type: 'acknowledged',
        at: iso(60 * 26 - 3),
        actor: '管家 林敏',
      },
      {
        id: 'tl-3',
        type: 'dispatched',
        at: iso(60 * 26 - 4),
        actor: '管家 林敏',
        detail: '派单护工 赵护',
      },
      {
        id: 'tl-4',
        type: 'revisited',
        at: iso(60 * 25),
        actor: '管家 林敏',
        detail: '复访完成：轻微擦伤，已处置',
      },
    ],
  },
];

export const seedHealthRecords: HealthRecord[] = [
  {
    id: 'hr-001',
    elderId: 'el-003',
    incidentId: 'in-1003',
    incidentCode: 'FALL-2610-1003',
    type: 'fall',
    title: '跌倒复访：客厅绊倒，右肘轻微擦伤',
    content:
      '老人起身时绊倒，右肘轻微擦伤，已消毒包扎；生命体征平稳，无需送医；已通知家属，护工 24 小时后复访。',
    measures: ['右肘擦伤已消毒包扎', '生命体征平稳', '已通知家属'],
    hospitalAdvised: false,
    outcome: 'minor',
    createdAt: iso(60 * 25),
    caregiverName: '赵护',
    recorderName: '管家 林敏',
  },
];
