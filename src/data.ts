export type Risk = '低' | '中' | '高'

export interface SlackPlan {
  id: string
  name: string
  minutes: number
  risk: Risk
  scene: string
  cover: string
  note: string
}

export const plans: SlackPlan[] = [
  {
    id: 'p01',
    name: '战术性发呆',
    minutes: 12,
    risk: '低',
    scene: '工位 · 靠窗',
    cover: '在梳理架构',
    note: '视线停在窗外第三棵树，不要看手机。有人经过时缓慢眨眼。',
  },
  {
    id: 'p02',
    name: '带薪如厕',
    minutes: 18,
    risk: '低',
    scene: '卫生间',
    cover: '肠胃不适',
    note: '只带手机，不带工牌。回来时洗手时间略长一点。',
  },
  {
    id: 'p03',
    name: '假装在编译',
    minutes: 25,
    risk: '低',
    scene: '工位 · 双屏',
    cover: '等构建跑完',
    note: '终端里滚一份长日志，不要停。进度条最好卡在 87%。',
  },
  {
    id: 'p04',
    name: '会议隐身',
    minutes: 40,
    risk: '中',
    scene: '线上会议室',
    cover: '旁听需求对齐',
    note: '静音、关摄像头，名字后面加「（听）」。每十分钟点一次头。',
  },
  {
    id: 'p05',
    name: '咖啡续杯',
    minutes: 9,
    risk: '低',
    scene: '茶水间',
    cover: '补充咖啡因',
    note: '绕远路走，路线里至少经过一次落地窗。杯子只装七分满。',
  },
  {
    id: 'p06',
    name: '打印室沉思',
    minutes: 7,
    risk: '低',
    scene: '打印区',
    cover: '等打印件',
    note: '只打一页。站在机器前，听它工作，像在等一个不重要的结果。',
  },
  {
    id: 'p07',
    name: '楼梯间巡楼',
    minutes: 6,
    risk: '低',
    scene: '消防楼梯',
    cover: '活动颈椎',
    note: '走三层就停。往下走比往上走更像有事要办。',
  },
  {
    id: 'p08',
    name: '阅读行业资讯',
    minutes: 15,
    risk: '中',
    scene: '工位 · 单屏',
    cover: '看竞品动态',
    note: '开三个技术博客标签页压在视频上面，随时可以切回来。',
  },
  {
    id: 'p09',
    name: '摸鱼式重构',
    minutes: 30,
    risk: '中',
    scene: '工位 · IDE',
    cover: '优化代码结构',
    note: '只改变量名和注释，不动逻辑。看起来忙，实际上风险为零。',
  },
  {
    id: 'p10',
    name: '需求澄清电话',
    minutes: 14,
    risk: '低',
    scene: '电话间',
    cover: '和产品确认口径',
    note: '真的拨出去，响两声挂掉。出来后皱眉，说对方在开会。',
  },
  {
    id: 'p11',
    name: '工位拉伸',
    minutes: 3,
    risk: '低',
    scene: '工位',
    cover: '久坐不适',
    note: '动作幅度一定要小，重点在缓慢，让人相信你确实腰疼。',
  },
  {
    id: 'p12',
    name: '双屏切换',
    minutes: 20,
    risk: '中',
    scene: '工位 · 双屏',
    cover: '查一份资料',
    note: '一屏文档一屏视频，手放在快捷键上。脚步声靠近时切屏。',
  },
  {
    id: 'p13',
    name: '假装回消息',
    minutes: 8,
    risk: '低',
    scene: '工位',
    cover: '处理紧急消息',
    note: '提前把一个工作群置顶。打字速度要慢，表情要严肃。',
  },
  {
    id: 'p14',
    name: '楼下便利店',
    minutes: 11,
    risk: '低',
    scene: '楼下 · 户外',
    cover: '买瓶水',
    note: '顺便看看天。不要在店里刷手机，那会显得你并不需要那瓶水。',
  },
  {
    id: 'p15',
    name: '影子会议',
    minutes: 35,
    risk: '高',
    scene: '空会议室',
    cover: '跨部门沟通',
    note: '门虚掩，灯开着，桌上摊一份打印材料。不要在里面睡着。',
  },
  {
    id: 'p16',
    name: '看板冥想',
    minutes: 10,
    risk: '低',
    scene: '工位 · 数据看板',
    cover: '盯核心指标',
    note: '把图表全屏，视线落在曲线的某个拐点上，不要移动。',
  },
  {
    id: 'p17',
    name: '技术分享旁听',
    minutes: 28,
    risk: '低',
    scene: '线上直播',
    cover: '学习新方案',
    note: '记两行笔记就够。笔记要写在能被人看到的地方。',
  },
  {
    id: 'p18',
    name: '午休溢出',
    minutes: 22,
    risk: '中',
    scene: '楼下长椅',
    cover: '路上耽搁了',
    note: '不要设闹钟。让回到工位的时间比平时晚一点点，显得自然。',
  },
  {
    id: 'p19',
    name: '等 CI 绿灯',
    minutes: 16,
    risk: '低',
    scene: '工位 · 流水线页',
    cover: '流水线卡住了',
    note: '打开真实的流水线页面，最好那一跑确实慢。可信度靠运气。',
  },
  {
    id: 'p20',
    name: '耳机降噪',
    minutes: 45,
    risk: '中',
    scene: '工位 · 头戴式',
    cover: '深度专注',
    note: '放白噪音，不放到能听出旋律的音量。摘一只耳是暗号，别自己摘。',
  },
  {
    id: 'p21',
    name: '桌面整理',
    minutes: 13,
    risk: '低',
    scene: '工位',
    cover: '清理工作区',
    note: '把东西拿出来再放回去。分类不用合理，动作要慢。',
  },
  {
    id: 'p22',
    name: '邮件考古',
    minutes: 19,
    risk: '中',
    scene: '工位 · 邮箱',
    cover: '回溯历史邮件',
    note: '搜索三年前的邮件。找到什么都不要点开，只需要滚动。',
  },
  {
    id: 'p23',
    name: '阳台看云',
    minutes: 5,
    risk: '低',
    scene: '阳台',
    cover: '透口气',
    note: '数到第七朵就回去。北方的云走得慢，这一条可能超标。',
  },
  {
    id: 'p24',
    name: '下班前预演',
    minutes: 9,
    risk: '高',
    scene: '工位 · 日历',
    cover: '整理明日计划',
    note: '打开日历，发呆。什么也不新建，什么也不取消。',
  },
]

