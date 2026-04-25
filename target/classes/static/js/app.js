// API Base URL
const API_URL = '/api';

// Current user session
let currentUser = null;
let selectedRoom = null;
let currentMainTransaction = null;
let confirmCallback = null;

// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserSpan = document.getElementById('currentUser');

// Modals
const availableModal = document.getElementById('availableModal');
const checkInModal = document.getElementById('checkInModal');
const occupiedModal = document.getElementById('occupiedModal');
const subGuestModal = document.getElementById('subGuestModal');
const continueStayModal = document.getElementById('continueStayModal');
const dirtyModal = document.getElementById('dirtyModal');
const reservedModal = document.getElementById('reservedModal');
const confirmModal = document.getElementById('confirmModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }

    // Event Listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);

    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    // Available room actions
    document.getElementById('checkInBtn').addEventListener('click', openCheckInModal);
    document.getElementById('reserveBtn').addEventListener('click', handleReserve);

    // Check-in guest search
    document.getElementById('searchGuestBtn').addEventListener('click', searchGuest);
    document.getElementById('guestIdSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchGuest();
    });

    // New guest form
    document.getElementById('newGuestForm').addEventListener('submit', handleNewGuestCheckIn);

    // Existing guest confirmation
    document.getElementById('confirmExistingGuestBtn').addEventListener('click', handleExistingGuestCheckIn);

    // Occupied room actions
    document.getElementById('addSubGuestBtn').addEventListener('click', openSubGuestModal);
    document.getElementById('continueStayBtn').addEventListener('click', openContinueStayModal);
    document.getElementById('checkOutBtn').addEventListener('click', handleCheckOut);

    // Sub-guest search
    document.getElementById('searchSubGuestBtn').addEventListener('click', searchSubGuest);
    document.getElementById('subGuestIdSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchSubGuest();
    });

    // New sub-guest form
    document.getElementById('newSubGuestForm').addEventListener('submit', handleNewSubGuest);

    // Existing sub-guest confirmation
    document.getElementById('confirmSubGuestBtn').addEventListener('click', handleExistingSubGuest);

    // Continue stay confirmation
    document.getElementById('confirmContinueStayBtn').addEventListener('click', handleContinueStay);

    // Dirty room - mark clean
    document.getElementById('markCleanBtn').addEventListener('click', handleMarkClean);

    // Reserved room - unreserve
    document.getElementById('unreserveBtn').addEventListener('click', handleUnreserve);

    // Confirm modal buttons
    document.getElementById('confirmModalYes').addEventListener('click', handleConfirmYes);
    document.getElementById('confirmModalNo').addEventListener('click', handleConfirmNo);
});

// ==================== MODAL MESSAGE SYSTEM ====================

function showModalMessage(modalId, message, type = 'success') {
    const messageDiv = document.getElementById(`${modalId}ModalMessage`);
    if (messageDiv) {
        messageDiv.innerHTML = `<div class="message-${type}">${message}</div>`;
        messageDiv.classList.remove('hidden');
        
        // Auto-hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 5000);
        }
    }
}

function hideModalMessage(modalId) {
    const messageDiv = document.getElementById(`${modalId}ModalMessage`);
    if (messageDiv) {
        messageDiv.classList.add('hidden');
    }
}

function showConfirm(title, message, callback) {
    confirmCallback = callback;
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;
    confirmModal.classList.remove('hidden');
}

function handleConfirmYes() {
    confirmModal.classList.add('hidden');
    if (confirmCallback) {
        confirmCallback(true);
        confirmCallback = null;
    }
}

function handleConfirmNo() {
    confirmModal.classList.add('hidden');
    if (confirmCallback) {
        confirmCallback(false);
        confirmCallback = null;
    }
}

// ==================== LOGIN/LOGOUT ====================

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            currentUser = await response.json();
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            loginError.textContent = '';
            showDashboard();
        } else {
            const error = await response.json();
            loginError.textContent = error.error || 'Error al iniciar sesión';
        }
    } catch (err) {
        loginError.textContent = 'Error de conexión. Por favor intente de nuevo.';
        console.error(err);
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLogin();
}

