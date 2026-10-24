import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { fishCatalog, gameReducer, initialGame } from './breakLogic'
import type { Lookout } from './useLookout'
import lakeImage from './assets/nordic-lake.webp'
import fishIcon from './assets/icons/fish.svg'
import cameraIcon from './assets/icons/camera.svg'
import backIcon from './assets/icons/back.svg'
import shieldIcon from './assets/icons/shield.svg'
import workIcon from './assets/icons/work.svg'
import './fishing-game.css'
import './fishing-room.css'

const icons = { fish: fishIcon, camera: cameraIcon, back: backIcon, shield: shieldIcon, work: workIcon }
function Icon({ name }: { name: keyof typeof icons }) {
  return <span className={`game-icon game-icon--${name}`} aria-hidden="true" style={{ maskImage: `url(${JSON.stringify(icons[name])})` }} />
}

function CameraPreview({ lookout }: { lookout: Lookout }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = lookout.cameraStream
    if (lookout.cameraStream) void video.play().catch(() => {})
    return () => { video.srcObject = null }
  }, [lookout.cameraStream])
  return <div className="lookout-preview" style={{ aspectRatio: lookout.aspect }}>
    <video ref={videoRef} muted playsInline autoPlay aria-label="仅在本机显示的摄像头预览" />
    {lookout.cameraStream ? <div className="lookout-preview__boxes" aria-hidden="true">
      {lookout.bounds.map((box, index) => <span key={index} style={{ left: `${(1 - box.left - box.width) * 100}%`, top: `${box.top * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }} />)}
    </div> : <div className="lookout-preview__empty"><Icon name="camera" /><span>{lookout.status === 'starting' ? '等待镜头连接' : '镜头尚未开启'}</span></div>}
    <span className="lookout-preview__local">LOCAL ONLY</span>
  </div>
}

export function FishingGame({ paused, lookout, onBack, onWork }: { paused: boolean; lookout: Lookout; onBack: () => void; onWork: () => void }) {
  const [game, dispatch] = useReducer(gameReducer, initialGame)
  const [visible, setVisible] = useState(() => !document.hidden)
  const holding = useRef(false)
  const [pressed, setPressed] = useState(false)
  const actionRef = useRef<HTMLButtonElement>(null)
  const running = game.phase !== 'idle' && game.phase !== 'done'
  const press = useCallback(() => {
    if (paused || holding.current) return
    holding.current = true
    setPressed(true)
    dispatch({ type: 'press' })
  }, [paused])
  const release = useCallback(() => {
    if (!holding.current) return
    holding.current = false
    setPressed(false)
    if (!paused) dispatch({ type: 'release', random: Math.random() })
  }, [paused])
  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    const blur = () => setVisible(false)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('blur', blur)
    window.addEventListener('focus', update)
    return () => { document.removeEventListener('visibilitychange', update); window.removeEventListener('blur', blur); window.removeEventListener('focus', update) }
  }, [])
  useEffect(() => {
    if (paused || !visible) { holding.current = false; setPressed(false); return }
    if (!running) return
    let previous = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      dispatch({ type: 'tick', elapsedMs: now - previous, holding: holding.current })
      previous = now
    }, 50)
    return () => window.clearInterval(timer)
  }, [paused, visible, running])
  useEffect(() => {
    if (paused) return
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, a, [contenteditable="true"]')) return
      if (target?.closest('button') && target.closest('button') !== actionRef.current) return
      event.preventDefault()
      press()
    }
    const up = (event: KeyboardEvent) => { if (event.code === 'Space' && holding.current) { event.preventDefault(); release() } }
    const cancel = () => { holding.current = false; setPressed(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', cancel)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', cancel) }
  }, [paused, press, release])

  const cameraOn = lookout.status === 'scanning' || lookout.status === 'starting'
  const cameraText = lookout.status === 'starting' ? '正在申请摄像头并加载本地检测器…'
    : lookout.status === 'error' ? lookout.error
    : lookout.status === 'off' ? '来人检测未开启'
    : lookout.faces > 1 ? '镜头内出现额外人脸，会话已暂停'
    : !lookout.presence.ready ? '校准中，请独自面对摄像头'
    : lookout.faces === 0 ? '暂未看到人脸，请调整镜头'
    : '来人检测中 · 当前 1 人'
  const stage = game.phase === 'reeling' || game.phase === 'caught' ? 2 : game.phase === 'waiting' || game.phase === 'bite' ? 1 : 0
  const lineInWater = ['waiting', 'bite', 'reeling'].includes(game.phase)
  const tensionWarning = game.phase === 'reeling' && (game.tension < 0.28 || game.tension > 0.74)
  const actionLabel = game.phase === 'idle' ? '开始 30 秒' : game.phase === 'done' ? '再来一局'
    : game.phase === 'charging' ? '松开抛竿' : game.phase === 'waiting' ? '提前收竿' : game.phase === 'bite' ? '现在提竿'
    : game.phase === 'reeling' ? pressed ? '松开，缓一缓' : '按住收线' : '按住抛竿'
  const helper = game.phase === 'reeling' ? '按住拉紧，松开减压。让指针停在蓝色区。'
    : game.phase === 'waiting' ? '等浮漂下沉，再提竿。现在松开手就好。'
    : game.phase === 'bite' ? '鱼已经上钩。轻点按钮开始收线。'
    : '按住鼠标或空格蓄力，蓝色区域松开。'

  return (
    <main className="fishing-room" data-minigame data-phase={game.phase} data-tension={game.tension}>
      <header className="fishing-room__topbar">
        <button type="button" className="game-text-button" aria-label="返回生成器" onClick={onBack}><Icon name="back" /><span>返回生成器</span></button>
        <span className="brand">SLACK MACHINE <span className="fishing-room__edition">/ FIELD NOTES</span></span>
        <button type="button" className="game-work-button" onClick={onWork}><Icon name="work" /><span>工作界面</span><kbd>Shift</kbd></button>
      </header>
      <div className="fishing-room__heading">
        <div><p className="game-eyebrow">一场 30 秒的北境假期</p><h1 id="fishing-title" tabIndex={-1}>冰湖钓鱼<span>把时间，交给湖面。</span></h1></div>
        <div className="fishing-room__stats"><div><span>距结束</span><strong>00:<b data-game-time>{Math.ceil(game.remainingMs / 1000).toString().padStart(2, '0')}</b></strong></div><div><span>本次渔获</span><strong><b data-game-score>{game.caught.toString().padStart(2, '0')}</b><small> 尾</small></strong></div><div><span>收获积分</span><strong>{game.score.toString().padStart(3, '0')}</strong></div></div>
      </div>
      <div className="fishing-room__layout">
        <section className="fishing-field" aria-label="冰湖与钓鱼操作">
          <div className={`fishing-lake fishing-lake--${game.phase}`}>
            <img className="fishing-lake__landscape" src={lakeImage} alt="松林与雪山围绕的北境冰湖" loading="lazy" />
            <div className="fishing-lake__water" aria-hidden="true"><div className={running && !paused ? 'lake-school is-swimming' : 'lake-school'}>{[0, 1, 2].map(index => <span key={index} style={{ '--fish-index': index } as CSSProperties}><Icon name="fish" /></span>)}</div></div>
            {(lineInWater || game.phase === 'charging') && <svg className={`fishing-lake__tackle ${pressed ? 'is-pulling' : ''}`} viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><path className="fishing-rod" d="M225 615 Q285 310 575 290" /><path className="fishing-thread" d={game.phase === 'charging' ? 'M575 290 Q630 315 615 370' : 'M575 290 Q604 348 615 434'} />{lineInWater && <g className={game.phase === 'bite' ? 'lake-bobber is-biting' : 'lake-bobber'}><ellipse cx="615" cy="438" rx="22" ry="6" /><path d="M615 421v17" /><circle cx="615" cy="420" r="4" /></g>}</svg>}
            {game.phase === 'bite' && <div className="fishing-lake__signal">咬钩了<span>现在提竿</span></div>}
            {game.phase === 'caught' && game.fish && <div className="fishing-lake__catch"><Icon name="fish" /><div><span>收入鱼篓</span><strong>{game.fish.name}</strong><small>{game.fish.length} cm · +{game.fish.points} 分</small></div></div>}
            {(game.phase === 'idle' || game.phase === 'done') && <div className="fishing-lake__invitation"><span>{game.phase === 'idle' ? '暂时离线，去湖边坐坐。' : '这 30 秒，归你了。'}</span><p>{game.phase === 'idle' ? '鱼群在冰层下游动，工作可以稍等一会。' : `带回 ${game.caught} 尾鱼，和一小段没有目的的时间。`}</p></div>}
            <div className="fishing-lake__footer"><span>NORDIC LAKE</span><span>{game.phase === 'reeling' ? '正在收线' : game.phase === 'waiting' ? '等待鱼群靠近' : '安静本身，也是一种收获'}</span></div>
          </div>
          <div className="fishing-controls">
            <div className="fishing-controls__steps" aria-label="钓鱼步骤">{['蓄力抛竿', '等待咬钩', '控制收线'].map((label, index) => <span key={label} className={stage === index ? 'is-current' : ''}><b>0{index + 1}</b>{label}</span>)}</div>
            <div className="fishing-controls__action-row">
              <div className="fishing-controls__guidance"><p role="status" className={tensionWarning ? 'is-warning' : ''}>{game.message}</p>
                <div className={`fishing-meter ${game.phase === 'reeling' ? 'is-tension' : ''} ${tensionWarning ? 'is-warning' : ''}`} role="meter" aria-label={game.phase === 'reeling' ? '鱼线张力' : '抛竿力度'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((game.phase === 'reeling' ? game.tension : game.power) * 100)}>
                  <span className="fishing-meter__zone" /><span className="fishing-meter__needle" style={{ transform: `translateX(${(game.phase === 'reeling' ? game.tension : game.power) * 100}%)` }} />
                </div>
                {game.phase === 'reeling' && <div className="fishing-reel-progress" aria-label={`收线完成 ${Math.min(100, Math.round(game.reelProgress / 24))}%`}><span style={{ transform: `scaleX(${Math.min(1, game.reelProgress / 2400)})` }} /></div>}
                <small>{helper}</small>
              </div>
              <button ref={actionRef} type="button" className={`fishing-action ${pressed ? 'is-pressed' : ''} ${game.phase === 'bite' ? 'is-bite' : ''}`} disabled={paused} aria-label={actionLabel} onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); press() }} onPointerUp={release} onPointerCancel={() => { holding.current = false; setPressed(false) }} onClick={event => { if (event.detail === 0) { press(); release() } }}>
                <span>{actionLabel}</span><span className="fishing-action__key">{game.phase === 'idle' || game.phase === 'done' ? 'ENTER THE LAKE' : 'SPACE / 按住'}</span>
              </button>
            </div>
          </div>
        </section>
        <aside className="fishing-sidebar">
          <section className={`lookout-panel lookout-panel--${lookout.status}`} aria-label="来人检测">
            <div className="game-section-head"><h2><Icon name="shield" />来人检测</h2><span className={cameraOn ? 'lookout-status is-on' : 'lookout-status'}>{lookout.status === 'starting' ? '连接中' : cameraOn ? '已开启' : '未开启'}</span></div>
            <CameraPreview lookout={lookout} />
            <p className="lookout-panel__status" role="status">{cameraText}</p>
            <p className="lookout-panel__description">镜头内多一个人，立即暂停游戏并切换工作台。稳定后手动返回。</p>
            <button type="button" className="lookout-toggle" onClick={cameraOn ? lookout.stop : () => void lookout.start()}><Icon name="camera" />{lookout.status === 'starting' ? '取消开启' : cameraOn ? '关闭检测' : '开启来人检测'}</button>
            <p className="lookout-panel__privacy">仅本机处理 · 不录制 · 不上传</p>
          </section>
          <section className="catch-ledger" aria-label="本次渔获记录"><div className="game-section-head"><h2>鱼篓</h2><span>{game.caught.toString().padStart(2, '0')} 尾</span></div>
            {game.catches.length ? <ol>{game.catches.slice(0, 3).map((fish, index) => <li key={`${game.caught}-${index}`}><Icon name="fish" /><div><strong>{fish.name}</strong><span>{fish.length} cm · {fishCatalog[fish.kind].note}</span></div><b>+{fish.points}</b></li>)}</ol> : <div className="catch-ledger__empty"><Icon name="fish" /><p>还空着。<span>第一尾鱼值得等一等。</span></p></div>}
          </section>
          <div className="fishing-sidebar__note"><kbd>Shift</kbd><p>有人靠近时，随时切换工作界面。<span>时间、鱼线和渔获都会为你保留。</span></p></div>
        </aside>
      </div>
      <footer className="fishing-room__footer"><span>本次休息，无需交付。</span><span>检测只覆盖镜头内的人脸，无法识别身份。</span></footer>
    </main>
  )
}

export function WorkCover({ lookout, onResume }: { lookout: Lookout; onResume: () => void }) {
  const [filter, setFilter] = useState('全部')
  const rows = [
    { name: '页面结构梳理', owner: '设计', status: '已完成', progress: 100 },
    { name: '交互细节核对', owner: '研发', status: '进行中', progress: 75 },
    { name: '多端适配检查', owner: '研发', status: '进行中', progress: 60 },
    { name: '交付材料整理', owner: '项目', status: '待开始', progress: 0 },
  ]
  return (
    <main className="work-cover" id="work-cover" tabIndex={-1}>
      <header className="work-cover__header"><span className="brand">WORKSPACE</span><span>本地项目 / 工作台</span></header>
      <div className="work-cover__heading"><div><p className="ice-game__eyebrow">项目进度</p><h1>每件事，都在按计划进行。</h1><p>本周事项与交付进度。</p></div><span className="work-cover__date">{new Date().toLocaleDateString('zh-CN')}</span></div>
      <div className="work-cover__toolbar">
        <div role="group" aria-label="事项筛选">{['全部', '进行中', '已完成'].map((value) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
        <span>更新于本地</span>
      </div>
      <div className="work-cover__table-wrap"><table><thead><tr><th>事项</th><th>负责人</th><th>状态</th><th>进度</th></tr></thead><tbody>
        {rows.filter((row) => filter === '全部' || row.status === filter).map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.owner}</td><td>{row.status}</td><td><span className="work-cover__progress"><i style={{ width: `${row.progress}%` }} /></span>{row.progress}%</td></tr>)}
      </tbody></table></div>
      <section className="work-cover__notes"><h2>本周备注</h2><p>优先完成当前事项，确认交付前再进入下一阶段。</p><p>页面与交互检查完成后，统一整理演示材料。</p></section>
      <footer className="work-cover__footer">
        <p>{lookout.status === 'scanning' ? lookout.canResume ? '本地会话就绪' : '本地会话已暂停'
          : lookout.status === 'starting' ? '正在连接本地设备' : lookout.status === 'error' ? '本地检测已停止' : '仅本地保存'}</p>
        <div>{(lookout.status === 'scanning' || lookout.status === 'starting') && <button type="button" className="ghost" onClick={lookout.stop}>关闭摄像头</button>}
          <button type="button" className="ghost" onClick={onResume} disabled={!lookout.canResume}>返回</button></div>
      </footer>
    </main>
  )
}
