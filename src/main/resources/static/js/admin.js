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
let partes = [];
let dailyReport = null;
let weeklyReport = null;
let monthlyReport = null;
let yearlyReport = null;
let availableYears = [];

// Pagination state
let guestsPage = 0;
let guestsTotalPages = 1;
let guestsHasMore = false;
let guestsSearchMode = false;

let transactionsPage = 0;
let transactionsTotalPages = 1;
let transactionsHasMore = false;
let transactionsSearchMode = false;

const PAGE_SIZE = 100;

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
    
    // Set today's date for daily report
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dailyDateInput').value = today;
    
    // Handle manager-specific restrictions
    if (currentUser.type === 'MANAGER') {
        // Change title to "Partes" for managers
        document.getElementById('panelTitle').textContent = '📄 Partes';
        document.title = 'Partes - Hotel Room Management';
        
        // Hide admin-only tabs
        document.querySelectorAll('.admin-only-tab').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Set Partes as the default active tab for managers
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="partes"]').classList.add('active');
        
        // Show only Partes tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById('partesTab').classList.remove('hidden');
    } else {
        // Admin: show all tabs and set Guests as default
        document.getElementById('panelTitle').textContent = '🛠️ Admin Panel';
        document.title = 'Admin Panel - Hotel Room Management';
        
        document.querySelectorAll('.admin-only-tab').forEach(tab => {
            tab.style.display = '';
        });
        
        // Set Guests as the default active tab for admin
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="guests"]').classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById('guestsTab').classList.remove('hidden');
    }
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
    
    // Guest search
    document.getElementById('guestSearchBtn').addEventListener('click', searchGuests);
    document.getElementById('guestSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchGuests();
    });
    document.getElementById('guestClearBtn').addEventListener('click', clearGuestSearch);
    
    // Guest pagination
    document.getElementById('guestsPrevBtn').addEventListener('click', () => loadGuestsPage(guestsPage - 1));
    document.getElementById('guestsNextBtn').addEventListener('click', () => loadGuestsPage(guestsPage + 1));
    
    // Transaction search
    document.getElementById('transactionSearchBtn').addEventListener('click', searchTransactions);
    document.getElementById('transactionSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchTransactions();
    });
    document.getElementById('transactionClearBtn').addEventListener('click', clearTransactionSearch);
    
    // Transaction pagination
    document.getElementById('transactionsPrevBtn').addEventListener('click', () => loadTransactionsPage(transactionsPage - 1));
    document.getElementById('transactionsNextBtn').addEventListener('click', () => loadTransactionsPage(transactionsPage + 1));
    
    // Daily report
    document.getElementById('loadDailyBtn').addEventListener('click', loadDailyReport);
    document.getElementById('dailyPrevBtn').addEventListener('click', goToPreviousDay);
    document.getElementById('dailyNextBtn').addEventListener('click', goToNextDay);
    
    // Income report sub-tabs
    document.querySelectorAll('.income-sub-btn').forEach(btn => {
        btn.addEventListener('click', () => switchIncomeSubTab(btn.dataset.incomeTab));
    });
    
    // Week report
    document.getElementById('loadWeekBtn').addEventListener('click', () => {
        const weekInput = document.getElementById('weekPickerInput').value;
        if (weekInput) loadWeeklyReport(weekInput);
    });
    
    // Month report
    document.getElementById('loadMonthBtn').addEventListener('click', () => {
        const month = document.getElementById('monthPickerMonth').value;
        const year = document.getElementById('monthPickerYear').value;
        if (month && year) loadMonthlyReport(parseInt(year), parseInt(month));
    });
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ==================== TAB SWITCHING ====================

