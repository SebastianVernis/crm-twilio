// Main Application JavaScript
class CRMApp {
    constructor() {
        this.baseUrl = window.location.origin;
        this.currentUser = null;
        this.contacts = [];
        this.init();
    }

    init() {
        this.setupSecurityFeatures();
        this.bindEvents();
        this.loadContacts();
        this.startDashboardUpdates();
    }

    setupSecurityFeatures() {
        // Anti-screenshot protection
        document.addEventListener('keydown', (e) => {
            // Disable common screenshot shortcuts
            if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
                e.preventDefault();
                this.showSecurityWarning();
            }
            
            // Disable F12, Ctrl+Shift+I, Ctrl+U
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.key === 'u')) {
                e.preventDefault();
                this.showSecurityWarning();
            }
        });

        // Disable right-click context menu
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showSecurityWarning();
        });

        // Blur content when window loses focus (anti-screenshot)
        window.addEventListener('blur', () => {
            document.body.classList.add('security-blur');
        });

        window.addEventListener('focus', () => {
            document.body.classList.remove('security-blur');
        });

        // Detect developer tools
        let devtools = {
            open: false,
            orientation: null
        };

        const threshold = 160;
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.showSecurityWarning();
                    document.body.classList.add('security-blur');
                }
            } else {
                if (devtools.open) {
                    devtools.open = false;
                    document.body.classList.remove('security-blur');
                }
            }
        }, 500);
    }

    showSecurityWarning() {
        this.showToast('Security feature detected. This action is not allowed.', 'warning');
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Contact form
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addContact();
            });
        }

        // SMS and Call buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('send-sms-btn')) {
                const contactId = e.target.dataset.contactId;
                this.sendSMS(contactId);
            }
            
            if (e.target.classList.contains('call-btn')) {
                const contactId = e.target.dataset.contactId;
                this.makeCall(contactId);
            }
            
            if (e.target.classList.contains('edit-btn')) {
                const contactId = e.target.dataset.contactId;
                this.editContact(contactId);
            }
        });

        // Search functionality with debouncing
        const searchInput = document.getElementById('search-contacts');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterContacts(e.target.value);
                }, 300);
            });
        }

        // Filter by status
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterContactsByStatus(e.target.value);
            });
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showToast('Please enter username and password', 'error');
            return;
        }

        // Simulate login (replace with actual authentication)
        if ((username === 'admin' && password === 'admin123') || 
            (username === 'asesor' && password === 'asesor123')) {
            
            this.currentUser = {
                username: username,
                role: username === 'admin' ? 'admin' : 'asesor'
            };

            document.getElementById('login-container').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            
            this.setupUserInterface();
            this.showToast(`Welcome ${username}!`, 'success');
        } else {
            this.showToast('Invalid credentials', 'error');
        }
    }

    handleLogout() {
        this.currentUser = null;
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        this.showToast('Logged out successfully', 'success');
    }

    setupUserInterface() {
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.textContent = `${this.currentUser.username} (${this.currentUser.role})`;
        }

        // Hide admin features for asesor role
        if (this.currentUser.role === 'asesor') {
            const adminElements = document.querySelectorAll('.admin-only');
            adminElements.forEach(el => el.classList.add('hidden'));
        }
    }

    loadContacts() {
        // Simulate loading contacts (replace with actual API call)
        this.contacts = [
            {
                id: 1,
                name: 'Juan Pérez',
                phone: '+1234567890',
                email: 'juan@example.com',
                status: 'Pendiente',
                notes: 'Interesado en el producto'
            },
            {
                id: 2,
                name: 'María García',
                phone: '+0987654321',
                email: 'maria@example.com',
                status: 'Contactado',
                notes: 'Llamar la próxima semana'
            }
        ];

        this.renderContacts();
        this.updateDashboard();
    }

    renderContacts(contactsToRender = this.contacts) {
        const tbody = document.querySelector('#contacts-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        contactsToRender.forEach(contact => {
            const row = document.createElement('tr');
            row.className = 'fade-in';
            row.innerHTML = `
                <td>${contact.name}</td>
                <td>${contact.phone}</td>
                <td>${contact.email}</td>
                <td><span class="status-badge status-${contact.status.replace(' ', '_')}">${contact.status}</span></td>
                <td>${contact.notes}</td>
                <td>
                    <button class="call-btn btn-success" data-contact-id="${contact.id}" title="Call">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="send-sms-btn btn-secondary" data-contact-id="${contact.id}" title="SMS">
                        <i class="fas fa-sms"></i>
                    </button>
                    <button class="edit-btn btn-secondary" data-contact-id="${contact.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async makeCall(contactId) {
        const contact = this.contacts.find(c => c.id == contactId);
        if (!contact) return;

        const button = document.querySelector(`[data-contact-id="${contactId}"].call-btn`);
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="spinner"></div>';
        button.disabled = true;

        try {
            const response = await fetch(`${this.baseUrl}/make-call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: contact.phone,
                    message: `Calling ${contact.name}`,
                    record: true
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(`Call initiated to ${contact.name}`, 'success');
                this.showAfterCallModal(contact);
            } else {
                this.showToast(`Error: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Error making call:', error);
            this.showToast('Failed to make call', 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async sendSMS(contactId) {
        const contact = this.contacts.find(c => c.id == contactId);
        if (!contact) return;

        const message = prompt(`Send SMS to ${contact.name}:`);
        if (!message) return;

        const button = document.querySelector(`[data-contact-id="${contactId}"].send-sms-btn`);
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="spinner"></div>';
        button.disabled = true;

        try {
            const response = await fetch(`${this.baseUrl}/send-sms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: contact.phone,
                    body: message
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(`SMS sent to ${contact.name}`, 'success');
            } else {
                this.showToast(`Error: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Error sending SMS:', error);
            this.showToast('Failed to send SMS', 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    showAfterCallModal(contact) {
        const modal = document.createElement('div');
        modal.className = 'overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>After Call - ${contact.name}</h3>
                <div>
                    <label for="call-notes">Call Notes:</label>
                    <textarea id="call-notes" rows="4" placeholder="Enter call notes..."></textarea>
                </div>
                <div>
                    <label for="new-status">Update Status:</label>
                    <select id="new-status">
                        <option value="Contactado">Contactado</option>
                        <option value="Requiere_Seguimiento">Requiere Seguimiento</option>
                        <option value="No_Interesado">No Interesado</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button onclick="this.closest('.overlay').remove()" class="btn-secondary">Cancel</button>
                    <button onclick="crmApp.saveAfterCall(${contact.id})" class="btn-success">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    saveAfterCall(contactId) {
        const notes = document.getElementById('call-notes').value;
        const status = document.getElementById('new-status').value;
        
        const contact = this.contacts.find(c => c.id == contactId);
        if (contact) {
            contact.notes = notes || contact.notes;
            contact.status = status;
            this.renderContacts();
            this.updateDashboard();
        }

        document.querySelector('.overlay').remove();
        this.showToast('Contact updated successfully', 'success');
    }

    filterContacts(searchTerm) {
        const filtered = this.contacts.filter(contact => 
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.phone.includes(searchTerm) ||
            contact.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderContacts(filtered);
    }

    filterContactsByStatus(status) {
        if (status === 'all') {
            this.renderContacts();
        } else {
            const filtered = this.contacts.filter(contact => contact.status === status);
            this.renderContacts(filtered);
        }
    }

    updateDashboard() {
        const totalContacts = this.contacts.length;
        const statusCounts = this.contacts.reduce((acc, contact) => {
            acc[contact.status] = (acc[contact.status] || 0) + 1;
            return acc;
        }, {});

        // Update stat cards
        document.getElementById('total-contacts').textContent = totalContacts;
        document.getElementById('contacted-today').textContent = statusCounts['Contactado'] || 0;
        document.getElementById('pending-followup').textContent = statusCounts['Requiere_Seguimiento'] || 0;

        // Update status breakdown
        const statusList = document.getElementById('status-breakdown');
        if (statusList) {
            statusList.innerHTML = '';
            Object.entries(statusCounts).forEach(([status, count]) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${status.replace('_', ' ')}</span><span>${count}</span>`;
                statusList.appendChild(li);
            });
        }
    }

    startDashboardUpdates() {
        // Update dashboard every 30 seconds
        setInterval(() => {
            this.updateDashboard();
        }, 30000);
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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.crmApp = new CRMApp();
});

// Service Worker registration for caching
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
