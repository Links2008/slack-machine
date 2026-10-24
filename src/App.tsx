import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { pickFrom, planForSeed, planJokes, plans, type Risk, type SlackPlan } from './data'
import { FishingGame, WorkCover } from './FishingGame'
import { PayLedger } from './PayLedger'
import { useLookout } from './useLookout'
import './styles.css'

interface HistoryEntry {
  id: number
  name: string
  minutes: number
  risk: Risk
  at: number
}

const STORAGE_KEY = 'slack-machine.history.v1'
const DAILY_QUOTA = 60
const ROLL_FRAMES = 9
const ROLL_INTERVAL = 65

const readHistory = (): HistoryEntry[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : []
  } catch {
    return []
  }
}

const formatTime = (at: number) =>
  new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`

const toDateKey = (date: Date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`

const formatSeed = (seed: string) => `${seed.slice(0, 4)}.${seed.slice(4, 6)}.${seed.slice(6, 8)}`

const readSeed = () => {
  try {
    const raw = new URLSearchParams(window.location.search).get('seed')
    if (raw && /^\d{8}$/.test(raw)) return raw
  } catch {
    /* URL 不可用时直接回落到当天 */
  }
  return toDateKey(new Date())
}

const riskModifier = (risk: Risk) => (risk === '低' ? 'low' : risk === '中' ? 'mid' : 'high')

