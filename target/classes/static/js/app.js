// API Base URL
const API_URL = '/api';

// Current user session
let currentUser = null;
let selectedRoom = null;
let currentTransaction = null;

// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserSpan = document.getElementById('currentUser');
const roomGrid = document.getElementById('roomGrid');

// Modals
const checkInModal = document.getElementById('checkInModal');
const statusModal = document.getElementById('statusModal');

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

    // Guest search
    document.getElementById('searchGuestBtn').addEventListener('click', searchGuest);
    document.getElementById('guestIdSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchGuest();
    });

    // New guest form
    document.getElementById('newGuestForm').addEventListener('submit', handleNewGuestCheckIn);

    // Existing guest confirmation
    document.getElementById('confirmExistingGuestBtn').addEventListener('click', handleExistingGuestCheckIn);

    // Status change buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', () => changeRoomStatus(btn.dataset.status));
    });

    // Checkout button
    document.getElementById('checkOutBtn').addEventListener('click', handleCheckOut);
});

// Login Handler
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
            loginError.textContent = error.error || 'Login failed';
        }
    } catch (err) {
        loginError.textContent = 'Connection error. Please try again.';
        console.error(err);
    }
}

// Logout Handler
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
    currentUserSpan.textContent = `Welcome, ${currentUser.fullName} (${currentUser.type})`;
    
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
        console.error('Failed to load rooms:', err);
    }
}

// Render Rooms
function renderRooms(rooms) {
    const floor1Grid = document.getElementById('floor1Grid');
    const floor2Grid = document.getElementById('floor2Grid');

    floor1Grid.innerHTML = '';
    floor2Grid.innerHTML = '';

    // Create a map of room display number to room data
    const sortedRooms = [...rooms].sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, ''));
        const numB = parseInt(b.name.replace(/\D/g, ''));
        return numA - numB;
    });

    const roomMap = {};
    sortedRooms.forEach((room, index) => {
        roomMap[index + 1] = room;
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

    // Render Floor 1
    floor1Layout.forEach(row => {
        row.forEach(roomNum => {
            if (roomNum === null) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'room-empty';
                floor1Grid.appendChild(emptyDiv);
            } else {
                const room = roomMap[roomNum];
                if (room) {
                    const btn = document.createElement('button');
                    btn.className = `room-btn ${room.status.toLowerCase()}`;
                    btn.innerHTML = `${roomNum}`;
                    btn.addEventListener('click', () => handleRoomClick(room));
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
                const room = roomMap[roomNum];
                if (room) {
                    const btn = document.createElement('button');
                    btn.className = `room-btn ${room.status.toLowerCase()}`;
                    btn.innerHTML = `${roomNum}`;
                    btn.addEventListener('click', () => handleRoomClick(room));
                    floor2Grid.appendChild(btn);
                }
            }
        });
    });
}

// Load Stats
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/rooms/stats`);
        const stats = await response.json();
        document.getElementById('statAvailable').textContent = stats.available || 0;
        document.getElementById('statOccupied').textContent = stats.occupied || 0;
        document.getElementById('statDirty').textContent = stats.dirty || 0;
        document.getElementById('statCleaning').textContent = stats.cleaning || 0;
        document.getElementById('statReserved').textContent = stats.reserved || 0;
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

// Handle Room Click
function handleRoomClick(room) {
    selectedRoom = room;
    
    if (room.status === 'AVAILABLE') {
        openCheckInModal(room);
    } else {
        openStatusModal(room);
    }
}

// Open Check-In Modal
function openCheckInModal(room) {
    document.getElementById('roomInfo').innerHTML = `
        <p><strong>Room:</strong> ${room.name}</p>
        <p><strong>Description:</strong> ${room.description}</p>
        <p><strong>Rate:</strong> $${room.money}/night</p>
    `;
    
    // Reset form
    document.getElementById('guestIdSearch').value = '';
    document.getElementById('searchResult').innerHTML = '';
    document.getElementById('searchGuestStep').classList.remove('hidden');
    document.getElementById('newGuestStep').classList.add('hidden');
    document.getElementById('existingGuestStep').classList.add('hidden');
    
    checkInModal.classList.remove('hidden');
}

// Open Status Modal (for non-available rooms)
async function openStatusModal(room) {
    document.getElementById('statusRoomInfo').innerHTML = `
        <p><strong>Room:</strong> ${room.name}</p>
        <p><strong>Description:</strong> ${room.description}</p>
        <p><strong>Rate:</strong> $${room.money}/night</p>
        <p><strong>Current Status:</strong> <span style="color: ${room.statusColor}">${room.status}</span></p>
    `;
    
    const transactionDiv = document.getElementById('currentTransaction');
    const checkoutSection = document.getElementById('checkOutSection');
    
    if (room.status === 'OCCUPIED') {
        try {
            const response = await fetch(`${API_URL}/transactions/room/${room.rid}/active`);
            if (response.ok) {
                currentTransaction = await response.json();
                transactionDiv.classList.remove('hidden');
                transactionDiv.innerHTML = `
                    <h4>Current Guest</h4>
                    <p><strong>Guest:</strong> ${currentTransaction.guestName}</p>
                    <p><strong>ID:</strong> ${currentTransaction.guestIdNumber}</p>
                    <p><strong>Check-In:</strong> ${currentTransaction.startDate}</p>
                    <p><strong>Checked in by:</strong> ${currentTransaction.userName}</p>
                `;
                checkoutSection.classList.remove('hidden');
                document.getElementById('totalAmount').value = room.money;
            } else {
                transactionDiv.classList.add('hidden');
                checkoutSection.classList.add('hidden');
            }
        } catch (err) {
            console.error(err);
            transactionDiv.classList.add('hidden');
            checkoutSection.classList.add('hidden');
        }
    } else {
        transactionDiv.classList.add('hidden');
        checkoutSection.classList.add('hidden');
        currentTransaction = null;
    }
    
    statusModal.classList.remove('hidden');
}

// Close Modals
function closeModals() {
    checkInModal.classList.add('hidden');
    statusModal.classList.add('hidden');
    selectedRoom = null;
    currentTransaction = null;
}

// Search Guest
async function searchGuest() {
    const idNumber = document.getElementById('guestIdSearch').value.trim();
    if (!idNumber) {
        alert('Please enter an ID number');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/guests/search?idNumber=${encodeURIComponent(idNumber)}`);
        const result = await response.json();
        
        if (result.found) {
            // Show existing guest
            showExistingGuest(result.guest);
        } else {
            // Show new guest form
            showNewGuestForm(idNumber);
        }
    } catch (err) {
        console.error('Search failed:', err);
        alert('Search failed. Please try again.');
    }
}

