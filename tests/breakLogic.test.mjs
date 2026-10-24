import assert from 'node:assert/strict'
import test from 'node:test'
import { initialGame, gameReducer, initialPresence, updatePresence } from '../src/breakLogic.ts'

const press = (state) => gameReducer(state, { type: 'press' })
const release = (state) => gameReducer(state, { type: 'release', random: 0.5 })
const tick = (state, elapsedMs, holding = false, paused = false) => gameReducer(state, { type: 'tick', elapsedMs, holding, paused })
const cast = (chargeMs = 910) => release(tick(press(press(initialGame)), chargeMs, true))
const hook = () => { const waiting = cast(); return press(tick(waiting, waiting.phaseMs)) }
const land = (state) => {
  for (let i = 0; i < 100 && state.phase === 'reeling'; i++) state = tick(state, 50, state.tension < 0.55)
  return state
}
const samples = (state, count, times) => {
  for (let i = 0; i < times; i++) state = updatePresence(state, count)
  return state
}

test('蓄力落在目标区能缩短等待，提前收竿不得分', () => {
  const good = cast()
  const poor = cast(100)
  assert.equal(good.phase, 'waiting')
  assert(good.castQuality > 0.95)
  assert(good.phaseMs < poor.phaseMs)
  assert.equal(press(good).caught, 0)
  assert.equal(press(good).phase, 'ready')
})

test('咬钩后需要控制张力，成功收线才得到渔获和积分', () => {
  const reeling = hook()
  assert.equal(reeling.phase, 'reeling')
  assert.equal(reeling.caught, 0)
  const result = land(reeling)
  assert.equal(result.caught, 1)
  assert.equal(result.catches.length, 1)
  assert(result.score > 0)
  assert.equal(result.phase, 'caught')
})

test('持续拉紧或一直松线都会失去鱼，不能挂机得分', () => {
  for (const holding of [true, false]) {
    let state = hook()
    for (let i = 0; i < 100 && state.phase === 'reeling'; i++) state = tick(state, 50, holding)
    assert.equal(state.phase, 'ready')
    assert.equal(state.caught, 0)
  }
})

test('蓄力、咬钩、收线都能暂停，恢复后仍可完成这一尾', () => {
  const waiting = cast()
  for (const state of [press(press(initialGame)), tick(waiting, waiting.phaseMs), hook()]) {
    assert.deepEqual(tick(state, 60000, false, true), state)
  }
  assert.equal(land(tick(hook(), 60000, false, true)).caught, 1)
})

test('错过咬钩会回到待抛竿状态，长帧不能留下过期咬钩', () => {
  const waiting = cast()
  assert.equal(tick(waiting, waiting.phaseMs + 1700).phase, 'ready')
  assert.equal(tick(tick(waiting, waiting.phaseMs), 1700).phase, 'ready')
})

test('满 30 秒结算，重新开始时清零', () => {
  const caught = land(hook())
  const done = tick(caught, 30000)
  assert.equal(done.phase, 'done')
  assert.equal(done.remainingMs, 0)
  assert.equal(done.caught, 1)
  assert.equal(press(done).caught, 0)
  assert.equal(press(done).remainingMs, 30000)
  assert.deepEqual(press(done).catches, [])
})

test('单人稳定后完成校准，瞬间多检一张脸不触发', () => {
  const ready = samples(initialPresence, 1, 3)
  assert.equal(ready.ready, true)
  assert.equal(updatePresence(ready, 2).alert, false)
  assert.equal(updatePresence(updatePresence(ready, 2), 1).alert, false)
})

test('连续额外人脸触发切换，重新稳定单人后才允许手动恢复', () => {
  const alarm = samples(samples(initialPresence, 1, 3), 2, 2)
  assert.equal(alarm.alert, true)
  assert.equal(updatePresence(alarm, 1).canResume, false)
  assert.equal(samples(alarm, 1, 5).canResume, true)
})

test('校准期间已经出现多人也触发，镜头失去人脸时暂停保护', () => {
  assert.equal(samples(initialPresence, 2, 2).alert, true)
  assert.equal(samples(samples(initialPresence, 1, 3), 0, 8).alert, true)
  assert.equal(samples(initialPresence, 0, 8).ready, false)
})
