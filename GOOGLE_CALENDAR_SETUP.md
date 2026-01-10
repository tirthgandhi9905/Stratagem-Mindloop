# Google Calendar Integration

This feature allows you to sync your Google Calendar events with the dashboard calendar view.

## Setup Instructions

### 1. Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Calendar API" and click on it
5. Click **Enable**

### 2. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application** as the application type
4. Configure the following:
   - **Name**: Stratagem Mindloop (or any name you prefer)
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173`
     - `http://localhost:5175`
     - Add your production domain when deployed
   - **Authorized redirect URIs**: 
     - `http://localhost:5173`
     - `http://localhost:5175`
     - Add your production domain when deployed
5. Click **Create**
6. Copy the **Client ID** that appears

### 3. Create API Key

1. Still in **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. (Optional) Click **Restrict Key** and:
   - Under **Application restrictions**, select **HTTP referrers**
   - Add: `http://localhost:*` and your production domain
   - Under **API restrictions**, select **Restrict key** and choose **Google Calendar API**
4. Copy the **API Key**

### 4. Update Environment Variables

1. Open your `frontend/.env` file
2. Add the following variables:
   ```env
   VITE_GOOGLE_API_KEY=your_api_key_here
   VITE_GOOGLE_CALENDAR_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```
3. Replace the placeholders with your actual credentials
4. Restart the frontend development server

## Usage

### Connecting to Google Calendar

1. Navigate to the **Calendar** page in your dashboard
2. You'll see a "Google Calendar" section with a **Connect to Google Calendar** button
3. Click the button to authenticate with your Google account
4. Grant the necessary permissions when prompted
5. Your Google Calendar events will now appear on the calendar view!

### Features

- **View Events**: See your Google Calendar events alongside your tasks
- **Distinct Styling**: Google Calendar events appear with a blue background and calendar icon (📅)
- **Direct Links**: Click on any Google Calendar event to open it in Google Calendar
- **Auto-Sync**: Events are automatically fetched when you change months
- **Manual Refresh**: Use the "Refresh" button to manually sync your events

### Event Display

- **Tasks**: Displayed with priority-based colors (red for high, amber for medium, green for low)
- **Google Events**: Displayed with a blue theme and calendar emoji
- **Combined View**: Up to 3 items per day (mix of tasks and events)
- **Overflow Indicator**: Shows "+X more" when there are more than 3 items

### Disconnecting

Click the **Disconnect** button in the Google Calendar section to sign out from Google Calendar. This will:
- Remove access to your calendar data
- Clear all loaded events from the view
- You can reconnect anytime by signing in again

## Troubleshooting

### "Google Calendar API credentials not configured"

- Make sure you've added `VITE_GOOGLE_API_KEY` and `VITE_GOOGLE_CALENDAR_CLIENT_ID` to your `.env` file
- Restart the development server after adding environment variables

### OAuth Error or Invalid Client

- Verify your OAuth 2.0 Client ID configuration in Google Cloud Console
- Ensure the redirect URI matches exactly (including protocol and port)
- Check that the Google Calendar API is enabled for your project

### Events Not Showing

- Click the "Refresh" button to manually sync
- Check the browser console for any error messages
- Verify you have events in your Google Calendar for the current month

### CORS Errors

- Make sure your domain is added to the authorized JavaScript origins
- For localhost, include the specific port (e.g., `http://localhost:5175`)

## Privacy & Security

- **Client-Side Only**: Authentication happens entirely in the browser
- **No Server Storage**: We don't store your Google credentials or calendar data on our servers
- **Read-Only Access**: The app only reads your calendar events (unless write permissions are explicitly requested)
- **User Control**: You can disconnect anytime and revoke access from your Google Account settings

## Permissions Required

The app requests the following Google Calendar scopes:
- `https://www.googleapis.com/auth/calendar.readonly` - Read your calendar events
- `https://www.googleapis.com/auth/calendar.events` - Manage calendar events (for future features)

You can revoke these permissions anytime from [Google Account Permissions](https://myaccount.google.com/permissions).
