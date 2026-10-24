import { useEffect, useRef, useState } from 'react'

const SALARY_KEY = 'slack-machine.salary.v1'
const WORK_DAYS_PER_MONTH = 21.75
const WORK_HOURS_PER_DAY = 8
const MAX_SALARY = 10_000_000

const readSalary = () => {
  try {
    const raw = window.localStorage.getItem(SALARY_KEY)
    const value = raw ? Number(raw) : 0
    return Number.isFinite(value) && value > 0 ? Math.min(MAX_SALARY, Math.round(value)) : 0
  } catch {
    return 0
  }
}

const formatMoney = (value: number) =>
  value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * 工资计息：点开就能填月薪，之后按秒计息，
 * 数字是「今天 09:00 起已经挣到的钱」，不是动画。
 */
export function PayLedger() {
  const [salary, setSalary] = useState(readSalary)
  const [draft, setDraft] = useState(() => {
    const stored = readSalary()
    return stored > 0 ? String(stored) : ''
  })
  const [now, setNow] = useState(() => Date.now())
  const sessionStart = useRef(Date.now())

  useEffect(() => {
    try {
      window.localStorage.setItem(SALARY_KEY, String(salary))
    } catch {
      /* 无痕模式下写入会失败，忽略即可 */
    }
  }, [salary])

  useEffect(() => {
    if (salary <= 0) return
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [salary])

  const perHour = salary / WORK_DAYS_PER_MONTH / WORK_HOURS_PER_DAY
  const perSecond = perHour / 3600

  const dayStart = new Date(now)
  dayStart.setHours(9, 0, 0, 0)
  const dayEnd = new Date(now)
  dayEnd.setHours(18, 0, 0, 0)
  const paidUntil = Math.min(Math.max(now, dayStart.getTime()), dayEnd.getTime())

  const todayEarned = salary > 0 ? ((paidUntil - dayStart.getTime()) / 1000) * perSecond : 0
  const sessionEarned = salary > 0 ? ((now - sessionStart.current) / 1000) * perSecond : 0

  const commit = () => {
    const value = Math.min(MAX_SALARY, Math.max(0, Math.round(Number(draft) || 0)))
    setSalary(value)
    setDraft(value > 0 ? String(value) : '')
    setNow(Date.now())
  }

  return (
    <section className="pay" aria-label="工资计息">
      <div className="pay__head">
        <span className="label">工资计息</span>
        <span className="pay__rate" title="按 21.75 个工作日、每天 8 小时折算">
          {salary > 0 ? `¥${perHour.toFixed(2)} / 时` : '未设置'}
        </span>
      </div>

      <p className={salary > 0 ? 'pay__value' : 'pay__value pay__value--empty'}>
        <span className="pay__currency">¥</span>
        {salary > 0 ? formatMoney(todayEarned) : '—'}
        {salary > 0 && <span className="pay__pulse" aria-hidden="true" />}
      </p>

      <div className="pay__foot">
        <span>{salary > 0 ? '今日已赚 · 09:00 起' : '填一个月薪，开始按秒计息'}</span>
        <span className="pay__session">{salary > 0 ? `本次 ¥${sessionEarned.toFixed(3)}` : '1s / 次'}</span>
      </div>

      <label className="pay__set">
        <span className="label">月薪</span>
        <span className="pay__input">
          <span className="pay__symbol">¥</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            placeholder="20000"
            aria-label="设置月薪，单位元"
            onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, '').slice(0, 8))}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
          <span className="pay__unit">/ 月</span>
        </span>
      </label>
    </section>
  )
}
