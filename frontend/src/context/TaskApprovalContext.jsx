import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTaskDetectionEvents } from '../hooks/useNotificationSocket';
import { approveTask, rejectTask } from '../services/tasksApi';
import { auth } from '../config/firebase';

const TaskApprovalContext = createContext({});

/**
 * Provider for managing task approval state and WebSocket events
 */
export function TaskApprovalProvider({ children }) {
    const { taskEvents, clearTaskEvent, isConnected } = useTaskDetectionEvents();
    const [pendingApproval, setPendingApproval] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Check if user is a manager (simplified - actual role check should come from backend)
    useEffect(() => {
        const checkUserRole = async () => {
            const user = auth.currentUser;
            if (user) {
                // Get custom claims or fetch from API
                try {
                    const tokenResult = await user.getIdTokenResult();
                    const claims = tokenResult.claims;
                    // Check if user has manager role
                    // This is a simplified check - in production, verify with backend
                    setUserRole(claims.role || 'EMPLOYEE');
                } catch (error) {
                    console.error('Failed to get user role:', error);
                    setUserRole('EMPLOYEE');
                }
            }
        };

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                checkUserRole();
            } else {
                setUserRole(null);
            }
        });

        return unsubscribe;
    }, []);

    // Handle incoming task detection events
    useEffect(() => {
        if (taskEvents.length > 0) {
            const latestEvent = taskEvents[taskEvents.length - 1];

            // For now, show popup to all users - backend will enforce access
            // In production, check userRole === 'MANAGER' || userRole === 'ORG_ADMIN'
            console.log('[TaskApproval] Received task detection event:', latestEvent);

            setPendingApproval({
                eventId: latestEvent.id,
                pendingId: latestEvent.payload.pendingId,
                meetingId: latestEvent.payload.meetingId,
                teamId: latestEvent.payload.teamId,
                taskCandidates: latestEvent.payload.taskCandidates || [],
            });
        }
    }, [taskEvents]);

    const handleApprove = useCallback(async (pendingId, taskIndex, edits, createGithubIssue) => {
        setIsLoading(true);
        try {
            const result = await approveTask(pendingId, taskIndex, edits, createGithubIssue);
            console.log('[TaskApproval] Task approved:', result);
            return result;
        } catch (error) {
            console.error('[TaskApproval] Approve failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleReject = useCallback(async (pendingId, taskIndex, reason = null) => {
        setIsLoading(true);
        try {
            const result = await rejectTask(pendingId, taskIndex, reason);
            console.log('[TaskApproval] Task rejected:', result);
            return result;
        } catch (error) {
            console.error('[TaskApproval] Reject failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleClose = useCallback(() => {
        if (pendingApproval?.eventId) {
            clearTaskEvent(pendingApproval.eventId);
        }
        setPendingApproval(null);
    }, [pendingApproval, clearTaskEvent]);

    const value = {
        pendingApproval,
        userRole,
        isLoading,
        isConnected,
        handleApprove,
        handleReject,
        handleClose,
    };

    return (
        <TaskApprovalContext.Provider value={value}>
            {children}
        </TaskApprovalContext.Provider>
    );
}

export function useTaskApproval() {
    const context = useContext(TaskApprovalContext);
    if (!context) {
        throw new Error('useTaskApproval must be used within TaskApprovalProvider');
    }
    return context;
}

export default TaskApprovalContext;