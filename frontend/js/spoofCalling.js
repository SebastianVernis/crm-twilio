// Spoof Calling Module
class SpoofCalling {
    constructor() {
        this.baseUrl = window.location.origin;
        this.activeSessions = new Map();
        this.init();
    }

    init() {
        this.createSpoofInterface();
        this.bindEvents();
    }

    createSpoofInterface() {
        const spoofSection = document.createElement('div');
        spoofSection.className = 'module spoof-controls';
        spoofSection.innerHTML = `
            <h3><i class="fas fa-mask"></i> Spoof Calling Controls</h3>
            <div class="spoof-form">
                <div>
                    <label for="spoofTargetNumber">Target Number:</label>
                    <input type="tel" id="spoofTargetNumber" placeholder="+1234567890" required>
                </div>
                <div>
                    <label for="spoofCallerID">Spoof Caller ID:</label>
                    <input type="tel" id="spoofCallerID" placeholder="+0987654321" required>
                </div>
                <div>
                    <label for="spoofMessage">Custom Message:</label>
                    <input type="text" id="spoofMessage" placeholder="Connecting your call..." maxlength="500">
                </div>
                <div>
                    <label>
                        <input type="checkbox" id="recordCall"> Record Call
                    </label>
                    <label>
                        <input type="checkbox" id="useConference"> Use Conference Mode
                    </label>
                </div>
            </div>
            
            <div class="voice-options">
                <div class="voice-option active" data-voice="alice">Alice (Female)</div>
                <div class="voice-option" data-voice="man">Man</div>
                <div class="voice-option" data-voice="woman">Woman</div>
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 12px;">
                <button id="startSpoofCall" class="btn-success">
                    <i class="fas fa-phone"></i> Start Spoof Call
                </button>
                <button id="sendSpoofSMS" class="btn-secondary">
                    <i class="fas fa-sms"></i> Send Spoof SMS
                </button>
            </div>
            
            <div id="activeSessionsContainer"></div>
        `;

        // Insert after the existing modules
        const existingModules = document.querySelector('.module');
        if (existingModules) {
            existingModules.parentNode.insertBefore(spoofSection, existingModules.nextSibling);
        } else {
            document.querySelector('#app-container').appendChild(spoofSection);
        }
    }

    bindEvents() {
        // Voice option selection
        document.querySelectorAll('.voice-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.voice-option').forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Start spoof call
        document.getElementById('startSpoofCall').addEventListener('click', () => {
            this.startSpoofCall();
        });

        // Send spoof SMS
        document.getElementById('sendSpoofSMS').addEventListener('click', () => {
            this.sendSpoofSMS();
        });
    }