// Page Navigation
function showLogin() {
    loginPage.classList.remove('hidden');
    dashboardPage.classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showDashboard() {
    loginPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    currentUserSpan.textContent = `Bienvenido, ${currentUser.fullName} (${currentUser.type})`;
    
    // Show admin panel button for ADMIN and MANAGER
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    if (currentUser.type === 'ADMIN' || currentUser.type === 'MANAGER') {
        adminPanelBtn.classList.remove('hidden');
    } else {
        adminPanelBtn.classList.add('hidden');
    }
    
    loadRooms();
    loadStats();
}

// Load Rooms
async function loadRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`);
        const rooms = await response.json();
        renderRooms(rooms);
    } catch (err) {
        console.error('Error al cargar habitaciones:', err);
    }
}

// Render Rooms
function renderRooms(rooms) {
    const floor1Grid = document.getElementById('floor1Grid');
    const floor2Grid = document.getElementById('floor2Grid');
    const floor3Grid = document.getElementById('floor3Grid');
    const floor4Grid = document.getElementById('floor4Grid');

    floor1Grid.innerHTML = '';
    floor2Grid.innerHTML = '';
    floor3Grid.innerHTML = '';
    floor4Grid.innerHTML = '';

    // Create a map of room name to room data
    const roomByName = {};
    rooms.forEach(room => {
        roomByName[room.name] = room;
    });

    // Create a map for floors 1 and 2 (numeric rooms)
    const sortedNumericRooms = [...rooms]
        .filter(r => /^\d+$/.test(r.name) || /^\d+$/.test(r.name))
        .sort((a, b) => {
            const numA = parseInt(a.name.replace(/\D/g, ''));
            const numB = parseInt(b.name.replace(/\D/g, ''));
            return numA - numB;
        });

    const roomMapNumeric = {};
    sortedNumericRooms.forEach((room, index) => {
        roomMapNumeric[index + 1] = room;
    });

    // Floor 1 layout (rooms 1-12)
    const floor1Layout = [
        [12, 10, 8, 7, 5, 3, 1],
        [11, 9, null, null, 6, 4, 2]
    ];

    // Floor 2 layout (rooms 13-25)
    const floor2Layout = [
        [25, 23, 21, 19, 17, 15, 13],
        [24, 22, 20, null, 18, 16, 14]
    ];

    // Floor 3 layout (rooms 301A-304B)
    const floor3Layout = [
        ['303A', '303B', null, null, '302C', '302B'],
        [null, null, null, null, null, '302A'],
        ['304A', '304B', null, null, '301B', '301A']
    ];

    // Floor 4 layout (rooms 401A-404B)
    const floor4Layout = [
        ['403A', '403B', null, null, '402C', '402B'],
        [null, null, null, null, null, '402A'],
        ['404A', '404B', null, null, '401B', '401A']
    ];

    // Render Floor 1
    floor1Layout.forEach(row => {
        row.forEach(roomNum => {
            if (roomNum === null) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'room-empty';
                floor1Grid.appendChild(emptyDiv);
            } else {
                const room = roomMapNumeric[roomNum];
                if (room) {
                    const btn = createRoomButton(room, roomNum);
                    floor1Grid.appendChild(btn);
                }
            }
        });
    });

    // Render Floor 2
    floor2Layout.forEach(row => {
        row.forEach(roomNum => {
            if (roomNum === null) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'room-empty';
                floor2Grid.appendChild(emptyDiv);
            } else {
                const room = roomMapNumeric[roomNum];
                if (room) {
                    const btn = createRoomButton(room, roomNum);
                    floor2Grid.appendChild(btn);
                }
            }
        });
    });

    // Render Floor 3
    floor3Layout.forEach(row => {
        row.forEach(roomName => {
            if (roomName === null) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'room-empty';
                floor3Grid.appendChild(emptyDiv);
            } else {
                const room = roomByName[roomName];
                if (room) {
                    const displayName = room.name;
                    const btn = createRoomButton(room, displayName);
                    floor3Grid.appendChild(btn);
                } else {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'room-empty';
                    floor3Grid.appendChild(emptyDiv);
                }
            }
        });
    });

    // Render Floor 4
    floor4Layout.forEach(row => {
        row.forEach(roomName => {
            if (roomName === null) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'room-empty';
                floor4Grid.appendChild(emptyDiv);
            } else {
                const room = roomByName[roomName];
                if (room) {
                    const displayName = room.name;
                    const btn = createRoomButton(room, displayName);
                    floor4Grid.appendChild(btn);
                } else {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'room-empty';
                    floor4Grid.appendChild(emptyDiv);
                }
            }
        });
    });
}

function createRoomButton(room, displayLabel) {
    const btn = document.createElement('button');
    btn.className = `room-btn ${room.status.toLowerCase()}`;
    btn.innerHTML = `${displayLabel}`;
    btn.addEventListener('click', () => handleRoomClick(room));
    return btn;
}

// Load Stats
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/rooms/stats`);
        const stats = await response.json();
        document.getElementById('statAvailable').textContent = (stats.available -2) || 0;
        document.getElementById('statOccupied').textContent = stats.occupied || 0;
        document.getElementById('statDirty').textContent = stats.dirty || 0;
        document.getElementById('statReserved').textContent = stats.reserved || 0;
    } catch (err) {
        console.error('Error al cargar estadísticas:', err);
    }
}

