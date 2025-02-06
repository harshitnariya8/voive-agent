# OpenAI Realtime Voice Assistant

## Prerequisites
- Node.js (v16 or later)
- npm
- OpenAI API Key

## Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open `http://localhost:3000` in a WebRTC-compatible browser

## Features
- WebRTC-based real-time communication
- Voice interaction with OpenAI's Realtime API
- Simple, responsive UI
- Conversation logging

## Notes
- Requires a modern browser with WebRTC support
- Microphone access is required
- Ephemeral tokens are used for secure client-side authentication

## Troubleshooting
- Ensure you have a valid OpenAI API key
- Check browser console for any connection errors
- Verify microphone permissions
