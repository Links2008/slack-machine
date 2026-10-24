export const fishCatalog = [
  { name: '银鳟', note: '一尾普通的快乐。', points: 20 },
  { name: '雾鳞', note: '只在你不忙的时候出现。', points: 35 },
  { name: '北境鲑', note: '今天最值得带走的事。', points: 50 },
]

export interface FishCatch { kind: number; name: string; length: number; points: number }
export interface GameState {
  phase: 'idle' | 'ready' | 'charging' | 'waiting' | 'bite' | 'reeling' | 'caught' | 'done'
  remainingMs: number
  phaseMs: number
  caught: number
  score: number
  power: number
  castQuality: number
  tension: number
  reelProgress: number
  strainMs: number
  fish: FishCatch | null
  catches: FishCatch[]
  message: string
}

export const initialGame: GameState = {
  phase: 'idle', remainingMs: 30000, phaseMs: 0, caught: 0, score: 0,
  power: 0, castQuality: 0, tension: 0.5, reelProgress: 0, strainMs: 0,
  fish: null, catches: [], message: '把手头的事放一放。湖边的位置给你留着。',
}

type GameAction = { type: 'press' } | { type: 'release'; random: number }
  | { type: 'tick'; elapsedMs: number; holding?: boolean; paused?: boolean }

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'press') {
    if (state.phase === 'idle' || state.phase === 'done') {
      return { ...initialGame, phase: 'ready', message: '按住蓄力，指针到蓝色区域时松开。' }
    }
    if (state.phase === 'ready' || state.phase === 'caught') {
      return { ...state, phase: 'charging', power: 0, phaseMs: 0, message: '轻一点。让落点停在蓝色区域。' }
    }
    if (state.phase === 'bite') {
      return { ...state, phase: 'reeling', phaseMs: 0, tension: 0.5, reelProgress: 0, strainMs: 0, message: '上钩了。按住收线，松开缓一缓。' }
    }
    if (state.phase === 'waiting') {
      return { ...state, phase: 'ready', fish: null, message: '收得太早。湖里暂时只有倒影。' }
    }
    return state
  }
  if (action.type === 'release') {
    if (state.phase !== 'charging') return state
    const random = Number.isFinite(action.random) ? Math.min(0.999, Math.max(0, action.random)) : 0.5
    const castQuality = Math.max(0, 1 - Math.abs(state.power - 0.65) / 0.65)
    const kind = Math.floor(random * fishCatalog.length)
    const fish = { kind, name: fishCatalog[kind].name, length: Math.round(16 + random * 20 + castQuality * 12), points: fishCatalog[kind].points }
    return { ...state, phase: 'waiting', phaseMs: 1200 + random * 1000 + (1 - castQuality) * 1800, castQuality, fish,
      message: castQuality > 0.8 ? '落点很稳。等它先动。' : '浮漂落水了。让鱼慢慢靠近。' }
  }
  if (action.paused || state.phase === 'idle' || state.phase === 'done') return state
  const elapsed = Number.isFinite(action.elapsedMs) ? Math.max(0, action.elapsedMs) : 0
  const remainingMs = Math.max(0, state.remainingMs - elapsed)
  if (!remainingMs) return { ...state, phase: 'done', remainingMs: 0, message: '这 30 秒，归你了。' }
  if (state.phase === 'ready') return { ...state, remainingMs }
  if (state.phase === 'charging') {
    const phaseMs = state.phaseMs + (action.holding ? elapsed : 0)
    const cycle = (phaseMs / 1400) % 2
    return { ...state, remainingMs, phaseMs, power: cycle <= 1 ? cycle : 2 - cycle }
  }
  if (state.phase === 'reeling') {
    const phaseMs = state.phaseMs + elapsed
    const pull = (action.holding ? 0.26 : -0.18) + Math.sin(phaseMs / 450) * 0.05
    const tension = Math.min(1, Math.max(0, state.tension + pull * elapsed / 1000))
    const inZone = tension >= 0.28 && tension <= 0.74
    const strainMs = inZone ? Math.max(0, state.strainMs - elapsed) : state.strainMs + elapsed
    const reelProgress = state.reelProgress + (inZone ? elapsed : 0)
    if (strainMs >= 900) return { ...state, remainingMs, phase: 'ready', fish: null, message: '它游走了。下一次，放松一点。' }
    if (reelProgress >= 2400 && state.fish) {
      return { ...state, remainingMs, phase: 'caught', phaseMs: 1200, caught: state.caught + 1,
        score: state.score + state.fish.points, catches: [state.fish, ...state.catches], reelProgress,
        message: `钓到${state.fish.name}。今天的产出，终于与工作无关。` }
    }
    return { ...state, remainingMs, phaseMs, tension, strainMs, reelProgress,
      message: tension < 0.28 ? '鱼线松了，轻轻按住收线。' : tension > 0.74 ? '绷得太紧，松开一点。' : '很好。让张力留在蓝色区域。' }
  }
  const phaseMs = state.phaseMs - elapsed
  if (phaseMs > 0) return { ...state, remainingMs, phaseMs }
  if (state.phase === 'waiting' && phaseMs > -1600) {
    return { ...state, remainingMs, phase: 'bite', phaseMs: 1600 + phaseMs, message: '咬钩了。现在提竿。' }
  }
  return { ...state, remainingMs, phase: 'ready', phaseMs: 0,
    message: state.phase === 'caught' ? '湖面又安静了。再抛一竿？' : '它游走了。鱼也有自己的安排。' }
}

export interface PresenceState {
  ready: boolean
  singleFrames: number
  crowdedFrames: number
  missingFrames: number
  alert: boolean
  canResume: boolean
}

export const initialPresence: PresenceState = {
  ready: false, singleFrames: 0, crowdedFrames: 0, missingFrames: 0,
  alert: false, canResume: false,
}

export function updatePresence(previous: PresenceState, count: number): PresenceState {
  const singleFrames = count === 1 ? Math.min(5, previous.singleFrames + 1) : 0
  const crowdedFrames = count > 1 ? Math.min(2, previous.crowdedFrames + 1) : 0
  const missingFrames = count === 0 ? Math.min(8, previous.missingFrames + 1) : 0
  const ready = previous.ready || singleFrames >= 3
  const alert = crowdedFrames >= 2 || (ready && missingFrames >= 8)
  if (previous.singleFrames === singleFrames && previous.crowdedFrames === crowdedFrames && previous.missingFrames === missingFrames && previous.ready === ready) return previous
  return { ready, singleFrames, crowdedFrames, missingFrames, alert, canResume: singleFrames >= 5 }
}