function switchTab(tabName) {
    // Prevent managers from accessing admin-only tabs
    const adminOnlyTabs = ['guests', 'rooms', 'transactions', 'users', 'daily', 'income'];
    if (currentUser.type === 'MANAGER' && adminOnlyTabs.includes(tabName)) {
        return; // Don't switch to admin-only tabs for managers
    }
    
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
    
    // When switching to daily tab, always reload today's data
    if (tabName === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dailyDateInput').value = today;
        dailyReport = null;
        loadDailyReport();
    }
    
    // When switching to income tab, initialize it
    if (tabName === 'income') {
        initializeIncomeReport();
    }
}

// ==================== DATA LOADING ====================

async function loadAllData() {
    // For managers, only load partes
    if (currentUser.type === 'MANAGER') {
        await loadPartes();
        return;
    }
    
    // For admins, load all data
    await Promise.all([
        loadGuestsPage(0),
        loadRooms(),
        loadTransactionsPage(0),
        loadUsers(),
        loadPartes()
    ]);
}

// ==================== GUESTS WITH PAGINATION ====================

async function loadGuestsPage(page) {
    if (page < 0) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/guests?page=${page}&size=${PAGE_SIZE}`);
        const result = await response.json();
        
        guests = result.data || [];
        guestsPage = result.page;
        guestsHasMore = result.hasMore;
        guestsTotalPages = Math.ceil(result.total / PAGE_SIZE);
        guestsSearchMode = false;
        
        renderGuestsTable();
        updateGuestsPagination();
    } catch (error) {
        console.error('Error loading guests:', error);
    }
}

async function searchGuests() {
    const searchTerm = document.getElementById('guestSearchInput').value.trim();
    if (!searchTerm) {
        clearGuestSearch();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/guests/search?q=${encodeURIComponent(searchTerm)}`);
        guests = await response.json();
        guestsSearchMode = true;
        renderGuestsTable();
        
        // Hide pagination when searching
        document.getElementById('guestsPagination').style.display = 'none';
    } catch (error) {
        console.error('Error searching guests:', error);
    }
}

function clearGuestSearch() {
    document.getElementById('guestSearchInput').value = '';
    guestsSearchMode = false;
    document.getElementById('guestsPagination').style.display = 'flex';
    loadGuestsPage(0);
}

function updateGuestsPagination() {
    const prevBtn = document.getElementById('guestsPrevBtn');
    const nextBtn = document.getElementById('guestsNextBtn');
    const pageInfo = document.getElementById('guestsPageInfo');
    
    prevBtn.disabled = guestsPage === 0;
    nextBtn.disabled = !guestsHasMore;
    pageInfo.textContent = `Page ${guestsPage + 1} of ${guestsTotalPages}`;
    
    document.getElementById('guestsPagination').style.display = 'flex';
}

// ==================== TRANSACTIONS WITH PAGINATION ====================

async function loadTransactionsPage(page) {
    if (page < 0) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/transactions?page=${page}&size=${PAGE_SIZE}`);
        const result = await response.json();
        
        transactions = result.data || [];
        transactionsPage = result.page;
        transactionsHasMore = result.hasMore;
        transactionsTotalPages = Math.ceil(result.total / PAGE_SIZE);
        transactionsSearchMode = false;
        
        renderTransactionsTable();
        updateTransactionsPagination();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

async function searchTransactions() {
    const searchTerm = document.getElementById('transactionSearchInput').value.trim();
    if (!searchTerm) {
        clearTransactionSearch();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/transactions/search?q=${encodeURIComponent(searchTerm)}`);
        transactions = await response.json();
        transactionsSearchMode = true;
        renderTransactionsTable();
        
        // Hide pagination when searching
        document.getElementById('transactionsPagination').style.display = 'none';
    } catch (error) {
        console.error('Error searching transactions:', error);
    }
}

function clearTransactionSearch() {
    document.getElementById('transactionSearchInput').value = '';
    transactionsSearchMode = false;
    document.getElementById('transactionsPagination').style.display = 'flex';
    loadTransactionsPage(0);
}

