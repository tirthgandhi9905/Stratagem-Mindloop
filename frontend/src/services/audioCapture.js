import * as meetingSocket from './meetingSocket'

const TARGET_SAMPLE_RATE = 16000
const BUFFER_SIZE = 1024
const CHUNK_DURATION_MS = 40
const MIN_CHUNK_DURATION_MS = 20
const MAX_CHUNK_DURATION_MS = 100
const CHUNK_SIZE_SAMPLES = Math.floor((TARGET_SAMPLE_RATE * CHUNK_DURATION_MS) / 1000)
const MIN_CHUNK_SAMPLES = Math.floor((TARGET_SAMPLE_RATE * MIN_CHUNK_DURATION_MS) / 1000)
const MAX_CHUNK_SAMPLES = Math.ceil((TARGET_SAMPLE_RATE * MAX_CHUNK_DURATION_MS) / 1000)
const SILENCE_TIMEOUT_MS = 2000
const SILENCE_CHECK_MS = 1000

let mediaStream = null
let audioContext = null
let mediaSourceNode = null
let processorNode = null
let sinkNode = null
let isCapturing = false
let pendingSamples = new Float32Array(0)
let metadataLogged = false
let mediaStreamInactiveHandler = null
let silenceIntervalId = null
let lastChunkSentTs = 0

const requestAudioStream = async () => {
	try {
		const stream = await navigator.mediaDevices.getDisplayMedia({
			audio: true,
			video: false,
		})
		return { stream, usedVideoFallback: false }
	} catch (err) {
		if (err?.name !== 'NotSupportedError') {
			throw err
		}
		console.warn('[AudioCapture] audio-only capture not supported, requesting silent video fallback')
		const stream = await navigator.mediaDevices.getDisplayMedia({
			audio: true,
			video: {
				frameRate: 1,
				width: 320,
				height: 200,
				displaySurface: 'browser',
			},
		})
		return { stream, usedVideoFallback: true }
	}
}

const ensureDisplayMediaSupport = () => {
	if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
		throw new Error('Tab audio capture is not supported in this browser')
	}
}

const ensureSocketReadyForMeeting = (meetingId) => {
	if (!meetingSocket.isConnected || !meetingSocket.isConnected()) {
		throw new Error('WebSocket connection must be established before starting audio capture')
	}
	const activeMeetingId = meetingSocket.getActiveMeetingId?.()
	if (meetingId && activeMeetingId && activeMeetingId !== meetingId) {
		throw new Error('WebSocket is connected to a different meeting')
	}
}

const downmixToMono = (audioBuffer) => {
	const { numberOfChannels, length } = audioBuffer
	if (numberOfChannels === 1) {
		return audioBuffer.getChannelData(0).slice(0)
	}
	const mono = new Float32Array(length)
	for (let channel = 0; channel < numberOfChannels; channel += 1) {
		const channelData = audioBuffer.getChannelData(channel)
		for (let i = 0; i < length; i += 1) {
			mono[i] += channelData[i] / numberOfChannels
		}
	}
	return mono
}

const resampleToTargetRate = (input, originSampleRate) => {
	if (originSampleRate === TARGET_SAMPLE_RATE) {
		return input
	}

	const sampleRateRatio = originSampleRate / TARGET_SAMPLE_RATE
	const newLength = Math.round(input.length / sampleRateRatio)
	const output = new Float32Array(newLength)

	for (let i = 0; i < newLength; i += 1) {
		const originIndex = i * sampleRateRatio
		const lowerIndex = Math.floor(originIndex)
		const upperIndex = Math.min(lowerIndex + 1, input.length - 1)
		const interpolation = originIndex - lowerIndex
		output[i] = input[lowerIndex] + (input[upperIndex] - input[lowerIndex]) * interpolation
	}

	return output
}

const floatTo16BitPCM = (float32Data) => {
	const buffer = new ArrayBuffer(float32Data.length * 2)
	const view = new DataView(buffer)
	for (let i = 0; i < float32Data.length; i += 1) {
		const sample = Math.max(-1, Math.min(1, float32Data[i]))
		view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
	}
	return buffer
}

const bufferToBase64 = (buffer) => {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	const chunkSize = 0x8000
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize)
		binary += String.fromCharCode(...chunk)
	}
	return btoa(binary)
}

const logAudioMetadata = (sampleRate, channelCount) => {
	if (metadataLogged) {
		return
	}
	console.info('[AudioCapture] start sampleRate:', sampleRate, 'Hz channels:', channelCount, 'bufferSize:', BUFFER_SIZE)
	metadataLogged = true
}

const appendSamples = (newSamples) => {
	if (!newSamples?.length) {
		return
	}
	const combined = new Float32Array(pendingSamples.length + newSamples.length)
	combined.set(pendingSamples, 0)
	combined.set(newSamples, pendingSamples.length)
	pendingSamples = combined
}

const safeStopCapture = () => {
	stopAudioCapture().catch(() => {})
}

const sendChunk = (floatChunk) => {
	if (!floatChunk?.length) {
		return
	}
	const pcmBuffer = floatTo16BitPCM(floatChunk)
	const base64Chunk = bufferToBase64(pcmBuffer)
	if (!base64Chunk.length) {
		return
	}
	const durationMs = Math.round((floatChunk.length / TARGET_SAMPLE_RATE) * 1000)
	console.log('[AudioCapture] sent chunk size:', floatChunk.length, 'samples (~', durationMs, 'ms)')
	lastChunkSentTs = Date.now()
	console.log("[AudioCapture] sending PCM bytes:", pcmBuffer.byteLength);
	try {
		meetingSocket.sendMeetingData({
			audio_chunk: base64Chunk,
			timestamp: Date.now(),
		})
	} catch (err) {
		console.error('[AudioCapture] socket send failed:', err.message)
		safeStopCapture()
	}
}

