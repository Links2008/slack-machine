import { useCallback, useEffect, useRef, useState } from 'react'
import { initialPresence, updatePresence } from './breakLogic'

export function useLookout(onAlert: () => void) {
  const [status, setStatus] = useState<'off' | 'starting' | 'scanning' | 'error'>('off')
  const [error, setError] = useState('')
  const [faces, setFaces] = useState(0)
  const [presence, setPresence] = useState(initialPresence)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [aspect, setAspect] = useState(4 / 3)
  const [bounds, setBounds] = useState<{ left: number; top: number; width: number; height: number }[]>([])
  const sessionRef = useRef(0)
  const cleanupRef = useRef<() => void>(() => {})

  const stop = useCallback(() => {
    sessionRef.current += 1
    cleanupRef.current()
    setStatus('off')
    setFaces(0)
    setPresence(initialPresence)
    setCameraStream(null)
    setBounds([])
  }, [])

  useEffect(() => () => {
    sessionRef.current += 1
    cleanupRef.current()
  }, [])

  const start = useCallback(async () => {
    const session = ++sessionRef.current
    cleanupRef.current()
    setError('')
    setPresence(initialPresence)
    setFaces(0)
    setStatus('starting')
    setCameraStream(null)
    setBounds([])
    let stream: MediaStream | undefined
    let worker: Worker | undefined
    let timer = 0
    let watchdog = 0
    let monitoring = false
    let previous = initialPresence
    let lastVideoTime = -1
    let lastFrameAt = performance.now()
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      window.clearTimeout(timer)
      window.clearTimeout(watchdog)
      worker?.terminate()
      stream?.getTracks().forEach((track) => track.stop())
      video.pause()
      video.srcObject = null
    }
    cleanupRef.current = cleanup
    const fail = (message: string) => {
      if (session !== sessionRef.current) return
      sessionRef.current += 1
      cleanup()
      setError(message)
      setStatus('error')
      setPresence(initialPresence)
      setCameraStream(null)
      setBounds([])
      if (monitoring) onAlert()
    }

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        fail('请通过 localhost 或 HTTPS 使用摄像头。Shift 仍可切换。')
        return
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 10, max: 15 } },
      })
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      for (const track of stream.getVideoTracks()) {
        track.addEventListener('ended', () => fail('摄像头已断开，自动检测已停止。'), { once: true })
      }
      video.srcObject = stream
      await video.play()
      if (session !== sessionRef.current) return
      setCameraStream(stream)
      setAspect(video.videoWidth / video.videoHeight || 4 / 3)
      worker = new Worker(new URL('./lookout.worker.ts', import.meta.url), { type: 'module' })
      watchdog = window.setTimeout(() => fail('检测器加载超时，请重试。'), 20000)

      const sendFrame = async () => {
        if (session !== sessionRef.current) return
        if (document.hidden) {
          lastFrameAt = performance.now()
          timer = window.setTimeout(sendFrame, 500)
          return
        }
        if (video.readyState < 2 || video.currentTime === lastVideoTime) {
          if (performance.now() - lastFrameAt > 2000) fail('摄像头画面已停滞，自动检测已停止。')
          else timer = window.setTimeout(sendFrame, 200)
          return
        }
        try {
          lastVideoTime = video.currentTime
          lastFrameAt = performance.now()
          const frame = await createImageBitmap(video)
          if (session !== sessionRef.current) { frame.close(); return }
          watchdog = window.setTimeout(() => fail('来人检测没有响应，已暂停会话。'), 3000)
          worker?.postMessage({ type: 'frame', frame, timestamp: performance.now() }, [frame])
        } catch {
          fail('无法读取摄像头画面，请重新开启检测。')
        }
      }

      worker.onmessage = (event: MessageEvent) => {
        if (session !== sessionRef.current) return
        window.clearTimeout(watchdog)
        if (event.data.type === 'ready') {
          monitoring = true
          lastFrameAt = performance.now()
          setStatus('scanning')
          void sendFrame()
        } else if (event.data.type === 'count' && Number.isInteger(event.data.count) && event.data.count >= 0) {
          previous = updatePresence(previous, event.data.count)
          setFaces(event.data.count)
          setPresence(previous)
          setBounds(Array.isArray(event.data.bounds) ? event.data.bounds : [])
          if (previous.alert) onAlert()
          timer = window.setTimeout(sendFrame, 200)
        } else {
          fail('检测器运行失败，请重试。Shift 仍可切换。')
        }
      }
      worker.onerror = () => fail('检测器加载失败，请重试。Shift 仍可切换。')
      worker.postMessage({ type: 'init', baseUrl: new URL(import.meta.env.BASE_URL, window.location.href).href })
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : ''
      fail(name === 'NotAllowedError'
        ? '摄像头权限未开启，可在地址栏授权后重试。'
        : name === 'NotFoundError' ? '没有找到摄像头，可使用 Shift 手动切换。'
        : '摄像头暂时不可用，请检查是否被其他应用占用。')
    }
  }, [onAlert])

  return { status, error, faces, presence, cameraStream, aspect, bounds, start, stop,
    canResume: status === 'off' || status === 'error' || presence.canResume }
}

export type Lookout = ReturnType<typeof useLookout>