function updateTransactionsPagination() {
    const prevBtn = document.getElementById('transactionsPrevBtn');
    const nextBtn = document.getElementById('transactionsNextBtn');
    const pageInfo = document.getElementById('transactionsPageInfo');
    
    prevBtn.disabled = transactionsPage === 0;
    nextBtn.disabled = !transactionsHasMore;
    pageInfo.textContent = `Page ${transactionsPage + 1} of ${transactionsTotalPages}`;
    
    document.getElementById('transactionsPagination').style.display = 'flex';
}

// ==================== OTHER DATA LOADING ====================

async function loadRooms() {
    try {
        const response = await fetch(`${API_BASE}/admin/rooms`);
        rooms = await response.json();
        renderRoomsTable();
    } catch (error) {
        console.error('Error loading rooms:', error);
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

async function loadPartes() {
    try {
        const response = await fetch(`${API_BASE}/admin/partes`);
        partes = await response.json();
        renderPartesTable();
    } catch (error) {
        console.error('Error loading partes:', error);
    }
}

// ==================== DAILY REPORT WITH NAVIGATION ====================

async function loadDailyReport() {
    const dateInput = document.getElementById('dailyDateInput').value;
    if (!dateInput) {
        alert('Please select a date');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/daily?date=${dateInput}`);
        dailyReport = await response.json();
        renderDailyReport();
        updateDailyNavButtons();
    } catch (error) {
        console.error('Error loading daily report:', error);
    }
}

function goToPreviousDay() {
    const dateInput = document.getElementById('dailyDateInput');
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() - 1);
    dateInput.value = currentDate.toISOString().split('T')[0];
    loadDailyReport();
}

function goToNextDay() {
    const dateInput = document.getElementById('dailyDateInput');
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() + 1);
    dateInput.value = currentDate.toISOString().split('T')[0];
    loadDailyReport();
}

function updateDailyNavButtons() {
    const dateInput = document.getElementById('dailyDateInput').value;
    const today = new Date().toISOString().split('T')[0];
    const nextBtn = document.getElementById('dailyNextBtn');
    
    // Hide next button if we're at today or future
    if (dateInput >= today) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'inline-block';
    }
}

// ==================== INCOME REPORT ====================

let weekChart = null;
let monthChart = null;
let yearChart = null;
let incomeInitialized = false;

async function initializeIncomeReport() {
    if (incomeInitialized) {
        // Just reload current week data when returning to tab
        loadCurrentWeekReport();
        return;
    }
    
    // Load available years first
    try {
        const response = await fetch(`${API_BASE}/admin/income/years`);
        availableYears = await response.json();
    } catch (error) {
        console.error('Error loading available years:', error);
        availableYears = [new Date().getFullYear()];
    }
    
    // Setup year picker for month tab
    const yearSelect = document.getElementById('monthPickerYear');
    yearSelect.innerHTML = availableYears.map(y => `<option value="${y}">${y}</option>`).join('');
    
    // Set current month in picker
    const now = new Date();
    document.getElementById('monthPickerMonth').value = now.getMonth() + 1;
    document.getElementById('monthPickerYear').value = now.getFullYear();
    
    // Generate quick buttons
    generateWeekQuickButtons();
    generateMonthQuickButtons();
    generateYearQuickButtons();
    
    // Load current week by default
    loadCurrentWeekReport();
    
    incomeInitialized = true;
}

function switchIncomeSubTab(subTabName) {
    // Update sub-tab buttons
    document.querySelectorAll('.income-sub-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.incomeTab === subTabName);
    });
    
    // Update sub-tab content
    document.querySelectorAll('.income-sub-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`${subTabName}SubTab`).classList.remove('hidden');
    
    // Load data for the sub-tab
    if (subTabName === 'week' && !weeklyReport) {
        loadCurrentWeekReport();
    } else if (subTabName === 'month' && !monthlyReport) {
        loadCurrentMonthReport();
    } else if (subTabName === 'year' && !yearlyReport) {
        loadCurrentYearReport();
    }
}

// ==================== WEEK REPORT ====================

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function generateWeekQuickButtons() {
    const container = document.getElementById('weekQuickButtons');
    const today = new Date();
    const buttons = [];
    
    for (let i = 0; i < 4; i++) {
        const weekDate = new Date(today);
        weekDate.setDate(today.getDate() - (i * 7));
        const monday = getMonday(weekDate);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        const label = i === 0 ? 'This Week' : 
                      i === 1 ? 'Last Week' : 
                      `${monday.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${sunday.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`;
        
        const mondayStr = monday.toISOString().split('T')[0];
        buttons.push(`<button class="quick-btn ${i === 0 ? 'active' : ''}" data-week="${mondayStr}" onclick="loadWeeklyReport('${mondayStr}')">${label}</button>`);
    }
    
    container.innerHTML = buttons.join('');
    
    // Set week picker to current Monday
    const currentMonday = getMonday(today);
    document.getElementById('weekPickerInput').value = currentMonday.toISOString().split('T')[0];
}

function loadCurrentWeekReport() {
    const monday = getMonday(new Date());
    loadWeeklyReport(monday.toISOString().split('T')[0]);
}

async function loadWeeklyReport(weekStart) {
    try {
        const response = await fetch(`${API_BASE}/admin/income/weekly?weekStart=${weekStart}`);
        weeklyReport = await response.json();
        renderWeeklyReport();
        
        // Update active button
        document.querySelectorAll('#weekQuickButtons .quick-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.week === weekStart);
        });
    } catch (error) {
        console.error('Error loading weekly report:', error);
    }
}

function renderWeeklyReport() {
    if (!weeklyReport) return;
    
    // Update summary
    const startDate = new Date(weeklyReport.startDate + 'T00:00:00');
    const endDate = new Date(weeklyReport.endDate + 'T00:00:00');
    document.getElementById('weekReportPeriod').textContent = 
        `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    document.getElementById('weekTotalAmount').textContent = 
        `$${parseFloat(weeklyReport.totalIncome || 0).toFixed(2)}`;
    document.getElementById('weekTransactionCount').textContent = 
        weeklyReport.transactionCount || 0;
    
    // Render chart
    renderWeekChart();
    
    // Render breakdown table
    const tbody = document.querySelector('#weekBreakdownTable tbody');
    const daily = weeklyReport.dailyBreakdown || [];
    tbody.innerHTML = daily.map(d => `
        <tr>
            <td>${d.dayName}</td>
            <td>${d.date}</td>
            <td>$${parseFloat(d.income || 0).toFixed(2)}</td>
            <td>${d.transactionCount}</td>
        </tr>
    `).join('');
    
    // Render room frequency
    renderRoomFrequency('weekRoomFreqTable', weeklyReport.roomFrequency);
}

function renderWeekChart() {
    const ctx = document.getElementById('weekChart').getContext('2d');
    const daily = weeklyReport.dailyBreakdown || [];
    
    if (weekChart) weekChart.destroy();
    
    weekChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: daily.map(d => d.dayName),
            datasets: [{
                label: 'Daily Income ($)',
                data: daily.map(d => parseFloat(d.income || 0)),
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ==================== MONTH REPORT ====================

function generateMonthQuickButtons() {
    const container = document.getElementById('monthQuickButtons');
    const today = new Date();
    const buttons = [];
    
    for (let i = 0; i < 3; i++) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth() + 1;
        const label = i === 0 ? 'This Month' : 
                      monthDate.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
        
        buttons.push(`<button class="quick-btn ${i === 0 ? 'active' : ''}" data-year="${year}" data-month="${month}" onclick="loadMonthlyReport(${year}, ${month})">${label}</button>`);
    }
    
    container.innerHTML = buttons.join('');
}

function loadCurrentMonthReport() {
    const now = new Date();
    loadMonthlyReport(now.getFullYear(), now.getMonth() + 1);
}

async function loadMonthlyReport(year, month) {
    try {
        const response = await fetch(`${API_BASE}/admin/income/monthly?year=${year}&month=${month}`);
        monthlyReport = await response.json();
        renderMonthlyReport();
        
        // Update active button
        document.querySelectorAll('#monthQuickButtons .quick-btn').forEach(btn => {
            btn.classList.toggle('active', 
                parseInt(btn.dataset.year) === year && parseInt(btn.dataset.month) === month);
        });
    } catch (error) {
        console.error('Error loading monthly report:', error);
    }
}

function renderMonthlyReport() {
    if (!monthlyReport) return;
    
    // Update summary
    const startDate = new Date(monthlyReport.startDate + 'T00:00:00');
    document.getElementById('monthReportPeriod').textContent = 
        startDate.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
    document.getElementById('monthTotalAmount').textContent = 
        `$${parseFloat(monthlyReport.totalIncome || 0).toFixed(2)}`;
    document.getElementById('monthTransactionCount').textContent = 
        monthlyReport.transactionCount || 0;
    
    // Render chart
    renderMonthChart();
    
    // Render breakdown table
    const tbody = document.querySelector('#monthBreakdownTable tbody');
    const weekly = monthlyReport.weeklyBreakdown || [];
    tbody.innerHTML = weekly.map(w => `
        <tr>
            <td>Week ${w.weekNumber}</td>
            <td>${w.weekStart} to ${w.weekEnd}</td>
            <td>$${parseFloat(w.income || 0).toFixed(2)}</td>
            <td>${w.transactionCount}</td>
        </tr>
    `).join('');
    
    // Render room frequency
    renderRoomFrequency('monthRoomFreqTable', monthlyReport.roomFrequency);
}

function renderMonthChart() {
    const ctx = document.getElementById('monthChart').getContext('2d');
    const weekly = monthlyReport.weeklyBreakdown || [];
    
    if (monthChart) monthChart.destroy();
    
    monthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weekly.map(w => `Week ${w.weekNumber}`),
            datasets: [{
                label: 'Weekly Income ($)',
                data: weekly.map(w => parseFloat(w.income || 0)),
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: 'rgba(118, 75, 162, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ==================== YEAR REPORT ====================

function generateYearQuickButtons() {
    const container = document.getElementById('yearQuickButtons');
    const currentYear = new Date().getFullYear();
    
    // Generate years from 2014 to current year
    const years = [];
    for (let y = currentYear; y >= 2014; y--) {
        years.push(y);
    }
    
    const buttons = years.map(y => 
        `<button class="quick-btn ${y === currentYear ? 'active' : ''}" data-year="${y}" onclick="loadYearlyReport(${y})">${y}</button>`
    ).join('');
    
    container.innerHTML = buttons;
}

function loadCurrentYearReport() {
    loadYearlyReport(new Date().getFullYear());
}

async function loadYearlyReport(year) {
    try {
        const response = await fetch(`${API_BASE}/admin/income/yearly?year=${year}`);
        yearlyReport = await response.json();
        renderYearlyReport();
        
        // Update active button
        document.querySelectorAll('#yearQuickButtons .quick-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.year) === year);
        });
    } catch (error) {
        console.error('Error loading yearly report:', error);
    }
}

function renderYearlyReport() {
    if (!yearlyReport) return;
    
    // Update summary
    const startDate = new Date(yearlyReport.startDate + 'T00:00:00');
    document.getElementById('yearReportPeriod').textContent = startDate.getFullYear();
    document.getElementById('yearTotalAmount').textContent = 
        `$${parseFloat(yearlyReport.totalIncome || 0).toFixed(2)}`;
    document.getElementById('yearTransactionCount').textContent = 
        yearlyReport.transactionCount || 0;
    
    // Render chart
    renderYearChart();
    
    // Render breakdown table
    const tbody = document.querySelector('#yearBreakdownTable tbody');
    const monthly = yearlyReport.monthlyBreakdown || [];
    tbody.innerHTML = monthly.map(m => `
        <tr>
            <td>${m.monthName}</td>
            <td>$${parseFloat(m.income || 0).toFixed(2)}</td>
            <td>${m.transactionCount}</td>
        </tr>
    `).join('');
    
    // Render room frequency
    renderRoomFrequency('yearRoomFreqTable', yearlyReport.roomFrequency);
}

function renderYearChart() {
    const ctx = document.getElementById('yearChart').getContext('2d');
    const monthly = yearlyReport.monthlyBreakdown || [];
    
    if (yearChart) yearChart.destroy();
    
    yearChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthly.map(m => m.monthName.substring(0, 3)),
            datasets: [{
                label: 'Monthly Income ($)',
                data: monthly.map(m => parseFloat(m.income || 0)),
                backgroundColor: 'rgba(40, 167, 69, 0.7)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ==================== ROOM FREQUENCY ====================

function renderRoomFrequency(tableId, roomFrequency) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    const data = roomFrequency || [];
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="no-data">No paid transactions</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(r => `
        <tr>
            <td>${r.roomName}</td>
            <td>${r.count}</td>
        </tr>
    `).join('');
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
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = sortedTransactions.map(t => `
        <tr>
            <td>${t.tid}</td>
            <td>${t.dateFormatted || t.date || '-'}</td>
            <td>${t.roomName}</td>
            <td>${t.guestName}</td>
            <td>${t.userName}</td>
            <td>$${t.total != null ? parseFloat(t.total).toFixed(2) : '0.00'}</td>
            <td>${t.parentTid || '-'}</td>
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
                        <button class="btn btn-sm btn-warning" onclick="toggleUserActive(${user.uid})">${user.active ? 'Deactivate' : 'Activate'}</button>
                        <button class="btn btn-sm btn-danger" onclick="confirmDeleteUser(${user.uid})">Delete</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderPartesTable() {
    const tbody = document.querySelector('#partesTable tbody');
    const sortedPartes = sortData([...partes], 'partes');
    
    if (sortedPartes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">No records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = sortedPartes.map(p => `
        <tr>
            <td>${p.roomName}</td>
            <td>${p.fullName}</td>
            <td>${p.country || '-'}</td>
            <td>${p.age || '-'}</td>
            <td>${p.marriageStatus || '-'}</td>
            <td>${p.occupation || '-'}</td>
            <td>${p.idNumber}</td>
            <td>${p.state || '-'}</td>
            <td>${p.date || '-'}</td>
        </tr>
    `).join('');
}

function renderDailyReport() {
    if (!dailyReport) return;
    
    document.getElementById('dailyReportDate').textContent = dailyReport.date || '-';
    document.getElementById('dailyTotalIncome').textContent = `$${parseFloat(dailyReport.totalIncome || 0).toFixed(2)}`;
    document.getElementById('dailyTransactionCount').textContent = dailyReport.transactionCount || 0;
    
    const tbody = document.querySelector('#dailyTable tbody');
    const transactions = dailyReport.transactions || [];
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No transactions for this date</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(t => {
        let type = 'Main Guest';
        if (t.isSubGuest) {
            type = 'Sub-Guest';
        } else if (t.parentTid) {
            type = 'Continue Stay';
        }
        
        return `
            <tr>
                <td>${t.tid}</td>
                <td>${t.roomName}</td>
                <td>${t.guestName}</td>
                <td>${t.guestIdNumber}</td>
                <td>${t.userName}</td>
                <td>$${t.total != null ? parseFloat(t.total).toFixed(2) : '0.00'}</td>
                <td><span class="type-badge ${type.toLowerCase().replace(' ', '-')}">${type}</span></td>
            </tr>
        `;
    }).join('');
}

// ==================== SORTING ====================

function handleSort(th) {
    const column = th.dataset.sort;
    const table = th.closest('table');
    
    // Toggle direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    // Update visual indicators
    table.querySelectorAll('th').forEach(t => {
        t.classList.remove('sort-asc', 'sort-desc');
    });
    th.classList.add(`sort-${currentSort.direction}`);
    
    // Re-render the appropriate table
    const tableId = table.id;
    if (tableId === 'guestsTable') renderGuestsTable();
    else if (tableId === 'roomsTable') renderRoomsTable();
    else if (tableId === 'transactionsTable') renderTransactionsTable();
    else if (tableId === 'usersTable') renderUsersTable();
    else if (tableId === 'partesTable') renderPartesTable();
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
        const guestTransactions = data.transactions || [];
        
        // Populate guest details
        document.getElementById('guestDetails').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">ID Number:</span>
                    <span class="detail-value">${guest.idNumber}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Full Name:</span>
                    <span class="detail-value">${guest.fullName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">State:</span>
                    <span class="detail-value">${guest.state || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Country:</span>
                    <span class="detail-value">${guest.country || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date of Birth:</span>
                    <span class="detail-value">${guest.dob || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Marriage Status:</span>
                    <span class="detail-value">${guest.marriageStatus || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Occupation:</span>
                    <span class="detail-value">${guest.occupation || '-'}</span>
                </div>
            </div>
            ${guest.description ? `<div class="detail-notes"><strong>Notes:</strong> ${guest.description}</div>` : ''}
        `;
        
        // Populate transactions
        if (guestTransactions.length === 0) {
            document.getElementById('guestTransactions').innerHTML = '<p class="no-data">No transaction history</p>';
        } else {
            document.getElementById('guestTransactions').innerHTML = `
                <table class="mini-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Room</th>
                            <th>Date</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${guestTransactions.map(t => `
                            <tr>
                                <td>${t.tid}</td>
                                <td>${t.roomName}</td>
                                <td>${t.date || '-'}</td>
                                <td>$${t.total != null ? parseFloat(t.total).toFixed(2) : '0.00'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
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
            loadGuestsPage(guestsPage);
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
            loadGuestsPage(guestsPage);
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
        const roomTransactions = data.transactions || [];
        
        document.querySelector('#viewGuestModal h2').textContent = 'Room Details';
        document.querySelector('#viewGuestModal h3').textContent = 'Transaction History';
        
        document.getElementById('guestDetails').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Room Name:</span>
                    <span class="detail-value">${room.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">${room.description || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value"><span class="status-badge ${room.status.toLowerCase()}">${room.status}</span></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Rate:</span>
                    <span class="detail-value">$${parseFloat(room.money).toFixed(2)}/night</span>
                </div>
            </div>
        `;
        
        if (roomTransactions.length === 0) {
            document.getElementById('guestTransactions').innerHTML = '<p class="no-data">No transaction history</p>';
        } else {
            document.getElementById('guestTransactions').innerHTML = `
                <table class="mini-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Guest</th>
                            <th>Date</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${roomTransactions.map(t => `
                            <tr>
                                <td>${t.tid}</td>
                                <td>${t.guestName}</td>
                                <td>${t.date || '-'}</td>
                                <td>$${t.total != null ? parseFloat(t.total).toFixed(2) : '0.00'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
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
    document.getElementById('editTransactionDate').value = transaction.date || '';
    document.getElementById('editTransactionTotal').value = transaction.total || '';
    
    openModal('editTransactionModal');
}

async function saveTransaction(e) {
    e.preventDefault();
    
    const tid = document.getElementById('editTransactionId').value;
    const data = {
        date: document.getElementById('editTransactionDate').value || null,
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
            loadTransactionsPage(transactionsPage);
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
            loadTransactionsPage(transactionsPage);
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
