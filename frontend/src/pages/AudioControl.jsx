import { useState, useCallback, useEffect, useRef } from "react";
import { transcriptBuffer } from "../services/TranscriptBuffer";

// Deepgram API key from environment
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;

const AudioControl = () => {
    const [isCapturing, setIsCapturing] = useState(false);
    const [rms, setRms] = useState(0);
    const [frameCount, setFrameCount] = useState(0);
    const [status, setStatus] = useState("Ready to capture audio");
    const [error, setError] = useState("");
    const [isConnectedToDeepgram, setIsConnectedToDeepgram] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [finalTranscript, setFinalTranscript] = useState("");
    const [bufferStats, setBufferStats] = useState({ bufferSize: 0, regexHitSinceLastCall: false, timeUntilNextCall: 60 });

    const mediaStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const animationFrameRef = useRef(null);
    const deepgramSocketRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAudioCapture();
        };
    }, []);

    // Convert Float32Array to Int16Array (linear16)
    const float32ToInt16 = (float32Array) => {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            // Clamp between -1 and 1
            const clamped = Math.max(-1, Math.min(1, float32Array[i]));
            // Convert to Int16
            int16Array[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
        }
        return int16Array;
    };

    // Connect to Deepgram WebSocket
    const connectToDeepgram = useCallback(() => {
        if (!DEEPGRAM_API_KEY) {
            console.error("VITE_DEEPGRAM_API_KEY is not set");
            setError("Deepgram API key is missing. Set VITE_DEEPGRAM_API_KEY in .env");
            return null;
        }

        const params = new URLSearchParams({
            encoding: "linear16",
            sample_rate: "48000",
            channels: "1",
            punctuate: "true",
            interim_results: "true",
            endpointing: "300"
        });

        const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

        console.log("Connecting to Deepgram...");
        const socket = new WebSocket(url, ["token", DEEPGRAM_API_KEY]);

        socket.onopen = () => {
            console.log("Deepgram WebSocket connected");
            setIsConnectedToDeepgram(true);
            setStatus("Connected to Deepgram - Streaming audio...");
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Extract transcript
                const transcript = data?.channel?.alternatives?.[0]?.transcript || "";
                const isFinal = data?.is_final || false;

                if (transcript) {
                    if (isFinal) {
                        // Final result - log boldly
                        console.log("%c[FINAL] " + transcript, "font-weight: bold; color: #4ade80;");
                        setFinalTranscript(prev => prev + (prev ? " " : "") + transcript);
                        setInterimTranscript("");

                        // Add to transcript buffer for intent detection
                        transcriptBuffer.addTranscript(transcript);

                        // Update buffer stats
                        setBufferStats(transcriptBuffer.getStats());

                        // Try to call Gemini if conditions are met
                        transcriptBuffer.tryCallGemini().then(result => {
                            if (result) {
                                setBufferStats(transcriptBuffer.getStats());
                            }
                        });
                    } else {
                        // Interim result - log in gray
                        console.log("%c[INTERIM] " + transcript, "color: #9ca3af;");
                        setInterimTranscript(transcript);
                    }
                }
            } catch (err) {
                console.error("Error parsing Deepgram message:", err);
            }
        };

        socket.onerror = (err) => {
            console.error("Deepgram WebSocket error:", err);
            setError("Deepgram connection error");
        };

        socket.onclose = (event) => {
            console.log("Deepgram WebSocket closed:", event.code, event.reason);
            setIsConnectedToDeepgram(false);
        };

        return socket;
    }, []);

    const startAudioCapture = useCallback(async () => {
        try {
            setStatus("Requesting screen/tab share with audio...");
            setError("");
            setFinalTranscript("");
            setInterimTranscript("");

            // Request display media with audio
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true, // Required for getDisplayMedia
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    sampleRate: 48000
                }
            });

            // Check if audio track is present
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error("No audio track found. Make sure to check 'Share tab audio' when selecting the tab.");
            }

            console.log("Audio track obtained:", audioTracks[0].label);
            setStatus(`Capturing: ${audioTracks[0].label}`);

            // Store the stream for cleanup
            mediaStreamRef.current = stream;

            // Connect to Deepgram
            const deepgramSocket = connectToDeepgram();
            if (deepgramSocket) {
                deepgramSocketRef.current = deepgramSocket;
            }

            // Create AudioContext for processing
            const audioContext = new AudioContext({ sampleRate: 48000 });
            audioContextRef.current = audioContext;

            // Create source from the stream
            const source = audioContext.createMediaStreamSource(stream);

            // Create a ScriptProcessor for RMS calculation and audio streaming
            const bufferSize = 4096;
            const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
            let frames = 0;

            scriptProcessor.onaudioprocess = (event) => {
                frames++;
                setFrameCount(frames);

                // Access Float32Array samples from input buffer
                const inputData = event.inputBuffer.getChannelData(0);

                // Compute RMS: sum of squares, then sqrt(mean)
                let sumOfSquares = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sumOfSquares += inputData[i] * inputData[i];
                }
                const meanSquare = sumOfSquares / inputData.length;
                const rmsValue = Math.sqrt(meanSquare);

                // Update state
                setRms(rmsValue);

                // Log RMS every ~20 frames
                if (frames % 20 === 0) {
                    console.log("RMS:", rmsValue.toFixed(4));
                }

                // Send audio to Deepgram if connected
                if (deepgramSocketRef.current && deepgramSocketRef.current.readyState === WebSocket.OPEN) {
                    // Convert Float32 to Int16 (linear16)
                    const int16Data = float32ToInt16(inputData);
                    // Send as ArrayBuffer
                    deepgramSocketRef.current.send(int16Data.buffer);
                }
            };

            // Connect source to processor (need to connect to destination for scriptProcessor to work)
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            setIsCapturing(true);

            // Handle stream end (user stops sharing)
            stream.getVideoTracks()[0].onended = () => {
                console.log("Screen sharing stopped by user");
                stopAudioCapture();
            };

        } catch (err) {
            console.error("Error starting audio capture:", err);
            setError(err.message || "Failed to start audio capture");
            setStatus("Capture failed");
        }
    }, [connectToDeepgram]);

    const stopAudioCapture = useCallback(() => {
        // Close Deepgram WebSocket
        if (deepgramSocketRef.current) {
            if (deepgramSocketRef.current.readyState === WebSocket.OPEN) {
                deepgramSocketRef.current.close();
            }
            deepgramSocketRef.current = null;
        }

        // Stop animation frame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Stop all tracks
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        // Clear transcript buffer
        transcriptBuffer.clear();

        setIsCapturing(false);
        setIsConnectedToDeepgram(false);
        setRms(0);
        setFrameCount(0);
        setBufferStats({ bufferSize: 0, regexHitSinceLastCall: false, timeUntilNextCall: 60 });
        setStatus("Capture stopped");
    }, []);

    // Convert RMS to a visual percentage (RMS is typically 0-1, but speech is often 0-0.3)
    const rmsPercentage = Math.min(rms * 300, 100);

    return (
        <div style={{ minHeight: '100vh', overflowY: 'auto' }} className="bg-gray-900 text-white p-6">
            {/* Hide Zoom SDK overlay and force scrolling */}
            <style>{`
                #zmmtg-root {
                    display: none !important;
                    position: absolute !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                html, body, #root {
                    overflow: auto !important;
                    overflow-y: auto !important;
                    height: auto !important;
                    min-height: auto !important;
                    position: static !important;
                }
                body {
                    overflow-y: scroll !important;
                }
            `}</style>

            <h1 className="text-xl font-bold mb-4 text-center">Audio Control Panel</h1>

            <div className="flex gap-6 max-w-5xl mx-auto">
                {/* Left Column - Controls */}
                <div className="w-80 flex-shrink-0">
                    {/* Status */}
                    <div className="mb-4 p-3 bg-gray-800 rounded">
                        <p className="text-sm text-gray-400">Status</p>
                        <p className="font-medium">{status}</p>
                        {isConnectedToDeepgram && (
                            <p className="text-xs text-green-400 mt-1">● Connected to Deepgram</p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded">
                            <p className="text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="mb-6 flex gap-2">
                        {!isCapturing ? (
                            <button
                                onClick={startAudioCapture}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded font-bold transition-colors"
                            >
                                Start Audio Capture
                            </button>
                        ) : (
                            <button
                                onClick={stopAudioCapture}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded font-bold transition-colors"
                            >
                                Stop Audio Capture
                            </button>
                        )}
                    </div>

                    {/* RMS Display */}
                    {isCapturing && (
                        <div className="space-y-4">
                            {/* RMS Value */}
                            <div className="p-4 bg-gray-800 rounded">
                                <p className="text-sm text-gray-400 mb-1">RMS Level</p>
                                <p className="text-3xl font-mono font-bold text-green-400">
                                    {rms.toFixed(4)}
                                </p>
                            </div>

                            {/* RMS Visual Bar */}
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Audio Level</p>
                                <div className="w-full h-6 bg-gray-800 rounded overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-75"
                                        style={{ width: `${rmsPercentage}%` }}
                                    />
                                </div>
                            </div>

                            {/* Frame Counter */}
                            <div className="p-3 bg-gray-800 rounded">
                                <p className="text-sm text-gray-400">Frames Processed</p>
                                <p className="font-mono text-lg">{frameCount}</p>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="mt-6 p-4 bg-gray-800/50 rounded text-sm text-gray-400">
                        <p className="font-medium text-gray-300 mb-2">Instructions:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Click "Start Audio Capture"</li>
                            <li>Select the Zoom meeting tab</li>
                            <li>Check "Share tab audio" checkbox</li>
                            <li>Live transcripts will appear on the right</li>
                        </ol>
                    </div>
                </div>

                {/* Right Column - Live Transcript */}
                <div className="flex-1 min-w-0">
                    <div className="p-4 bg-gray-800 rounded h-full min-h-[400px]">
                        <p className="text-sm text-gray-400 mb-3 font-medium">Live Transcript</p>
                        <div className="text-sm leading-relaxed">
                            {finalTranscript && (
                                <span className="text-white">{finalTranscript} </span>
                            )}
                            {interimTranscript && (
                                <span className="text-gray-400 italic">{interimTranscript}</span>
                            )}
                            {!finalTranscript && !interimTranscript && (
                                <span className="text-gray-500">Waiting for speech...</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioControl;