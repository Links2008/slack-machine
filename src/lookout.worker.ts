import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

let detector: FaceDetector | undefined

self.onmessage = async (event: MessageEvent) => {
  const message = event.data
  try {
    if (message.type === 'init') {
      const files = await FilesetResolver.forVisionTasks(`${message.baseUrl}vision/wasm`, true)
      detector = await FaceDetector.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: `${message.baseUrl}vision/blaze_face_short_range.tflite`,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.65,
      })
      self.postMessage({ type: 'ready' })
    } else if (message.type === 'frame' && detector) {
      const started = performance.now()
      const result = detector.detectForVideo(message.frame, message.timestamp)
      const bounds = result.detections.flatMap(({ boundingBox: box }) => box ? [{
        left: box.originX / message.frame.width, top: box.originY / message.frame.height,
        width: box.width / message.frame.width, height: box.height / message.frame.height,
      }] : [])
      self.postMessage({ type: 'count', count: result.detections.length, bounds, elapsedMs: performance.now() - started })
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : '检测器异常' })
  } finally {
    if (message.type === 'frame') message.frame.close()
  }
}