// Handle Room Click - Open appropriate modal based on status
function handleRoomClick(room) {
    selectedRoom = room;
    
    switch (room.status) {
        case 'AVAILABLE':
            openAvailableModal(room);
            break;
        case 'OCCUPIED':
            openOccupiedModal(room);
            break;
        case 'DIRTY':
            openDirtyModal(room);
            break;
        case 'RESERVED':
            openReservedModal(room);
            break;
    }
}

// ==================== AVAILABLE ROOM ====================

function openAvailableModal(room) {
    hideModalMessage('available');
    document.getElementById('availableRoomInfo').innerHTML = `
        <p><strong>Habitación:</strong> ${room.name}</p>
        <p><strong>Descripción:</strong> ${room.description || 'N/A'}</p>
        <p><strong>Tarifa Base:</strong> $${parseFloat(room.money).toFixed(2)}/noche</p>
    `;
    availableModal.classList.remove('hidden');
}

function openCheckInModal() {
    availableModal.classList.add('hidden');
    
    // Reset form
    hideModalMessage('checkIn');
    document.getElementById('searchGuestStep').classList.remove('hidden');
    document.getElementById('newGuestStep').classList.add('hidden');
    document.getElementById('existingGuestStep').classList.add('hidden');
    document.getElementById('guestIdSearch').value = '';
    document.getElementById('searchResult').innerHTML = '';
    
    document.getElementById('roomInfo').innerHTML = `
        <p><strong>Habitación:</strong> ${selectedRoom.name}</p>
        <p><strong>Tarifa Base:</strong> $${parseFloat(selectedRoom.money).toFixed(2)}/noche</p>
    `;
    
    // Set default price
    document.getElementById('checkInPrice').value = selectedRoom.money;
    document.getElementById('existingGuestPrice').value = selectedRoom.money;
    
    checkInModal.classList.remove('hidden');
}