// Show Existing Guest
function showExistingGuest(guest) {
    document.getElementById('searchGuestStep').classList.add('hidden');
    document.getElementById('newGuestStep').classList.add('hidden');
    document.getElementById('existingGuestStep').classList.remove('hidden');
    
    let notesHtml = '';
    if (guest.description) {
        notesHtml = `<div class="guest-notes"><strong>Notes:</strong> ${guest.description}</div>`;
    }
    
    document.getElementById('existingGuestInfo').innerHTML = `
        <p class="guest-name">${guest.fullName}</p>
        <p><strong>ID:</strong> ${guest.idNumber}</p>
        <p><strong>From:</strong> ${guest.state || 'N/A'}, ${guest.country || 'N/A'}</p>
        <p><strong>DOB:</strong> ${guest.dob || 'N/A'}</p>
        <p><strong>Occupation:</strong> ${guest.occupation || 'N/A'}</p>
        ${notesHtml}
    `;
    
    // Store guest ID for check-in
    document.getElementById('existingGuestStep').dataset.guestId = guest.gid;
    document.getElementById('existingGuestStep').dataset.guestIdNumber = guest.idNumber;
}

// Show New Guest Form
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

// Handle New Guest Check-In
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
        description: document.getElementById('guestDescription').value
    };

    try {
        const response = await fetch(`${API_URL}/transactions/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkInData)
        });

        if (response.ok) {
            const transaction = await response.json();
            alert(`Check-in successful!\nRoom: ${selectedRoom.name}\nGuest: ${checkInData.fullName}\nTransaction ID: ${transaction.tid}`);
            closeModals();
            loadRooms();
            loadStats();
        } else {
            const error = await response.json();
            alert('Check-in failed: ' + (error.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Check-in failed:', err);
        alert('Check-in failed. Please try again.');
    }
}

// Handle Existing Guest Check-In
async function handleExistingGuestCheckIn() {
    const existingGuestStep = document.getElementById('existingGuestStep');
    const guestIdNumber = existingGuestStep.dataset.guestIdNumber;
    
    const checkInData = {
        rid: selectedRoom.rid,
        uid: currentUser.uid,
        guestIdNumber: guestIdNumber
    };

    try {
        const response = await fetch(`${API_URL}/transactions/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkInData)
        });

        if (response.ok) {
            const transaction = await response.json();
            alert(`Check-in successful!\nRoom: ${selectedRoom.name}\nGuest: ${transaction.guestName}\nTransaction ID: ${transaction.tid}`);
            closeModals();
            loadRooms();
            loadStats();
        } else {
            const error = await response.json();
            alert('Check-in failed: ' + (error.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Check-in failed:', err);
        alert('Check-in failed. Please try again.');
    }
}

// Change Room Status
async function changeRoomStatus(newStatus) {
    if (!selectedRoom) return;
    
    // Prevent changing occupied room to available directly
    if (selectedRoom.status === 'OCCUPIED' && newStatus === 'AVAILABLE') {
        alert('Please check out the guest first before marking the room as available.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/rooms/${selectedRoom.rid}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            alert(`Room ${selectedRoom.name} status changed to ${newStatus}`);
            closeModals();
            loadRooms();
            loadStats();
        } else {
            const error = await response.json();
            alert('Status change failed: ' + (error.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Status change failed:', err);
        alert('Status change failed. Please try again.');
    }
}

// Handle Check-Out
async function handleCheckOut() {
    if (!currentTransaction) {
        alert('No active transaction found');
        return;
    }

    const total = document.getElementById('totalAmount').value;
    
    if (!confirm(`Check out guest ${currentTransaction.guestName}?\nTotal: $${total}`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/transactions/${currentTransaction.tid}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total: parseFloat(total) })
        });

        if (response.ok) {
            const transaction = await response.json();
            alert(`Check-out successful!\nGuest: ${transaction.guestName}\nDays: ${transaction.days}\nTotal: $${transaction.total}`);
            closeModals();
            loadRooms();
            loadStats();
        } else {
            const error = await response.json();
            alert('Check-out failed: ' + (error.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Check-out failed:', err);
        alert('Check-out failed. Please try again.');
    }
}
