// Admin Panel JavaScript

const API_BASE = '/api';
let currentUser = null;
let currentSort = { column: null, direction: 'asc' };
let deleteCallback = null;

// Data stores
let guests = [];
let rooms = [];
let transactions = [];
let users = [];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function checkAuth() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        showAccessDenied();
        return;
    }
    
    currentUser = JSON.parse(userStr);
    
    // Only allow ADMIN and MANAGER
    if (currentUser.type !== 'ADMIN' && currentUser.type !== 'MANAGER') {
        showAccessDenied();
        return;
    }
    
    // Set admin class for admin-only elements
    if (currentUser.type === 'ADMIN') {
        document.body.classList.add('is-admin');
    }
    
    showAdminPanel();
    loadAllData();
}

function showAccessDenied() {
    document.getElementById('accessDenied').classList.remove('hidden');
    document.getElementById('adminPage').classList.add('hidden');
}

function showAdminPanel() {
    document.getElementById('accessDenied').classList.add('hidden');
    document.getElementById('adminPage').classList.remove('hidden');
    document.getElementById('currentUser').textContent = `${currentUser.fullName} (${currentUser.type})`;
}

function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-btn, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });
    
    // Form submissions
    document.getElementById('editGuestForm').addEventListener('submit', saveGuest);
    document.getElementById('editRoomForm').addEventListener('submit', saveRoom);
    document.getElementById('editTransactionForm').addEventListener('submit', saveTransaction);
    document.getElementById('editUserForm').addEventListener('submit', saveUser);
    
    // Add user button
    document.getElementById('addUserBtn').addEventListener('click', () => openUserModal());
    
    // Confirm delete
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        if (deleteCallback) {
            deleteCallback();
            closeAllModals();
        }
    });
    
    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th));
    });
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ==================== TAB SWITCHING ====================

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    
    // Reset sort
    currentSort = { column: null, direction: 'asc' };
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
}

// ==================== DATA LOADING ====================

async function loadAllData() {
    await Promise.all([
        loadGuests(),
        loadRooms(),
        loadTransactions(),
        loadUsers()
    ]);
}

async function loadGuests() {
    try {
        const response = await fetch(`${API_BASE}/admin/guests`);
        guests = await response.json();
        renderGuestsTable();
    } catch (error) {
        console.error('Error loading guests:', error);
    }
}

