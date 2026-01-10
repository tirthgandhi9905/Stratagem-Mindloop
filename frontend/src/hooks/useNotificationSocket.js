import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../config/firebase';

/**
 * Hook for connecting to the notification WebSocket and receiving events
 */
export function useNotificationSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState([]);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('[WS] No user logged in, skipping connection');
                return;
            }

            const token = await user.getIdToken();
            const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:9000'}/ws/notifications?token=${token}`;

            console.log('[WS] Connecting to notification socket...');

            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('[WS] Notification socket connected');
                setIsConnected(true);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[WS] Received event:', data.event, data.payload);

                    setEvents(prev => [...prev, {
                        id: Date.now(),
                        event: data.event,
                        payload: data.payload,
                        receivedAt: new Date(),
                    }]);
                } catch (err) {
                    console.error('[WS] Failed to parse message:', err);
                }
            };

            socket.onerror = (error) => {
                console.error('[WS] Socket error:', error);
            };

            socket.onclose = (event) => {
                console.log('[WS] Socket closed:', event.code, event.reason);
                setIsConnected(false);
                socketRef.current = null;

                // Reconnect after 5 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('[WS] Attempting to reconnect...');
                    connect();
                }, 5000);
            };

        } catch (error) {
            console.error('[WS] Connection error:', error);
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const clearEvent = useCallback((eventId) => {
        setEvents(prev => prev.filter(e => e.id !== eventId));
    }, []);

    const clearAllEvents = useCallback(() => {
        setEvents([]);
    }, []);

    // Connect when user is authenticated
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                connect();
            } else {
                disconnect();
            }
        });

        return () => {
            unsubscribe();
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        isConnected,
        events,
        clearEvent,
        clearAllEvents,
    };
}

/**
 * Hook specifically for task detection events
 */
export function useTaskDetectionEvents() {
    const { isConnected, events, clearEvent, clearAllEvents } = useNotificationSocket();

    const taskEvents = events.filter(e => e.event === 'TASK_DETECTED');
    const latestTaskEvent = taskEvents.length > 0 ? taskEvents[taskEvents.length - 1] : null;

    return {
        isConnected,
        taskEvents,
        latestTaskEvent,
        clearTaskEvent: clearEvent,
        clearAllTaskEvents: clearAllEvents,
    };
}

/**
 * Hook that auto-spawns bot windows when START_BOT events are received
 * Ensures only one bot per meeting
 */
export function useBotSpawner() {
    const { events, clearEvent } = useNotificationSocket();
    const spawnedMeetingsRef = useRef(new Set());

    useEffect(() => {
        const startBotEvents = events.filter(e => e.event === 'START_BOT');

        for (const event of startBotEvents) {
            const { meetingId, zoomMeetingNumber } = event.payload || {};

            if (!meetingId) {
                clearEvent(event.id);
                continue;
            }

            // Check if bot already spawned for this meeting
            if (spawnedMeetingsRef.current.has(meetingId)) {
                console.log(`[BotSpawner] Bot already spawned for meeting ${meetingId}`);
                clearEvent(event.id);
                continue;
            }

            // Spawn the bot
            console.log(`[BotSpawner] Spawning bot for meeting ${meetingId} (Zoom: ${zoomMeetingNumber})`);
            spawnedMeetingsRef.current.add(meetingId);

            // Open bot in a hidden/minimized window
            const botWindow = window.open(
                `/bot/zoom/${meetingId}`,
                `zoom-bot-${meetingId}`,
                'width=800,height=600,left=9999,top=9999'
            );

            if (botWindow) {
                console.log(`[BotSpawner] Bot window opened for meeting ${meetingId}`);
            } else {
                console.warn(`[BotSpawner] Failed to open bot window (popup blocked?)`);
                spawnedMeetingsRef.current.delete(meetingId);
            }

            clearEvent(event.id);
        }
    }, [events, clearEvent]);

    // Cleanup function to remove meeting from set when bot closes
    const onBotClosed = useCallback((meetingId) => {
        spawnedMeetingsRef.current.delete(meetingId);
        console.log(`[BotSpawner] Bot closed for meeting ${meetingId}`);
    }, []);

    return {
        spawnedMeetings: spawnedMeetingsRef.current,
        onBotClosed,
    };
}

export default useNotificationSocket;