async function handleReserve() {
    try {
        const response = await fetch(`${API_URL}/rooms/${selectedRoom.rid}/reserve`, {
            method: 'PUT'
        });

        if (response.ok) {
            showModalMessage('available', `✅ Habitación ${selectedRoom.name} ha sido reservada.`, 'success');
            setTimeout(() => {
                closeModals();
                loadRooms();
                loadStats();
            }, 2000);
        } else {
            const error = await response.json();
            showModalMessage('available', '❌ Error al reservar: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (err) {
        console.error('Error al reservar:', err);
        showModalMessage('available', '❌ Error al reservar. Por favor intente de nuevo.', 'error');
    }
}

// ==================== CHECK-IN ====================

async function searchGuest() {
    const idNumber = document.getElementById('guestIdSearch').value.trim();
    if (!idNumber) {
        showModalMessage('checkIn', '⚠️ Por favor ingrese un número de cédula', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/guests/search?idNumber=${encodeURIComponent(idNumber)}`);
        const result = await response.json();
        
        hideModalMessage('checkIn');
        if (result.found) {
            showExistingGuest(result.guest);
        } else {
            showNewGuestForm(idNumber);
        }
    } catch (err) {
        console.error('Error en búsqueda:', err);
        showModalMessage('checkIn', '❌ Error en la búsqueda. Por favor intente de nuevo.', 'error');
    }
}

function showExistingGuest(guest) {
    document.getElementById('searchGuestStep').classList.add('hidden');
    document.getElementById('newGuestStep').classList.add('hidden');
    document.getElementById('existingGuestStep').classList.remove('hidden');
    
    document.getElementById('existingGuestInfo').innerHTML = `
        <p class="guest-name">${guest.fullName}</p>
        <p><strong>Cédula:</strong> ${guest.idNumber}</p>
        <p><strong>Origen:</strong> ${guest.state || 'N/A'}, ${guest.country || 'N/A'}</p>
        <p><strong>Fecha de Nac.:</strong> ${guest.dob || 'N/A'}</p>
        <p><strong>Ocupación:</strong> ${guest.occupation || 'N/A'}</p>
    `;
    
    document.getElementById('existingGuestStep').dataset.guestId = guest.gid;
    document.getElementById('existingGuestStep').dataset.guestIdNumber = guest.idNumber;
}

function showNewGuestForm(idNumber) {
    document.getElementById('searchGuestStep').classList.add('hidden');
    document.getElementById('existingGuestStep').classList.add('hidden');
    document.getElementById('newGuestStep').classList.remove('hidden');
    
    document.getElementById('guestIdNumber').value = idNumber;
    document.getElementById('guestFullName').value = '';
    document.getElementById('guestDob').value = '';
    document.getElementById('guestState').value = '';
    document.getElementById('guestCountry').value = '';
    document.getElementById('guestMarriage').value = '';
    document.getElementById('guestOccupation').value = '';
    document.getElementById('guestDescription').value = '';
}

async function handleNewGuestCheckIn(e) {
    e.preventDefault();
    
    const checkInData = {
        rid: selectedRoom.rid,
        uid: currentUser.uid,
        guestIdNumber: document.getElementById('guestIdNumber').value,
        fullName: document.getElementById('guestFullName').value,
        state: document.getElementById('guestState').value,
        country: document.getElementById('guestCountry').value,
        dob: document.getElementById('guestDob').value || null,
        marriageStatus: document.getElementById('guestMarriage').value,
        occupation: document.getElementById('guestOccupation').value,
        description: document.getElementById('guestDescription').value,
        price: parseFloat(document.getElementById('checkInPrice').value)
    };

    try {
        const response = await fetch(`${API_URL}/transactions/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkInData)
        });

        if (response.ok) {
            const transaction = await response.json();
            showModalMessage('checkIn', `✅ ¡Registro exitoso!<br>Habitación: ${selectedRoom.name}<br>Huésped: ${checkInData.fullName}<br>Precio: $${checkInData.price}`, 'success');
            setTimeout(() => {
                closeModals();
                loadRooms();
                loadStats();
            }, 2500);
        } else {
            const error = await response.json();
            showModalMessage('checkIn', '❌ Error en el registro: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (err) {
        console.error('Error en el registro:', err);
        showModalMessage('checkIn', '❌ Error en el registro. Por favor intente de nuevo.', 'error');
    }
}

async function handleExistingGuestCheckIn() {
    const existingGuestStep = document.getElementById('existingGuestStep');
    const guestIdNumber = existingGuestStep.dataset.guestIdNumber;
    const price = parseFloat(document.getElementById('existingGuestPrice').value);
    
    const checkInData = {
        rid: selectedRoom.rid,
        uid: currentUser.uid,
        guestIdNumber: guestIdNumber,
        price: price
    };

    try {
        const response = await fetch(`${API_URL}/transactions/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkInData)
        });

        if (response.ok) {
            const transaction = await response.json();
            showModalMessage('checkIn', `✅ ¡Registro exitoso!<br>Habitación: ${selectedRoom.name}<br>Huésped: ${transaction.guestName}<br>Precio: $${price}`, 'success');
            setTimeout(() => {
                closeModals();
                loadRooms();
                loadStats();
            }, 2500);
        } else {
            const error = await response.json();
            showModalMessage('checkIn', '❌ Error en el registro: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (err) {
        console.error('Error en el registro:', err);
        showModalMessage('checkIn', '❌ Error en el registro. Por favor intente de nuevo.', 'error');
    }
}

// ==================== OCCUPIED ROOM ====================

async function openOccupiedModal(room) {
    hideModalMessage('occupied');
    document.getElementById('occupiedRoomInfo').innerHTML = `
        <p><strong>Habitación:</strong> ${room.name}</p>
        <p><strong>Estado:</strong> <span class="status-badge occupied">OCUPADO</span></p>
    `;
    
    // Load today's transactions for this room
    try {
        const response = await fetch(`${API_URL}/transactions/room/${room.rid}/today`);
        const transactions = await response.json();
        
        // Find main guest (no parent or has price > 0)
        const mainTransaction = transactions.find(t => !t.parentTid || t.total > 0);
        const subGuests = transactions.filter(t => t.parentTid && t.total === 0);
        
        if (mainTransaction) {
            currentMainTransaction = mainTransaction;
            document.getElementById('occupiedGuestInfo').innerHTML = `
                <p class="guest-name">Huésped Principal: ${mainTransaction.guestName}</p>
                <p><strong>Cédula:</strong> ${mainTransaction.guestIdNumber}</p>
                <p><strong>Fecha:</strong> ${mainTransaction.dateFormatted || mainTransaction.date}</p>
                <p><strong>Precio:</strong> $${parseFloat(mainTransaction.total).toFixed(2)}</p>
            `;
        } else {
            currentMainTransaction = null;
            document.getElementById('occupiedGuestInfo').innerHTML = '<p>No hay información del huésped disponible</p>';
        }
        
        // Show sub-guests
        if (subGuests.length > 0) {
            document.getElementById('subGuestsList').innerHTML = `
                <h4>Acompañantes:</h4>
                ${subGuests.map(sg => `<p>• ${sg.guestName} (${sg.guestIdNumber})</p>`).join('')}
            `;
        } else {
            document.getElementById('subGuestsList').innerHTML = '';
        }
    } catch (err) {
        console.error('Error al cargar transacción:', err);
        document.getElementById('occupiedGuestInfo').innerHTML = '<p>Error al cargar información del huésped</p>';
        document.getElementById('subGuestsList').innerHTML = '';
    }
    
    occupiedModal.classList.remove('hidden');
}

function handleCheckOut() {
    showConfirm(
        'Confirmar Salida',
        `¿Realizar salida de la habitación ${selectedRoom.name}?`,
        async (confirmed) => {
            if (!confirmed) return;
            
            try {
                const response = await fetch(`${API_URL}/transactions/checkout/${selectedRoom.rid}`, {
                    method: 'POST'
                });

                if (response.ok) {
                    showModalMessage('occupied', `✅ ¡Salida exitosa!<br>Habitación ${selectedRoom.name} está ahora marcada como Limpiado.`, 'success');
                    setTimeout(() => {
                        closeModals();
                        loadRooms();
                        loadStats();
                    }, 2500);
                } else {
                    const error = await response.json();
                    showModalMessage('occupied', '❌ Error en la salida: ' + (error.error || 'Error desconocido'), 'error');
                }
            } catch (err) {
                console.error('Error en la salida:', err);
                showModalMessage('occupied', '❌ Error en la salida. Por favor intente de nuevo.', 'error');
            }
        }
    );
}

// ==================== SUB-GUEST ====================

function openSubGuestModal() {
    occupiedModal.classList.add('hidden');
    
    // Reset form
    hideModalMessage('subGuest');
    document.getElementById('searchSubGuestStep').classList.remove('hidden');
    document.getElementById('newSubGuestStep').classList.add('hidden');
    document.getElementById('existingSubGuestStep').classList.add('hidden');
    document.getElementById('subGuestIdSearch').value = '';
    document.getElementById('subGuestSearchResult').innerHTML = '';
    
    document.getElementById('subGuestRoomInfo').innerHTML = `
        <p><strong>Habitación:</strong> ${selectedRoom.name}</p>
        <p>Agregando acompañante a esta habitación.</p>
    `;
    
    subGuestModal.classList.remove('hidden');
}

async function searchSubGuest() {
    const idNumber = document.getElementById('subGuestIdSearch').value.trim();
    if (!idNumber) {
        showModalMessage('subGuest', '⚠️ Por favor ingrese un número de cédula', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/guests/search?idNumber=${encodeURIComponent(idNumber)}`);
        const result = await response.json();
        
        hideModalMessage('subGuest');
        if (result.found) {
            showExistingSubGuest(result.guest);
        } else {
            showNewSubGuestForm(idNumber);
        }
    } catch (err) {
        console.error('Error en búsqueda:', err);
        showModalMessage('subGuest', '❌ Error en la búsqueda. Por favor intente de nuevo.', 'error');
    }
}

function showExistingSubGuest(guest) {
    document.getElementById('searchSubGuestStep').classList.add('hidden');
    document.getElementById('newSubGuestStep').classList.add('hidden');
    document.getElementById('existingSubGuestStep').classList.remove('hidden');
    
    document.getElementById('existingSubGuestInfo').innerHTML = `
        <p class="guest-name">${guest.fullName}</p>
        <p><strong>Cédula:</strong> ${guest.idNumber}</p>
        <p><strong>Origen:</strong> ${guest.state || 'N/A'}, ${guest.country || 'N/A'}</p>
    `;
    
    document.getElementById('existingSubGuestStep').dataset.guestIdNumber = guest.idNumber;
}

function showNewSubGuestForm(idNumber) {
    document.getElementById('searchSubGuestStep').classList.add('hidden');
    document.getElementById('existingSubGuestStep').classList.add('hidden');
    document.getElementById('newSubGuestStep').classList.remove('hidden');
    
    document.getElementById('subGuestIdNumber').value = idNumber;
    document.getElementById('subGuestFullName').value = '';
    document.getElementById('subGuestDob').value = '';
    document.getElementById('subGuestState').value = '';
    document.getElementById('subGuestCountry').value = '';
    document.getElementById('subGuestMarriage').value = '';
    document.getElementById('subGuestOccupation').value = '';
}

async function handleNewSubGuest(e) {
    e.preventDefault();
    
    const subGuestData = {
        rid: selectedRoom.rid,
        uid: currentUser.uid,
        guestIdNumber: document.getElementById('subGuestIdNumber').value,
        fullName: document.getElementById('subGuestFullName').value,
        state: document.getElementById('subGuestState').value,
        country: document.getElementById('subGuestCountry').value,
        dob: document.getElementById('subGuestDob').value || null,
        marriageStatus: document.getElementById('subGuestMarriage').value,
        occupation: document.getElementById('subGuestOccupation').value,
        parentTid: currentMainTransaction ? currentMainTransaction.tid : null
    };

    try {
        const response = await fetch(`${API_URL}/transactions/subguest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subGuestData)
        });

        if (response.ok) {
            showModalMessage('subGuest', `✅ ¡Acompañante agregado exitosamente!`, 'success');
            setTimeout(() => {
                closeModals();
                loadRooms();
            }, 2000);
        } else {
            const error = await response.json();
            showModalMessage('subGuest', '❌ Error al agregar acompañante: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (err) {
        console.error('Error al agregar acompañante:', err);
        showModalMessage('subGuest', '❌ Error al agregar acompañante. Por favor intente de nuevo.', 'error');
    }
}

async function handleExistingSubGuest() {
    const guestIdNumber = document.getElementById('existingSubGuestStep').dataset.guestIdNumber;
    
    const subGuestData = {
        rid: selectedRoom.rid,
        uid: currentUser.uid,
        guestIdNumber: guestIdNumber,
        parentTid: currentMainTransaction ? currentMainTransaction.tid : null
    };

    try {
        const response = await fetch(`${API_URL}/transactions/subguest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subGuestData)
        });

        if (response.ok) {
            showModalMessage('subGuest', `✅ ¡Acompañante agregado exitosamente!`, 'success');
            setTimeout(() => {
                closeModals();
                loadRooms();
            }, 2000);
        } else {
            const error = await response.json();
            showModalMessage('subGuest', '❌ Error al agregar acompañante: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (err) {
        console.error('Error al agregar acompañante:', err);
        showModalMessage('subGuest', '❌ Error al agregar acompañante. Por favor intente de nuevo.', 'error');
    }
}

// ==================== CONTINUE STAY ====================

function openContinueStayModal() {
    occupiedModal.classList.add('hidden');
    hideModalMessage('continueStay');
    
    document.getElementById('continueStayRoomInfo').innerHTML = `
        <p><strong>Habitación:</strong> ${selectedRoom.name}</p>
        <p><strong>Huésped Principal:</strong> ${currentMainTransaction ? currentMainTransaction.guestName : 'Desconocido'}</p>
    `;
    
    document.getElementById('continueStayPrice').value = selectedRoom.money;
    
    continueStayModal.classList.remove('hidden');
}

async function handleContinueStay() {
    const price = parseFloat(document.getElementById('continueStayPrice').value);
    
    const continueData = {
        rid: selectedRoom.rid,
        uid: currentUser.uid,
        price: price
    };

    try {
        const response = await fetch(`${API_URL}/transactions/continue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(continueData)
        });

        if (response.ok) {
            showModalMessage('continueStay', `✅ ¡Estadía continuada por otro día!<br>Precio: $${price}`, 'success');
            setTimeout(() => {
                closeModals();
                loadRooms();
            }, 2000);
        } else {
            const error = await response.json();
            showModalMessage('continueStay', '❌ Error al continuar estadía: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (err) {
        console.error('Error al continuar estadía:', err);
        showModalMessage('continueStay', '❌ Error al continuar estadía. Por favor intente de nuevo.', 'error');
    }
}

// ==================== DIRTY ROOM ====================

function openDirtyModal(room) {
    hideModalMessage('dirty');
    document.getElementById('dirtyRoomInfo').innerHTML = `
        <p><strong>Habitación:</strong> ${room.name}</p>
        <p><strong>Estado:</strong> <span class="status-badge dirty">LIMPIANDO</span></p>
    `;
    dirtyModal.classList.remove('hidden');
}

async function handleMarkClean() {
    try {
        const response = await fetch(`${API_URL}/rooms/${selectedRoom.rid}/clean`, {
            method: 'PUT'
        });

        if (response.ok) {
            showModalMessage('dirty', `✅ Habitación ${selectedRoom.name} está ahora disponible.`, 'success');
            setTimeout(() => {
                closeModals();
                loadRooms();
                loadStats();
            }, 2000);
        } else {
            const error = await response.json();
            showModalMessage('dirty', '❌ Error al marcar limpia: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (err) {
        console.error('Error al marcar limpia:', err);
        showModalMessage('dirty', '❌ Error al marcar limpia. Por favor intente de nuevo.', 'error');
    }
}

// ==================== RESERVED ROOM ====================

function openReservedModal(room) {
    hideModalMessage('reserved');
    document.getElementById('reservedRoomInfo').innerHTML = `
        <p><strong>Habitación:</strong> ${room.name}</p>
        <p><strong>Estado:</strong> <span class="status-badge reserved">RESERVADO</span></p>
    `;
    reservedModal.classList.remove('hidden');
}

async function handleUnreserve() {
    try {
        const response = await fetch(`${API_URL}/rooms/${selectedRoom.rid}/unreserve`, {
            method: 'PUT'
        });

        if (response.ok) {
            showModalMessage('reserved', `✅ Habitación ${selectedRoom.name} está ahora disponible.`, 'success');
            setTimeout(() => {
                closeModals();
                loadRooms();
                loadStats();
            }, 2000);
        } else {
            const error = await response.json();
            showModalMessage('reserved', '❌ Error al liberar reserva: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (err) {
        console.error('Error al liberar reserva:', err);
        showModalMessage('reserved', '❌ Error al liberar reserva. Por favor intente de nuevo.', 'error');
    }
}

// ==================== UTILITIES ====================

function closeModals() {
    availableModal.classList.add('hidden');
    checkInModal.classList.add('hidden');
    occupiedModal.classList.add('hidden');
    subGuestModal.classList.add('hidden');
    continueStayModal.classList.add('hidden');
    dirtyModal.classList.add('hidden');
    reservedModal.classList.add('hidden');
    confirmModal.classList.add('hidden');
    selectedRoom = null;
    currentMainTransaction = null;
    
    // Hide all messages
    hideModalMessage('available');
    hideModalMessage('checkIn');
    hideModalMessage('occupied');
    hideModalMessage('subGuest');
    hideModalMessage('continueStay');
    hideModalMessage('dirty');
    hideModalMessage('reserved');
}
