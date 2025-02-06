class RealtimeVoiceAssistant {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.ephemeralKey = null;
        this.sessionId = null;
        this.audioElement = null;
        this.selectedLanguage = 'english';

        // UI Elements
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.connectionStatus = document.getElementById('connection-status');
        this.conversationLog = document.getElementById('conversation-log');
        this.languageSelect = document.getElementById('language-select');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.initWebRTCSession());
        this.stopBtn.addEventListener('click', () => this.endWebRTCSession());
        this.languageSelect.addEventListener('change', (e) => {
            this.selectedLanguage = e.target.value;
            if (this.peerConnection) {
                // If already connected, reconnect with new language
                this.endWebRTCSession();
                this.initWebRTCSession();
            }
        });
    }

    async initWebRTCSession() {
        try {
            // Fetch ephemeral key with language preference
            const tokenResponse = await fetch("/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    language: this.selectedLanguage
                })
            });
            const data = await tokenResponse.json();
            
            console.log('Session Response:', data);
            
            if (!data || data.error) {
                throw new Error(data.error || 'Failed to get session token');
            }

            // Store the token and session info
            this.ephemeralKey = data.token;
            this.sessionId = data.session_id;
            
            if (!this.ephemeralKey) {
                console.error('Full response:', data);
                throw new Error('No valid token found in the response');
            }

            console.log('Session established:', {
                sessionId: this.sessionId,
                expiresAt: data.expires_at
            });

            // Create peer connection with STUN server
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });

            // Log ICE connection state changes
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE Connection State:', this.peerConnection.iceConnectionState);
                this.logMessage(`ICE Connection State: ${this.peerConnection.iceConnectionState}`, "system");
            };

            // Log signaling state changes
            this.peerConnection.onsignalingstatechange = () => {
                console.log('Signaling State:', this.peerConnection.signalingState);
            };
            
            // Handle ICE candidates
            this.peerConnection.onicecandidate = event => {
                console.log('ICE Candidate:', event.candidate);
            };

            // Setup audio and video elements
            this.audioElement = document.createElement("audio");
            this.audioElement.autoplay = true;
            
            // Add local audio and video tracks
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true,
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user"
                    }
                });
                
                mediaStream.getTracks().forEach(track => {
                    console.log('Adding local track:', track);
                    this.peerConnection.addTrack(track, mediaStream);
                });

                // Handle remote tracks
                this.peerConnection.ontrack = e => {
                    console.log('Received remote track:', e);
                    if (e.track.kind === 'audio') {
                        this.audioElement.srcObject = new MediaStream([e.track]);
                    }
                };

            } catch (mediaError) {
                console.error('Media access error:', mediaError);
                throw new Error(`Media access error: ${mediaError.message}`);
            }

            // Create data channel
            this.dataChannel = this.peerConnection.createDataChannel("oai-events");
            this.setupDataChannelHandlers();

            // Create and set local description
            const offer = await this.peerConnection.createOffer();
            console.log('Created offer:', offer);
            await this.peerConnection.setLocalDescription(offer);

            // Send offer to OpenAI Realtime API
            const baseUrl = "https://api.openai.com/v1/realtime";
            const model = "gpt-4o-realtime-preview-2024-12-17";
            
            console.log('Sending SDP to OpenAI:', offer.sdp);
            
            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${this.ephemeralKey}`,
                    "Content-Type": "application/sdp"
                },
            });

            if (!sdpResponse.ok) {
                const errorText = await sdpResponse.text();
                throw new Error(`OpenAI SDP error: ${errorText}`);
            }

            const sdpAnswer = await sdpResponse.text();
            console.log('Received SDP answer:', sdpAnswer);

            const answer = {
                type: "answer",
                sdp: sdpAnswer,
            };

            await this.peerConnection.setRemoteDescription(answer);

            // Update UI
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.connectionStatus.textContent = "Connected";
            this.logMessage("Connected to OpenAI Realtime API", "system");

        } catch (error) {
            console.error("WebRTC Session Initialization Error:", error);
            this.logMessage(`Connection Error: ${error.message}`, "error");
            this.connectionStatus.textContent = "Connection Failed";
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
    }

    setupDataChannelHandlers() {
        this.dataChannel.addEventListener("open", () => {
            this.logMessage("Data channel opened", "system");
            
            // Initial interaction
            const initialEvent = {
                type: "response.create",
                response: {
                    modalities: ["text"],
                    instructions: "Let's have a friendly conversation. I'm ready to chat!"
                }
            };
            this.dataChannel.send(JSON.stringify(initialEvent));
        });

        this.dataChannel.addEventListener("message", (e) => {
            try {
                const realtimeEvent = JSON.parse(e.data);
                this.handleRealtimeEvent(realtimeEvent);
            } catch (error) {
                console.error("Error parsing event:", error);
            }
        });
    }

    handleRealtimeEvent(event) {
        switch (event.type) {
            case "text":
                this.logMessage(event.text, "assistant");
                break;
            case "function_call":
                this.logMessage("Function call received", "system");
                break;
            default:
                console.log("Unhandled event:", event);
        }
    }

    endWebRTCSession() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Reset UI
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.connectionStatus.textContent = "Not Connected";
        this.logMessage("Disconnected from OpenAI Realtime API", "system");
    }

    logMessage(message, type = "user") {
        const messageEl = document.createElement('div');
        messageEl.classList.add(
            'p-2', 'rounded', 'my-1', 
            type === 'user' ? 'bg-blue-100' : 
            type === 'assistant' ? 'bg-green-100' : 
            'bg-gray-200'
        );
        messageEl.textContent = message;
        this.conversationLog.appendChild(messageEl);
        this.conversationLog.scrollTop = this.conversationLog.scrollHeight;
    }
}

// Initialize the voice assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RealtimeVoiceAssistant();
});