    async startSpoofCall() {
        const targetNumber = document.getElementById('spoofTargetNumber').value.trim();
        const spoofNumber = document.getElementById('spoofCallerID').value.trim();
        const message = document.getElementById('spoofMessage').value.trim();
        const record = document.getElementById('recordCall').checked;
        const useConference = document.getElementById('useConference').checked;
        const selectedVoice = document.querySelector('.voice-option.active').dataset.voice;

        if (!targetNumber || !spoofNumber) {
            this.showToast('Please enter both target number and spoof caller ID', 'error');
            return;
        }

        if (!this.validatePhoneNumber(targetNumber) || !this.validatePhoneNumber(spoofNumber)) {
            this.showToast('Please enter valid phone numbers', 'error');
            return;
        }

        const button = document.getElementById('startSpoofCall');
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="spinner"></div> Initiating...';
        button.disabled = true;

        try {
            const response = await fetch(`${this.baseUrl}/api/spoof/call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: targetNumber,
                    spoofNumber: spoofNumber,
                    message: message || 'Connecting your call...',
                    record: record,
                    useConference: useConference,
                    voiceModulation: {
                        voice: selectedVoice,
                        language: 'en-US'
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Spoof call initiated successfully!', 'success');
                this.addActiveSession(result);
                this.clearForm();
            } else {
                this.showToast(`Error: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Error starting spoof call:', error);
            this.showToast('Failed to start spoof call', 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async sendSpoofSMS() {
        const targetNumber = document.getElementById('spoofTargetNumber').value.trim();
        const spoofNumber = document.getElementById('spoofCallerID').value.trim();
        
        if (!targetNumber || !spoofNumber) {
            this.showToast('Please enter both target number and spoof caller ID', 'error');
            return;
        }

        const smsBody = prompt('Enter SMS message:');
        if (!smsBody) return;

        const button = document.getElementById('sendSpoofSMS');
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="spinner"></div> Sending...';
        button.disabled = true;

        try {
            const response = await fetch(`${this.baseUrl}/api/spoof/sms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: targetNumber,
                    body: smsBody,
                    from: spoofNumber
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Spoof SMS sent successfully!', 'success');
            } else {
                this.showToast(`Error: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Error sending spoof SMS:', error);
            this.showToast('Failed to send spoof SMS', 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    addActiveSession(sessionData) {
        this.activeSessions.set(sessionData.sessionId, sessionData);
        this.updateActiveSessionsDisplay();
        
        // Poll for session status updates
        this.pollSessionStatus(sessionData.sessionId);
    }

    async pollSessionStatus(sessionId) {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.baseUrl}/api/spoof/session/${sessionId}`);
                const result = await response.json();

                if (result.success) {
                    const session = this.activeSessions.get(sessionId);
                    if (session) {
                        Object.assign(session, result.session);
                        this.updateActiveSessionsDisplay();
                    }
                } else {
                    // Session ended or error
                    clearInterval(pollInterval);
                    this.activeSessions.delete(sessionId);
                    this.updateActiveSessionsDisplay();
                }
            } catch (error) {
                console.error('Error polling session status:', error);
                clearInterval(pollInterval);
            }
        }, 3000); // Poll every 3 seconds

        // Stop polling after 5 minutes
        setTimeout(() => {
            clearInterval(pollInterval);
        }, 300000);
    }

    updateActiveSessionsDisplay() {
        const container = document.getElementById('activeSessionsContainer');
        
        if (this.activeSessions.size === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<h4 style="color: white; margin-top: 20px;">Active Call Sessions</h4>';
        
        this.activeSessions.forEach((session, sessionId) => {
            html += `
                <div class="call-session">
                    <div class="session-info">
                        <div class="session-detail">
                            <strong>Session ID</strong>
                            ${sessionId.substring(0, 8)}...
                        </div>
                        <div class="session-detail">
                            <strong>Target</strong>
                            ${session.targetNumber || 'N/A'}
                        </div>
                        <div class="session-detail">
                            <strong>Spoof Number</strong>
                            ${session.spoofNumber || 'N/A'}
                        </div>
                        <div class="session-detail">
                            <strong>Status</strong>
                            ${session.status || 'Unknown'}
                        </div>
                    </div>
                    <button onclick="spoofCalling.endSession('${sessionId}')" class="btn-danger">
                        <i class="fas fa-phone-slash"></i> End Call
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async endSession(sessionId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/spoof/session/${sessionId}/end`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Call session ended', 'success');
                this.activeSessions.delete(sessionId);
                this.updateActiveSessionsDisplay();
            } else {
                this.showToast(`Error ending session: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Error ending session:', error);
            this.showToast('Failed to end session', 'error');
        }
    }

    validatePhoneNumber(phoneNumber) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber.replace(/[\s-()]/g, ''));
    }

    clearForm() {
        document.getElementById('spoofTargetNumber').value = '';
        document.getElementById('spoofCallerID').value = '';
        document.getElementById('spoofMessage').value = '';
        document.getElementById('recordCall').checked = false;
        document.getElementById('useConference').checked = false;
    }

    showToast(message, type = 'success') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
}

// Initialize spoof calling when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.spoofCalling === 'undefined') {
        window.spoofCalling = new SpoofCalling();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpoofCalling;
}