const consumeChunks = () => {
	while (pendingSamples.length >= MIN_CHUNK_SAMPLES) {
		const chunkLength = Math.min(CHUNK_SIZE_SAMPLES, pendingSamples.length, MAX_CHUNK_SAMPLES)
		const chunk = pendingSamples.slice(0, chunkLength)
		pendingSamples = pendingSamples.slice(chunkLength)
		sendChunk(chunk)
	}
}

const sendSilenceIfIdle = () => {
	if (!isCapturing) {
		return
	}
	const now = Date.now()
	if (now - lastChunkSentTs < SILENCE_TIMEOUT_MS) {
		return
	}
	const silentSamples = new Float32Array(CHUNK_SIZE_SAMPLES)
	sendChunk(silentSamples)
}

const startSilenceMonitor = () => {
	stopSilenceMonitor()
	lastChunkSentTs = Date.now()
	silenceIntervalId = window.setInterval(sendSilenceIfIdle, SILENCE_CHECK_MS)
}

const stopSilenceMonitor = () => {
	if (silenceIntervalId) {
		clearInterval(silenceIntervalId)
		silenceIntervalId = null
	}
}

const handleAudioProcess = (event) => {
	if (!isCapturing || !audioContext) {
		return
	}
	const monoData = downmixToMono(event.inputBuffer)
	console.log("[AudioCapture] raw buffer energy:", event.inputBuffer.getChannelData(0).slice(0, 5));
	const resampled = resampleToTargetRate(monoData, audioContext.sampleRate)
	if (!resampled.length) {
		return
	}
	appendSamples(resampled)
	consumeChunks()
}

export const startAudioCapture = async (meetingId) => {
	if (isCapturing) {
		throw new Error('Audio capture is already running')
	}
	if (!meetingId) {
		throw new Error('meetingId is required to capture audio')
	}

	ensureDisplayMediaSupport()
	ensureSocketReadyForMeeting(meetingId)
	pendingSamples = new Float32Array(0)
	metadataLogged = false

	try {
		const { stream, usedVideoFallback } = await requestAudioStream()
		mediaStream = stream

		audioContext = new (window.AudioContext || window.webkitAudioContext)()
		await audioContext.resume()

		mediaSourceNode = audioContext.createMediaStreamSource(mediaStream)
		processorNode = audioContext.createScriptProcessor(BUFFER_SIZE, mediaSourceNode.channelCount || 1, 1)
		sinkNode = audioContext.createGain()
		sinkNode.gain.value = 0

		processorNode.onaudioprocess = handleAudioProcess
		audioContext.onstatechange = () => {
			if (audioContext?.state === 'suspended') {
				audioContext.resume().catch((err) => {
					console.error('[AudioCapture] failed to resume AudioContext:', err.message)
					safeStopCapture()
				})
			}
		}

		mediaSourceNode.connect(processorNode)
		processorNode.connect(sinkNode)
		sinkNode.connect(audioContext.destination)

		const channelCount = mediaSourceNode.channelCount || mediaStream.getAudioTracks()[0]?.getSettings?.().channelCount || 1
		logAudioMetadata(audioContext.sampleRate, channelCount)
		if (usedVideoFallback) {
			console.info('[AudioCapture] running with video fallback; video track will be ignored')
		}

		mediaStream.getTracks().forEach((track) => {
			track.onended = () => {
				console.warn('[AudioCapture] capture track ended')
				safeStopCapture()
			}
		})
		if (typeof mediaStream.addEventListener === 'function') {
			mediaStreamInactiveHandler = () => {
				console.warn('[AudioCapture] media stream became inactive')
				safeStopCapture()
			}
			mediaStream.addEventListener('inactive', mediaStreamInactiveHandler)
		}
		startSilenceMonitor()
		isCapturing = true
	} catch (err) {
		await stopAudioCapture()
		if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
			throw new Error('Permission to capture tab audio was denied')
		}
		throw err
	}
}

export const stopAudioCapture = async () => {
	if (!isCapturing && !mediaStream && !audioContext) {
		return
	}
	isCapturing = false
	pendingSamples = new Float32Array(0)
	metadataLogged = false
	stopSilenceMonitor()

	if (processorNode) {
		processorNode.disconnect()
		processorNode.onaudioprocess = null
		processorNode = null
	}

	if (mediaSourceNode) {
		mediaSourceNode.disconnect()
		mediaSourceNode = null
	}

	if (sinkNode) {
		sinkNode.disconnect()
		sinkNode = null
	}

	if (mediaStream) {
		if (mediaStreamInactiveHandler && typeof mediaStream.removeEventListener === 'function') {
			mediaStream.removeEventListener('inactive', mediaStreamInactiveHandler)
			mediaStreamInactiveHandler = null
		}
		mediaStream.getTracks().forEach((track) => {
			track.onended = null
			track.stop()
		})
		mediaStream = null
	}

	if (audioContext) {
		audioContext.onstatechange = null
		try {
			await audioContext.close()
		} catch (err) {
			// Suppress close errors during teardown
		}
		audioContext = null
	}
}
