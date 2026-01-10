import { useTaskApproval } from '../context/TaskApprovalContext';
import TaskApprovalModal from './TaskApprovalModal';

/**
 * Global task approval popup that listens for TASK_DETECTED WebSocket events
 * and shows the approval modal to managers
 */
const TaskApprovalPopup = () => {
    const {
        pendingApproval,
        isLoading,
        handleApprove,
        handleReject,
        handleClose,
    } = useTaskApproval();

    if (!pendingApproval) {
        return null;
    }

    return (
        <TaskApprovalModal
            pendingId={pendingApproval.pendingId}
            meetingId={pendingApproval.meetingId}
            taskCandidates={pendingApproval.taskCandidates}
            onApprove={handleApprove}
            onReject={handleReject}
            onClose={handleClose}
            isLoading={isLoading}
        />
    );
};

export default TaskApprovalPopup;