async function loadRooms() {
    try {
        const response = await fetch(`${API_BASE}/admin/rooms`);
        rooms = await response.json();
        renderRoomsTable();
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/admin/transactions`);
        transactions = await response.json();
        renderTransactionsTable();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`);
        users = await response.json();
        renderUsersTable();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// ==================== TABLE RENDERING ====================

function renderGuestsTable() {
    const tbody = document.querySelector('#guestsTable tbody');
    const sortedGuests = sortData([...guests], 'guests');
    
    if (sortedGuests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No guests found</td></tr>';
        return;
    }
    
    tbody.innerHTML = sortedGuests.map(guest => `
        <tr>
            <td>${guest.gid}</td>
            <td>${guest.idNumber}</td>
            <td>${guest.fullName}</td>
            <td>${guest.state || '-'}</td>
            <td>${guest.country || '-'}</td>
            <td>${guest.occupation || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-view" onclick="viewGuest(${guest.gid})">View</button>
                    ${currentUser.type === 'ADMIN' ? `
                        <button class="btn btn-sm btn-edit" onclick="editGuest(${guest.gid})">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="confirmDeleteGuest(${guest.gid})">Delete</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderRoomsTable() {
    const tbody = document.querySelector('#roomsTable tbody');
    const sortedRooms = sortData([...rooms], 'rooms');
    
    if (sortedRooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No rooms found</td></tr>';
        return;
    }
    
    tbody.innerHTML = sortedRooms.map(room => `
        <tr>
            <td>${room.rid}</td>
            <td>${room.name}</td>
            <td>${room.description || '-'}</td>
            <td><span class="status-badge ${room.status.toLowerCase()}">${room.status}</span></td>
            <td>$${parseFloat(room.money).toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-view" onclick="viewRoom(${room.rid})">View</button>
                    ${currentUser.type === 'ADMIN' ? `
                        <button class="btn btn-sm btn-edit" onclick="editRoom(${room.rid})">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="confirmDeleteRoom(${room.rid})">Delete</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderTransactionsTable() {
    const tbody = document.querySelector('#transactionsTable tbody');
    const sortedTransactions = sortData([...transactions], 'transactions');
    
    if (sortedTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = sortedTransactions.map(t => `
        <tr>
            <td>${t.tid}</td>
            <td>${t.roomName}</td>
            <td>${t.guestName}</td>
            <td>${t.userName}</td>
            <td>${t.startDate}</td>
            <td>${t.endDate || '<span class="status-badge active">Active</span>'}</td>
            <td>${t.days || '-'}</td>
            <td>${t.total ? '$' + parseFloat(t.total).toFixed(2) : '-'}</td>
            <td>
                <div class="action-buttons">
                    ${currentUser.type === 'ADMIN' ? `
                        <button class="btn btn-sm btn-edit" onclick="editTransaction(${t.tid})">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="confirmDeleteTransaction(${t.tid})">Delete</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderUsersTable() {
    const tbody = document.querySelector('#usersTable tbody');
    const sortedUsers = sortData([...users], 'users');
    
    if (sortedUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = sortedUsers.map(user => `
        <tr>
            <td>${user.uid}</td>
            <td>${user.username}</td>
            <td>${user.fullName}</td>
            <td><span class="role-badge ${user.type.toLowerCase()}">${user.type}</span></td>
            <td>${user.startDate || '-'}</td>
            <td><span class="status-badge ${user.active ? 'active' : 'inactive'}">${user.active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    ${currentUser.type === 'ADMIN' ? `
                        <button class="btn btn-sm btn-edit" onclick="editUser(${user.uid})">Edit</button>
                        <button class="btn btn-sm btn-toggle" onclick="toggleUserActive(${user.uid})">${user.active ? 'Deactivate' : 'Activate'}</button>
                        <button class="btn btn-sm btn-danger" onclick="confirmDeleteUser(${user.uid})">Delete</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== SORTING ====================

function handleSort(th) {
    const column = th.dataset.sort;
    const table = th.closest('table');
    
    // Clear other sort indicators in same table
    table.querySelectorAll('th').forEach(header => {
        if (header !== th) {
            header.classList.remove('sort-asc', 'sort-desc');
        }
    });
    
    // Toggle sort direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    // Update visual indicator
    th.classList.remove('sort-asc', 'sort-desc');
    th.classList.add(`sort-${currentSort.direction}`);
    
    // Re-render appropriate table
    const tableId = table.id;
    if (tableId === 'guestsTable') renderGuestsTable();
    else if (tableId === 'roomsTable') renderRoomsTable();
    else if (tableId === 'transactionsTable') renderTransactionsTable();
    else if (tableId === 'usersTable') renderUsersTable();
}

function sortData(data, type) {
    if (!currentSort.column) return data;
    
    return data.sort((a, b) => {
        let aVal = a[currentSort.column];
        let bVal = b[currentSort.column];
        
        // Handle null/undefined
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        
        // Handle numbers
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return currentSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // Handle strings
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        
        if (currentSort.direction === 'asc') {
            return aVal.localeCompare(bVal);
        } else {
            return bVal.localeCompare(aVal);
        }
    });
}

// ==================== GUEST OPERATIONS ====================

async function viewGuest(gid) {
    try {
        const response = await fetch(`${API_BASE}/admin/guests/${gid}`);
        const data = await response.json();
        
        const guest = data.guest;
        const guestTransactions = data.transactions;
        
        // Render guest details
        document.getElementById('guestDetails').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">ID Number</span>
                    <span class="detail-value">${guest.idNumber}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Full Name</span>
                    <span class="detail-value">${guest.fullName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date of Birth</span>
                    <span class="detail-value">${guest.dob || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Marriage Status</span>
                    <span class="detail-value">${guest.marriageStatus || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">State</span>
                    <span class="detail-value">${guest.state || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Country</span>
                    <span class="detail-value">${guest.country || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Occupation</span>
                    <span class="detail-value">${guest.occupation || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total Stays</span>
                    <span class="detail-value">${guestTransactions.length}</span>
                </div>
                ${guest.description ? `
                    <div class="detail-notes">
                        <strong>Notes:</strong> ${guest.description}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Render transactions
        if (guestTransactions.length === 0) {
            document.getElementById('guestTransactions').innerHTML = '<p class="no-data">No transaction history</p>';
        } else {
            document.getElementById('guestTransactions').innerHTML = guestTransactions.map(t => `
                <div class="transaction-item ${t.endDate ? 'completed' : 'active'}">
                    <div class="transaction-info">
                        <strong>Room ${t.roomName}</strong>
                        <small>${t.startDate} → ${t.endDate || 'Present'} ${t.days ? `(${t.days} days)` : ''}</small>
                    </div>
                    <div class="transaction-amount">${t.total ? '$' + parseFloat(t.total).toFixed(2) : '-'}</div>
                </div>
            `).join('');
        }
        
        openModal('viewGuestModal');
    } catch (error) {
        console.error('Error viewing guest:', error);
        alert('Error loading guest details');
    }
}

function editGuest(gid) {
    const guest = guests.find(g => g.gid === gid);
    if (!guest) return;
    
    document.getElementById('editGuestId').value = guest.gid;
    document.getElementById('editGuestIdNumber').value = guest.idNumber;
    document.getElementById('editGuestFullName').value = guest.fullName;
    document.getElementById('editGuestState').value = guest.state || '';
    document.getElementById('editGuestCountry').value = guest.country || '';
    document.getElementById('editGuestDob').value = guest.dob || '';
    document.getElementById('editGuestMarriage').value = guest.marriageStatus || '';
    document.getElementById('editGuestOccupation').value = guest.occupation || '';
    document.getElementById('editGuestDescription').value = guest.description || '';
    
    openModal('editGuestModal');
}

async function saveGuest(e) {
    e.preventDefault();
    
    const gid = document.getElementById('editGuestId').value;
    const data = {
        fullName: document.getElementById('editGuestFullName').value,
        state: document.getElementById('editGuestState').value,
        country: document.getElementById('editGuestCountry').value,
        dob: document.getElementById('editGuestDob').value || null,
        marriageStatus: document.getElementById('editGuestMarriage').value,
        occupation: document.getElementById('editGuestOccupation').value,
        description: document.getElementById('editGuestDescription').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/guests/${gid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeAllModals();
            loadGuests();
            alert('Guest updated successfully');
        } else {
            const error = await response.json();
            alert(error.error || 'Error updating guest');
        }
    } catch (error) {
        console.error('Error saving guest:', error);
        alert('Error saving guest');
    }
}

function confirmDeleteGuest(gid) {
    const guest = guests.find(g => g.gid === gid);
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete guest "${guest.fullName}"?`;
    deleteCallback = () => deleteGuest(gid);
    openModal('confirmDeleteModal');
}

async function deleteGuest(gid) {
    try {
        const response = await fetch(`${API_BASE}/admin/guests/${gid}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadGuests();
            alert('Guest deleted successfully');
        } else {
            const error = await response.json();
            alert(error.error || 'Error deleting guest');
        }
    } catch (error) {
        console.error('Error deleting guest:', error);
        alert('Error deleting guest');
    }
}

// ==================== ROOM OPERATIONS ====================

async function viewRoom(rid) {
    try {
        const response = await fetch(`${API_BASE}/admin/rooms/${rid}`);
        const data = await response.json();
        
        const room = data.room;
        const roomTransactions = data.transactions;
        
        // Reuse guest modal for room viewing
        document.getElementById('guestDetails').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Room Name</span>
                    <span class="detail-value">${room.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="detail-value"><span class="status-badge ${room.status.toLowerCase()}">${room.status}</span></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Rate per Night</span>
                    <span class="detail-value">$${parseFloat(room.money).toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total Bookings</span>
                    <span class="detail-value">${roomTransactions.length}</span>
                </div>
                ${room.description ? `
                    <div class="detail-notes">
                        <strong>Description:</strong> ${room.description}
                    </div>
                ` : ''}
            </div>
        `;
        
        document.querySelector('#viewGuestModal h2').textContent = 'Room Details';
        document.querySelector('#viewGuestModal h3').textContent = 'Booking History';
        
        if (roomTransactions.length === 0) {
            document.getElementById('guestTransactions').innerHTML = '<p class="no-data">No booking history</p>';
        } else {
            document.getElementById('guestTransactions').innerHTML = roomTransactions.map(t => `
                <div class="transaction-item ${t.endDate ? 'completed' : 'active'}">
                    <div class="transaction-info">
                        <strong>${t.guestName}</strong>
                        <small>${t.startDate} → ${t.endDate || 'Present'} ${t.days ? `(${t.days} days)` : ''}</small>
                    </div>
                    <div class="transaction-amount">${t.total ? '$' + parseFloat(t.total).toFixed(2) : '-'}</div>
                </div>
            `).join('');
        }
        
        openModal('viewGuestModal');
    } catch (error) {
        console.error('Error viewing room:', error);
        alert('Error loading room details');
    }
}

function editRoom(rid) {
    const room = rooms.find(r => r.rid === rid);
    if (!room) return;
    
    document.getElementById('editRoomId').value = room.rid;
    document.getElementById('editRoomName').value = room.name;
    document.getElementById('editRoomDescription').value = room.description || '';
    document.getElementById('editRoomMoney').value = room.money;
    
    openModal('editRoomModal');
}

async function saveRoom(e) {
    e.preventDefault();
    
    const rid = document.getElementById('editRoomId').value;
    const data = {
        name: document.getElementById('editRoomName').value,
        description: document.getElementById('editRoomDescription').value,
        money: parseFloat(document.getElementById('editRoomMoney').value)
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/rooms/${rid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeAllModals();
            loadRooms();
            alert('Room updated successfully');
        } else {
            const error = await response.json();
            alert(error.error || 'Error updating room');
        }
    } catch (error) {
        console.error('Error saving room:', error);
        alert('Error saving room');
    }
}

function confirmDeleteRoom(rid) {
    const room = rooms.find(r => r.rid === rid);
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete room "${room.name}"?`;
    deleteCallback = () => deleteRoom(rid);
    openModal('confirmDeleteModal');
}

async function deleteRoom(rid) {
    try {
        const response = await fetch(`${API_BASE}/admin/rooms/${rid}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadRooms();
            alert('Room deleted successfully');
        } else {
            const error = await response.json();
            alert(error.error || 'Error deleting room');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        alert('Error deleting room');
    }
}

// ==================== TRANSACTION OPERATIONS ====================

function editTransaction(tid) {
    const transaction = transactions.find(t => t.tid === tid);
    if (!transaction) return;
    
    document.getElementById('editTransactionId').value = transaction.tid;
    document.getElementById('editTransactionRoom').value = transaction.roomName;
    document.getElementById('editTransactionGuest').value = transaction.guestName;
    document.getElementById('editTransactionStartDate').value = transaction.startDate;
    document.getElementById('editTransactionEndDate').value = transaction.endDate || '';
    document.getElementById('editTransactionDays').value = transaction.days || '';
    document.getElementById('editTransactionTotal').value = transaction.total || '';
    
    openModal('editTransactionModal');
}

async function saveTransaction(e) {
    e.preventDefault();
    
    const tid = document.getElementById('editTransactionId').value;
    const data = {
        startDate: document.getElementById('editTransactionStartDate').value,
        endDate: document.getElementById('editTransactionEndDate').value || null,
        days: parseInt(document.getElementById('editTransactionDays').value) || null,
        total: parseFloat(document.getElementById('editTransactionTotal').value) || null
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/transactions/${tid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeAllModals();
            loadTransactions();
            alert('Transaction updated successfully');
        } else {
            const error = await response.json();
            alert(error.error || 'Error updating transaction');
        }
    } catch (error) {
        console.error('Error saving transaction:', error);
        alert('Error saving transaction');
    }
}

function confirmDeleteTransaction(tid) {
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete transaction #${tid}?`;
    deleteCallback = () => deleteTransaction(tid);
    openModal('confirmDeleteModal');
}

async function deleteTransaction(tid) {
    try {
        const response = await fetch(`${API_BASE}/admin/transactions/${tid}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadTransactions();
            alert('Transaction deleted successfully');
        } else {
            const error = await response.json();
            alert(error.error || 'Error deleting transaction');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction');
    }
}

// ==================== USER OPERATIONS ====================

function openUserModal(uid = null) {
    if (uid) {
        const user = users.find(u => u.uid === uid);
        if (!user) return;
        
        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('editUserId').value = user.uid;
        document.getElementById('editUserUsername').value = user.username;
        document.getElementById('editUserUsername').readOnly = true;
        document.getElementById('editUserPassword').value = '';
        document.getElementById('editUserPassword').required = false;
        document.getElementById('editUserFullName').value = user.fullName;
        document.getElementById('editUserType').value = user.type;
        document.getElementById('passwordGroup').querySelector('small').style.display = 'block';
    } else {
        document.getElementById('userModalTitle').textContent = 'Add New User';
        document.getElementById('editUserId').value = '';
        document.getElementById('editUserUsername').value = '';
        document.getElementById('editUserUsername').readOnly = false;
        document.getElementById('editUserPassword').value = '';
        document.getElementById('editUserPassword').required = true;
        document.getElementById('editUserFullName').value = '';
        document.getElementById('editUserType').value = 'RECEPTIONIST';
        document.getElementById('passwordGroup').querySelector('small').style.display = 'none';
    }
    
    openModal('editUserModal');
}

function editUser(uid) {
    openUserModal(uid);
}

async function saveUser(e) {
    e.preventDefault();
    
    const uid = document.getElementById('editUserId').value;
    const isNew = !uid;
    
    const data = {
        username: document.getElementById('editUserUsername').value,
        fullName: document.getElementById('editUserFullName').value,
        type: document.getElementById('editUserType').value
    };
    
    const password = document.getElementById('editUserPassword').value;
    if (password) {
        data.password = password;
    }
    
    try {
        let response;
        if (isNew) {
            response = await fetch(`${API_BASE}/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_BASE}/admin/users/${uid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            // Update password separately if provided
            if (password) {
                await fetch(`${API_BASE}/admin/users/${uid}/password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
            }
        }
        
        if (response.ok) {
            closeAllModals();
            loadUsers();
            alert(isNew ? 'User created successfully' : 'User updated successfully');
        } else {
            const error = await response.json();
            alert(error.error || 'Error saving user');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Error saving user');
    }
}

async function toggleUserActive(uid) {
    try {
        const response = await fetch(`${API_BASE}/admin/users/${uid}/toggle-active`, { method: 'PUT' });
        
        if (response.ok) {
            loadUsers();
        } else {
            const error = await response.json();
            alert(error.error || 'Error toggling user status');
        }
    } catch (error) {
        console.error('Error toggling user:', error);
        alert('Error toggling user status');
    }
}

function confirmDeleteUser(uid) {
    const user = users.find(u => u.uid === uid);
    
    // Prevent deleting yourself
    if (user.uid === currentUser.uid) {
        alert('You cannot delete your own account');
        return;
    }
    
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete user "${user.fullName}"?`;
    deleteCallback = () => deleteUser(uid);
    openModal('confirmDeleteModal');
}

async function deleteUser(uid) {
    try {
        const response = await fetch(`${API_BASE}/admin/users/${uid}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadUsers();
            alert('User deleted successfully');
        } else {
            const error = await response.json();
            alert(error.error || 'Error deleting user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
    }
}

// ==================== MODAL UTILITIES ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
    deleteCallback = null;
    
    // Reset view modal titles
    document.querySelector('#viewGuestModal h2').textContent = 'Guest Details';
    document.querySelector('#viewGuestModal h3').textContent = 'Transaction History';
}
