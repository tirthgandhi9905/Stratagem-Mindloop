import { useBotSpawner } from '../hooks/useNotificationSocket';

/**
 * Global component that listens for START_BOT events and spawns bot windows
 * Must be mounted within the app to auto-spawn bots when meetings start
 */
const BotSpawner = () => {
    // This hook handles everything - spawning bots on START_BOT events
    useBotSpawner();

    // No UI - this is a purely functional component
    return null;
};

export default BotSpawner;