/** 每条方案配一句段子，保持同一条记录的稳定性 */
export const planJokes: Record<string, string> = {
  p01: '人还在工位，魂已打卡下班。',
  p02: '公司唯一没有 KPI 的房间。',
  p03: '进度条一动，我就有了不动的理由。',
  p04: '这个会，一封邮件就能埋。',
  p05: '用咖啡因给困意打高光。',
  p06: '全楼最忙的机器，配最闲的我。',
  p07: '上楼叫锻炼，下楼叫运营。',
  p08: '看了三篇趋势，趋势是没人懂趋势。',
  p09: '代码没修好，但看起来很想被修。',
  p10: '需求没通，电话先挂。',
  p11: '颈椎先递交了辞呈。',
  p12: '左屏生活，右屏生计，Tab 是逃生门。',
  p13: '一句「收到」，撑起今日全部产出。',
  p14: '买水是假的，晒太阳是真的。',
  p15: '一个人开会，全票通过。',
  p16: '数据没动，我先躺下。',
  p17: '听懂两成，点头十成。',
  p18: '说眯十分钟，醒来快下班。',
  p19: '它跑构建，我跑人生。',
  p20: '降噪一开，老板成了白噪音。',
  p21: '桌面干净了，问题被收纳了。',
  p22: '三年前的坑，今天还热着。',
  p23: '云在飘，我在编。',
  p24: '明天的我，负责今天的计划。',
}

export const pickFrom = (pool: SlackPlan[], excludeId?: string): SlackPlan => {
  const candidates = excludeId ? pool.filter((plan) => plan.id !== excludeId) : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export const pickPlan = (excludeId?: string): SlackPlan => pickFrom(plans, excludeId)

/** 同一天（或同一个 seed）永远返回同一份方案，用于「今日签」与可复现链接 */
export const planForSeed = (seed: string): SlackPlan => {
  let hash = 5381
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0
  }
  return plans[hash % plans.length]
}