function App() {
  const dailySeed = useMemo(readSeed, [])
  const dailyPlan = useMemo(() => planForSeed(dailySeed), [dailySeed])

  const [history, setHistory] = useState<HistoryEntry[]>(readHistory)
  const [current, setCurrent] = useState<SlackPlan>(dailyPlan)
  const [display, setDisplay] = useState<SlackPlan>(dailyPlan)
  const [rolling, setRolling] = useState(false)
  const [gameOpen, setGameOpen] = useState(false)
  const [workMode, setWorkMode] = useState(false)
  const [bossNear, setBossNear] = useState(false)
  const [copied, setCopied] = useState(false)
  const [seedCopied, setSeedCopied] = useState(false)
  const [clock, setClock] = useState(() => new Date())

  const rollTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)
  const seedTimer = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const originalTitle = useRef(document.title)
  const workModeRef = useRef(false)
  const previousView = useRef({ covered: false, used: false, scroll: 0, focus: null as HTMLElement | null })
  const enterWork = useCallback(() => {
    if (previousView.current.covered) return
    previousView.current = { covered: true, used: true, scroll: window.scrollY, focus: document.activeElement as HTMLElement | null }
    setWorkMode(true)
  }, [])
  const lookout = useLookout(enterWork)
  const gameView = useRef({ opened: false, scroll: 0 })
  const openGame = () => {
    gameView.current = { opened: true, scroll: window.scrollY }
    previousView.current.used = true
    setGameOpen(true)
  }
  useLayoutEffect(() => {
    if (gameOpen) {
      window.scrollTo(0, 0)
      document.getElementById('fishing-title')?.focus({ preventScroll: true })
    } else if (gameView.current.opened) {
      window.scrollTo(0, gameView.current.scroll)
      gameView.current.opened = false
    }
  }, [gameOpen])

  useLayoutEffect(() => {
    document.title = workMode ? '项目进度 · 工作台' : originalTitle.current
    if (workMode) {
      window.scrollTo(0, 0)
      document.getElementById('work-cover')?.focus({ preventScroll: true })
    } else if (previousView.current.covered) {
      window.scrollTo(0, previousView.current.scroll)
      previousView.current.focus?.focus({ preventScroll: true })
      previousView.current.covered = false
    }
  }, [workMode])

  useEffect(() => {
    workModeRef.current = workMode
  }, [workMode])

  /* 切走标签页时，标题假装在跑构建；回来再恢复 */
  useEffect(() => {
    let timer: number | null = null
    let percent = 0

    const clear = () => {
      if (timer !== null) {
        window.clearInterval(timer)
        timer = null
      }
    }

    const start = () => {
      if (timer !== null || workModeRef.current) return
      percent = 28 + Math.floor(Math.random() * 18)
      document.title = `yarn build — ${percent}%`
      timer = window.setInterval(() => {
        percent = Math.min(97, percent + 3 + Math.floor(Math.random() * 9))
        document.title = `yarn build — ${percent}%`
      }, 1500)
    }

    const stop = () => {
      clear()
      if (!workModeRef.current) document.title = originalTitle.current
    }

    const onVisibility = () => {
      if (document.hidden) start()
      else stop()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', start)
    window.addEventListener('focus', stop)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', start)
      window.removeEventListener('focus', stop)
      clear()
      document.title = originalTitle.current
    }
  }, [])

  /* 指针冷光：只改变一层很淡的纸面反光，用来让面板有一点体积 */
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = panelRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    element.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    element.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch {
      /* 无痕模式下写入会失败，忽略即可 */
    }
  }, [history])

  useEffect(() => {
    const tick = window.setInterval(() => setClock(new Date()), 20000)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(
    () => () => {
      if (rollTimer.current !== null) window.clearInterval(rollTimer.current)
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      if (seedTimer.current !== null) window.clearTimeout(seedTimer.current)
    },
    [],
  )

  /* 切换后只允许手动恢复，避免漏检一帧就重新露出游戏。 */
  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift' && !event.repeat) enterWork()
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
  }, [enterWork])

  const generate = useCallback(() => {
    if (rolling) return
    const pool = bossNear ? plans.filter((plan) => plan.risk !== '高') : plans
    const final = pickFrom(pool, current.id)
    setRolling(true)
    setCopied(false)

    let frame = 0
    rollTimer.current = window.setInterval(() => {
      frame += 1
      setDisplay(frame < ROLL_FRAMES ? pickFrom(pool, final.id) : final)

      if (frame >= ROLL_FRAMES) {
        if (rollTimer.current !== null) window.clearInterval(rollTimer.current)
        rollTimer.current = null

        setRolling(false)
        setCurrent(final)
        const now = Date.now()
        setHistory((prev) =>
          [
            {
              id: now,
              name: final.name,
              minutes: final.minutes,
              risk: final.risk,
              at: now,
            },
            ...prev,
          ].slice(0, 24),
        )
      }
    }, ROLL_INTERVAL)
  }, [current.id, rolling, bossNear])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (gameOpen || workMode) return
      if (event.code !== 'Space' || event.repeat) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)) return
      event.preventDefault()
      generate()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [generate, gameOpen, workMode])

  const stats = useMemo(() => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const today = history.filter((entry) => entry.at >= startOfDay.getTime())
    const todayMinutes = today.reduce((sum, entry) => sum + entry.minutes, 0)
    const totalMinutes = history.reduce((sum, entry) => sum + entry.minutes, 0)

    return {
      todayCount: today.length,
      todayMinutes,
      totalMinutes,
      quotaUsed: Math.min(100, Math.round((todayMinutes / DAILY_QUOTA) * 100)),
      quotaNow: Math.min(todayMinutes, DAILY_QUOTA),
    }
  }, [history])

  const joke = planJokes[display.id] ?? ''

  const copyPlan = async () => {
    const text = [
      `【摸鱼方案】${display.name}`,
      `时长　${display.minutes} 分钟`,
      `风险　${display.risk}`,
      `场景　${display.scene}`,
      `伪装　${display.cover}`,
      `备注　${display.note}`,
      `段子　${joke}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const shareSeed = async () => {
    const url = `${window.location.origin}${window.location.pathname}?seed=${dailySeed}`
    try {
      await navigator.clipboard.writeText(url)
      setSeedCopied(true)
      if (seedTimer.current !== null) window.clearTimeout(seedTimer.current)
      seedTimer.current = window.setTimeout(() => setSeedCopied(false), 1600)
    } catch {
      setSeedCopied(false)
    }
  }

  const applyDaily = () => {
    if (rolling) return
    setGameOpen(false)
    setCurrent(dailyPlan)
    setDisplay(dailyPlan)
  }

  const planIndex = plans.findIndex((plan) => plan.id === display.id) + 1
  const isToday = dailySeed === toDateKey(new Date())
  const isDaily = display.id === dailyPlan.id

  const dayStart = new Date(clock)
  dayStart.setHours(9, 0, 0, 0)
  const dayEnd = new Date(clock)
  dayEnd.setHours(18, 0, 0, 0)
  const dayProgress = Math.min(
    100,
    Math.max(0, ((clock.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime())) * 100),
  )
  const remainMinutes = Math.max(0, Math.round((dayEnd.getTime() - clock.getTime()) / 60000))
  const countdown =
    remainMinutes > 0 ? `距下班 ${Math.floor(remainMinutes / 60)}h ${remainMinutes % 60}m` : '已下班'

  /* 今天已经投进去的工作时间，用来换算「如果不上班」 */
  const workedMinutes = Math.max(
    0,
    Math.round((Math.min(clock.getTime(), dayEnd.getTime()) - dayStart.getTime()) / 60000),
  )

  const minuteAngle = (clock.getMinutes() + clock.getSeconds() / 60) * 6
  const hourAngle = ((clock.getHours() % 12) + clock.getMinutes() / 60) * 30

  return (
    <>
    <div className={previousView.current.used ? 'app app--restored' : 'app'} hidden={workMode || gameOpen} inert={workMode || gameOpen}>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="topbar__brand">
            <span className="mark" aria-hidden="true" />
            <span className="brand">SLACK MACHINE</span>
          </div>
          <p className="topbar__meta">
            <span>摸鱼生成器</span>
            <span className="dot" aria-hidden="true" />
            <span>{formatTime(clock.getTime())}</span>
          </p>
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">随机摸鱼协议 / Nordic Edition</p>
          <h1>
            把八小时里的一小块，
            <br />
            还给没有目的的时间。
          </h1>
          <p className="lede">
            按一次生成，得到一份克制的摸鱼方案。时长、风险、伪装说法，都已经替你算好。
          </p>

          <p className="hero__meta">
            <span>{plans.length} 条方案</span>
            <span>{DAILY_QUOTA} min / 日</span>
            <span>1 台机器</span>
          </p>

          <div className="dial" aria-hidden="true">
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeOpacity="0.22" />
              <circle
                cx="100"
                cy="100"
                r="68"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.14"
                strokeDasharray="1 6"
              />
              <circle
                cx="100"
                cy="100"
                r="78"
                fill="none"
                stroke="var(--accent)"
                strokeOpacity="0.55"
                strokeWidth="1.4"
                strokeDasharray={`${dayProgress * 4.9} 490`}
                transform="rotate(-90 100 100)"
              />
              {Array.from({ length: 60 }, (_, index) => {
                const major = index % 5 === 0
                return (
                  <line
                    key={index}
                    x1="100"
                    y1={major ? 14 : 17}
                    x2="100"
                    y2={major ? 28 : 22}
                    transform={`rotate(${index * 6} 100 100)`}
                    stroke="currentColor"
                    strokeOpacity={major ? 0.5 : 0.22}
                    strokeWidth={major ? 1.2 : 1}
                  />
                )
              })}
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="52"
                transform={`rotate(${hourAngle} 100 100)`}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.85"
              />
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="34"
                transform={`rotate(${minuteAngle} 100 100)`}
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.6"
              />
              <circle cx="100" cy="100" r="2.4" fill="currentColor" />
            </svg>
            <p className="dial__caption">LOCAL · {formatTime(clock.getTime())}</p>
          </div>
        </section>

        <div className="daily">
          <div className="daily__head">
            <span className="label">{isToday ? '今日签' : '可复现签文'}</span>
            <span className="daily__date">{formatSeed(dailySeed)}</span>
          </div>
          <p className="daily__name">{dailyPlan.name}</p>
          <div className="daily__actions">
            <button type="button" className="ghost" onClick={applyDaily} disabled={isDaily}>
              {isDaily ? '正在使用' : '沿用今日签'}
            </button>
            <button type="button" className="ghost" onClick={shareSeed}>
              {seedCopied ? '链接已复制' : '复制链接'}
            </button>
          </div>
        </div>

        <div className="layout">
          <section className="machine" aria-labelledby="machine-title">
            <div
              className="panel"
              ref={panelRef}
              onPointerMove={handlePointerMove}
            >
              <div className="panel__head">
                <h2 id="machine-title" className="label">
                  {gameOpen ? '冰湖钓鱼' : '当前方案'}
                </h2>
                <div className="panel__meta">
                  {!gameOpen && <button
                    type="button"
                    className={bossNear ? 'flag flag--on' : 'flag'}
                    aria-pressed={bossNear}
                    onClick={() => setBossNear((value) => !value)}
                    title="过滤高风险方案"
                  >
                    <span className="flag__box" aria-hidden="true" />
                    老板在附近
                  </button>}
                  <span className="panel__index">
                    {gameOpen ? '30 SEC / ICE FISHING' : `NO.${String(planIndex).padStart(2, '0')} / ${plans.length}`}
                  </span>
                </div>
              </div>

              {!gameOpen && (
                <div className={rolling ? 'result is-rolling' : 'result'} aria-live="polite">
                  <span className="result__ghost" aria-hidden="true">
                    {display.name.slice(0, 1)}
                  </span>
                  <p className="result__name" key={display.id}>
                    {display.name}
                  </p>

                  <dl className="meta">
                    <div className="meta__cell">
                      <dt className="label">时长</dt>
                      <dd className="meta__value">
                        {display.minutes}
                        <span className="unit">min</span>
                      </dd>
                    </div>
                    <div className="meta__cell">
                      <dt className="label">风险</dt>
                      <dd className={`meta__value risk risk--${riskModifier(display.risk)}`}>{display.risk}</dd>
                    </div>
                    <div className="meta__cell">
                      <dt className="label">场景</dt>
                      <dd className="meta__value meta__value--sm">{display.scene}</dd>
                    </div>
                    <div className="meta__cell">
                      <dt className="label">伪装</dt>
                      <dd className="meta__value meta__value--sm">{display.cover}</dd>
                    </div>
                  </dl>

                  <div className="note">
                    <span className="label">执行备注</span>
                    <p>{display.note}</p>
                    {joke && <p className="note__joke">{joke}</p>}
                  </div>
                </div>
              )}

              <div className="panel__foot">
                {!gameOpen && <button type="button" className="generate" onClick={generate} disabled={rolling}>
                  <span>{rolling ? '生成中' : '生成一次'}</span>
                  <span className="generate__arrow" aria-hidden="true">
                    →
                  </span>
                </button>}
                <div className="panel__tools">
                  <span className="hint">
                    {gameOpen ? 'Shift 工作界面' : bossNear ? '高风险已过滤 · Shift 工作界面' : '空格生成 · Shift 工作界面'}
                  </span>
                  <div className="panel__buttons">
                    <button type="button" className="ghost" onClick={openGame} disabled={rolling}>
                      {gameOpen ? '返回生成器' : '冰湖钓鱼'}
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={enterWork}
                    >
                      工作界面
                    </button>
                    {!gameOpen && <button type="button" className="ghost" onClick={copyPlan}>
                      {copied ? '已复制' : '复制方案'}
                    </button>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="side">
            <section className="side__group">
              <div className="side__group-head">
                <span>01</span>
                <span>TIME / MONEY</span>
              </div>

              <PayLedger />

              <section className="dayline" aria-label="今日时间轴">
              <div className="dayline__head">
                <span className="label">今日进度</span>
                <span className="dayline__clock">
                  {formatTime(clock.getTime())} / 18:00
                </span>
              </div>
              <div className="dayline__track" aria-hidden="true">
                <span className="dayline__fill" style={{ width: `${dayProgress}%` }} />
                <span className="dayline__marker" style={{ left: `${dayProgress}%` }} />
              </div>
              <div className="dayline__foot">
                <span>09:00</span>
                <span className="dayline__countdown">{countdown}</span>
                <span>18:00</span>
              </div>
              </section>
            </section>

            <section className="side__group">
              <div className="side__group-head">
                <span>02</span>
                <span>QUOTA / LEDGER</span>
              </div>

              <section className="stats" aria-label="摸鱼统计">
              <div className="stat">
                <span className="label">今日</span>
                <p className="stat__value">
                  {stats.todayCount}
                  <span className="unit">次</span>
                </p>
              </div>
              <div className="stat">
                <span className="label">今日时长</span>
                <p className="stat__value">
                  {stats.todayMinutes}
                  <span className="unit">min</span>
                </p>
              </div>
              <div className="stat">
                <span className="label">累计</span>
                <p className="stat__value">
                  {stats.totalMinutes}
                  <span className="unit">min</span>
                </p>
              </div>
            </section>

            <section className="quota" aria-label="今日额度">
              <div className="quota__head">
                <span className="label">今日额度</span>
                <span className="quota__num">
                  {stats.quotaNow} / {DAILY_QUOTA} min
                </span>
              </div>
              <div
                className="quota__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={DAILY_QUOTA}
                aria-valuenow={stats.quotaNow}
              >
                <span className="quota__fill" style={{ width: `${stats.quotaUsed}%` }} />
              </div>
              <p className="quota__note">
                {stats.quotaUsed >= 100
                  ? '额度用尽。剩下的时间，建议真的工作。'
                  : '超出额度也不会有人发现，但请自己知道。'}
              </p>
            </section>

            <section className="ledger" aria-label="如果不上班">
              <div className="ledger__head">
                <span className="label">如果不上班</span>
                <span className="ledger__total">今天 {formatDuration(workedMinutes)}</span>
              </div>
              {workedMinutes <= 0 ? (
                <p className="ledger__empty">还没开始上班。先想想要去哪。</p>
              ) : (
                <ul className="ledger__rows">
                  <li>
                    <span>电影</span>
                    <i aria-hidden="true" />
                    <b>{(workedMinutes / 95).toFixed(1)}</b>
                    <em>部</em>
                  </li>
                  <li>
                    <span>游戏</span>
                    <i aria-hidden="true" />
                    <b>{Math.floor(workedMinutes / 25)}</b>
                    <em>局</em>
                  </li>
                  <li>
                    <span>骑行</span>
                    <i aria-hidden="true" />
                    <b>{Math.round((workedMinutes / 60) * 15)}</b>
                    <em>km</em>
                  </li>
                </ul>
              )}
              </section>
            </section>

            <section className="side__group side__group--plain">
              <div className="side__group-head">
                <span>03</span>
                <span>LOG</span>
              </div>

              <section className="history" aria-label="摸鱼记录">
              <div className="history__head">
                <span className="label">记录</span>
                {history.length > 0 && (
                  <button type="button" className="ghost ghost--sm" onClick={() => setHistory([])}>
                    清空
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="history__empty">还没有记录。空白本身也是一种摸鱼。</p>
              ) : (
                <ol className="history__list">
                  {history.slice(0, 10).map((entry, index) => (
                    <li className="history__item" key={entry.id}>
                      <span className="history__idx">{String(history.length - index).padStart(2, '0')}</span>
                      <span className="history__name">{entry.name}</span>
                      <span className="history__min">{entry.minutes}′</span>
                      <span className="history__time">{formatTime(entry.at)}</span>
                    </li>
                  ))}
                </ol>
              )}
              </section>
            </section>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <p>参考：Awwwards 极简类目 / ÅBEN / Aino / Grette</p>
        <p>SEED · {dailySeed} / 仅供娱乐，不构成职场建议</p>
      </footer>

      <div className="rail" aria-hidden="true">
        SLACK PROTOCOL — 摸鱼生成器 — 2026
      </div>
    </div>
    <div className="game-view" hidden={!gameOpen || workMode} inert={!gameOpen || workMode}>
      <FishingGame paused={workMode || !gameOpen} lookout={lookout} onBack={() => setGameOpen(false)} onWork={enterWork} />
    </div>
    {workMode && <WorkCover lookout={lookout} onResume={() => { if (lookout.canResume) setWorkMode(false) }} />}
    </>
  )
}

export default App
