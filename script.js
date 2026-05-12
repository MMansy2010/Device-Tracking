// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxRp3Py0B4VbLGlCy1Eu7ybypRBmiRuU8",
  authDomain: "device-tracking-b8ec2.firebaseapp.com",
  projectId: "device-tracking-b8ec2",
  storageBucket: "device-tracking-b8ec2.firebasestorage.app",
  messagingSenderId: "276749842854",
  appId: "1:276749842854:web:269141d1d8876d30b47767",
  measurementId: "G-ZZKV68ZJK6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
let db;
try {
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase not initialized yet. Please update firebaseConfig.", e);
}

// State
let state = {
  loggedIn: false,
  page: 'login', // 'login', 'choose', 'tracker'
  pageName: '', // 'Total', 'Level'
  devices: [],
  locations: [
    "AL BUROUJ Construction",
    "New Heliopolis - Landscape Work",
    "Hyde Park Mountain View",
    "ICity - October",
    "ICity-New Cairo",
    "MNHD - Taj City - Lake Park",
    "Mountain View North Coast",
    "MV 1.1",
    "October Park - Extension - Rayos",
    "ORA - ZED East Compound - Landscape works",
    "Sodic - June - North coast",
    "Sodic - The Estates - October",
    "Swan Lake Landscape - NC",
    "CBD",
    "LANA",
    "Life Sports Club",
    "I-city Oct.",
    "Zed ORA",
    "Saada"
  ],
  searchTerm: '',
  editDeviceId: null,
  excelData: null, // Holds parsed Excel data before saving
  columnFilters: {
    serial: [],
    type: [],
    set: [],
    model: [],
    calDate: [],
    location: []
  }
};

// DOM Elements
const views = {
  login: document.getElementById('view-login'),
  pageSelect: document.getElementById('view-page-select'),
  tracker: document.getElementById('view-tracker')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('current-year').textContent = new Date().getFullYear();

  // Login listeners
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Page select listeners
  document.getElementById('btn-page-total').addEventListener('click', () => navigateToTracker('Total'));
  document.getElementById('btn-page-level').addEventListener('click', () => navigateToTracker('Level'));
  document.getElementById('btn-logout-1').addEventListener('click', handleLogout);

  // Tracker Listeners
  document.getElementById('btn-logout-2').addEventListener('click', handleLogout);
  document.getElementById('btn-back-to-select').addEventListener('click', () => {
    state.page = 'choose';
    renderView();
  });

  // Search & Sort
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchTerm = e.target.value;
    renderDevices();
  });
  document.getElementById('btn-clear-search').addEventListener('click', () => {
    state.searchTerm = '';
    document.getElementById('search-input').value = '';
    renderDevices();
  });
  document.getElementById('btn-sort').addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    document.getElementById('btn-sort').textContent = `Sort: ${state.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`;
    renderDevices();
  });

  // Add Device Form
  document.getElementById('add-device-form').addEventListener('submit', handleAddDevice);

  // Location select listener
  setupLocationDropdown('dev-location', 'dev-loc-other-container', 'dev-loc-other', 'btn-add-loc-new');

  // Excel Upload Listeners
  document.getElementById('excel-upload').addEventListener('change', handleExcelSelect);
  document.getElementById('btn-process-excel').addEventListener('click', processExcelData);

  // Modal close & Submit Move
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-submit-move').addEventListener('click', submitMove);

  // Edit Modal Listeners
  document.getElementById('btn-close-edit-modal').addEventListener('click', closeEditModal);
  document.getElementById('edit-device-form').addEventListener('submit', handleEditDeviceSubmit);
  
  // Export Listener
  document.getElementById('btn-export-excel').addEventListener('click', exportToExcel);

  // Multi-select Listeners
  const filterIds = ['ms-serial', 'ms-type', 'ms-set', 'ms-model', 'ms-cal-date', 'ms-location'];
  
  filterIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const header = el.querySelector('.ms-header');
    const optionsCont = el.querySelector('.ms-options');
    
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close others
      document.querySelectorAll('.ms-options').forEach(opt => {
        if (opt !== optionsCont) opt.classList.add('hidden');
      });
      optionsCont.classList.toggle('hidden');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.ms-options').forEach(opt => {
      opt.classList.add('hidden');
    });
  });

  renderLocationOptions();
  renderView();
});

// --- Logic ---

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  if (username === 'Ahmad' && pass === 'asmansy@123') {
    state.loggedIn = true;
    state.page = 'choose';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    loadDevices();
    renderView();
  } else {
    alert('Invalid credentials');
  }
}

function handleLogout() {
  state.loggedIn = false;
  state.page = 'login';
  renderView();
}

function navigateToTracker(pageName) {
  state.page = 'tracker';
  state.pageName = pageName;
  document.getElementById('tracker-title').textContent = `${pageName} Device Tracking`;
  renderView();
}

function renderView() {
  views.login.classList.add('hidden');
  views.pageSelect.classList.add('hidden');
  views.tracker.classList.add('hidden');

  if (!state.loggedIn) {
    views.login.classList.remove('hidden');
  } else if (state.page === 'choose') {
    views.pageSelect.classList.remove('hidden');
  } else if (state.page === 'tracker') {
    views.tracker.classList.remove('hidden');
    renderLocationOptions(); // Refresh dropdowns
    renderDevices();
  }
}

// --- Data Fetching ---

let unsubscribe = null;

function loadDevices() {
  if (!db) return;

  const devicesCol = collection(db, 'devices');
  if (unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(devicesCol, (snapshot) => {
    const devicesList = [];
    snapshot.forEach((doc) => {
      devicesList.push({ id: doc.id, ...doc.data() });
    });
    state.devices = devicesList;
    renderDevices();
  }, (error) => {
    console.error("Error listening to devices: ", error);
  });
}

// --- Dynamic Locations ---

function renderLocationOptions() {
  const dropdowns = [
    document.getElementById('dev-location'),
    document.getElementById('modal-move-to'),
    document.getElementById('edit-dev-location')
  ].filter(Boolean);
  dropdowns.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select Location</option>';

    // Make locations unique and sorted
    const uniqueLocs = [...new Set(state.locations)].sort();
    
    uniqueLocs.forEach(loc => {
      const option = document.createElement('option');
      option.value = loc;
      option.textContent = loc;
      select.appendChild(option);
    });

    const otherOption = document.createElement('option');
    otherOption.value = 'other';
    otherOption.textContent = 'Other (Add New)';
    select.appendChild(otherOption);

    if (currentValue && state.locations.includes(currentValue)) {
      select.value = currentValue;
    }
  });
}

function setupLocationDropdown(selectId, containerId, inputId, btnId) {
  const select = document.getElementById(selectId);
  const container = document.getElementById(containerId);
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);

  select.addEventListener('change', (e) => {
    if (e.target.value === 'other') {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  });

  btn.addEventListener('click', () => {
    const newLoc = input.value.trim();
    if (newLoc && !state.locations.includes(newLoc)) {
      state.locations.push(newLoc);
      renderLocationOptions();
      select.value = newLoc;
      input.value = '';
      container.classList.add('hidden');
    }
  });
}

// --- Excel Upload Operations ---

function handleExcelSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('upload-status');
  statusEl.textContent = 'Reading file...';
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array', cellDates: true});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      // Convert to JSON array of arrays to handle missing headers reliably
      const json = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: false, dateNF: 'yyyy-mm-dd'});
      
      // Skip the header row (assuming row 0 is header)
      const dataRows = json.slice(1);
      
      state.excelData = dataRows.filter(row => row.length > 0 && row[0]); // Ensure row has at least a serial
      
      document.getElementById('btn-process-excel').classList.remove('hidden');
      statusEl.textContent = `Found ${state.excelData.length} devices ready to import.`;
      statusEl.style.color = "var(--success-color)";
    } catch (err) {
      statusEl.textContent = 'Error parsing Excel file.';
      statusEl.style.color = "var(--danger-color)";
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function processExcelData() {
  if (!state.excelData || state.excelData.length === 0) return;
  if (!db) {
    alert("Database not connected.");
    return;
  }

  const statusEl = document.getElementById('upload-status');
  statusEl.textContent = 'Importing to database... Please wait.';
  statusEl.style.color = "var(--primary-color)";
  document.getElementById('btn-process-excel').disabled = true;

  let successCount = 0;
  
  for (const row of state.excelData) {
    // Mapping:
    // row[0] = Serial
    // row[1] = Type
    // row[2] = Set
    // row[3] = Model
    // row[4] = Latest Calibration
    // row[5] = Current Location
    
    const serial = String(row[0] || '').trim();
    if (!serial) continue;

    const type = String(row[1] || '').trim();
    const setBrand = String(row[2] || '').trim();
    const model = String(row[3] || '').trim();
    const calDate = String(row[4] || '').trim();
    const location = String(row[5] || '').trim();

    // Auto-add new locations to global list (optional, but helpful)
    if (location && !state.locations.includes(location)) {
      state.locations.push(location);
    }

    try {
      await addDoc(collection(db, 'devices'), {
        serial: serial,
        type: type,
        set: setBrand,
        model: model,
        calibrationDate: calDate,
        currentLocation: location,
        moveHistory: [{
          date: new Date().toISOString().split('T')[0],
          locationFrom: "Import",
          locationTo: location
        }]
      });
      successCount++;
    } catch (e) {
      console.error("Error adding row: ", row, e);
    }
  }

  statusEl.textContent = `Successfully imported ${successCount} devices!`;
  statusEl.style.color = "var(--success-color)";
  document.getElementById('btn-process-excel').classList.add('hidden');
  document.getElementById('btn-process-excel').disabled = false;
  document.getElementById('excel-upload').value = ""; // Clear input
  
  state.excelData = null; // Clear memory
  renderLocationOptions(); // Refresh dropdowns with any newly discovered locations
}

// --- Device Operations ---

async function handleAddDevice(e) {
  e.preventDefault();
  const serial = document.getElementById('dev-serial').value;
  const type = document.getElementById('dev-type').value;
  const setBrand = document.getElementById('dev-set').value;
  const model = document.getElementById('dev-model').value;
  const calDate = document.getElementById('dev-cal-date').value;
  const location = document.getElementById('dev-location').value;

  if (serial && type && location && location !== 'other') {
    if (db) {
      try {
        await addDoc(collection(db, 'devices'), {
          serial: serial,
          type: type,
          set: setBrand,
          model: model,
          calibrationDate: calDate,
          currentLocation: location,
          moveHistory: [{ 
            date: new Date().toISOString().split('T')[0], 
            locationFrom: "Initial Entry", 
            locationTo: location 
          }]
        });
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    } else {
      alert("Database not connected!");
    }

    // Reset Form
    e.target.reset();
    document.getElementById('dev-loc-other-container').classList.add('hidden');
  } else {
    alert("Please fill required fields and add new locations if 'Other' is selected.");
  }
}

async function updateDevice(id, field, value) {
  if (value && db) {
    const updateObj = {};
    updateObj[field] = value;
    await updateDoc(doc(db, 'devices', id), updateObj);
    state.editDeviceId = null;
    renderDevices();
  }
}

async function deleteDevice(id) {
  if (confirm('Are you sure you want to delete this device?')) {
    if (db) {
      await deleteDoc(doc(db, 'devices', id));
    }
  }
}

async function submitMove(e) {
  const deviceId = document.getElementById('modal-device-id').value;
  const date = document.getElementById('modal-move-date').value;
  const toLocation = document.getElementById('modal-move-to').value;
  
  if (!date || !toLocation || toLocation === 'other') {
    alert('Please select a valid date and location.');
    return;
  }

  const device = state.devices.find(d => d.id === deviceId);
  if (device && db) {
    const newHistory = device.moveHistory || [];
    // The "From" is the current location
    const fromLocation = device.currentLocation || "Unknown";
    
    newHistory.push({ date: date, locationFrom: fromLocation, locationTo: toLocation });

    try {
      await updateDoc(doc(db, 'devices', deviceId), {
        currentLocation: toLocation,
        moveHistory: newHistory
      });
      // Clear inputs
      document.getElementById('modal-move-date').value = '';
      document.getElementById('modal-move-to').value = '';
      // Refresh modal view
      window.showHistory(deviceId);
    } catch(err) {
      console.error(err);
    }
  }
}

// --- Rendering ---

function renderDevices() {
  if (state.page !== 'tracker') return;

  const tbody = document.getElementById('device-table-body');
  tbody.innerHTML = '';

  let pageDevices = state.devices.filter(d => {
    // Check page type filter
    const devType = (d.type || '').toLowerCase();
    if (state.pageName === 'Total' && !(devType.includes('total') || devType.includes('توتال'))) return false;
    if (state.pageName === 'Level' && !(devType.includes('level') || devType.includes('ميزان') || devType.includes('ليفل'))) return false;
    return true;
  });

  populateColumnFilters(pageDevices);

  let filtered = pageDevices.filter(d => {
    // Check column filters
    if (state.columnFilters.serial.length > 0 && !state.columnFilters.serial.includes(d.serial || '')) return false;
    if (state.columnFilters.type.length > 0 && !state.columnFilters.type.includes(d.type || '')) return false;
    if (state.columnFilters.set.length > 0 && !state.columnFilters.set.includes(d.set || '')) return false;
    if (state.columnFilters.model.length > 0 && !state.columnFilters.model.includes(d.model || '')) return false;
    if (state.columnFilters.calDate.length > 0 && !state.columnFilters.calDate.includes(d.calibrationDate || '')) return false;
    if (state.columnFilters.location.length > 0 && !state.columnFilters.location.includes(d.currentLocation || '')) return false;

    const term = state.searchTerm.toLowerCase();
    const searchString = `${d.serial} ${d.type} ${d.model} ${d.currentLocation}`.toLowerCase();
    return searchString.includes(term);
  });

  filtered.sort((a, b) => {
    const valA = (a.serial || '').toLowerCase();
    const valB = (b.serial || '').toLowerCase();
    if (state.sortOrder === 'asc') {
      return valA.localeCompare(valB);
    } else {
      return valB.localeCompare(valA);
    }
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No devices found.</td></tr>';
    return;
  }

  filtered.forEach(device => {
    const tr = document.createElement('tr');
    
    // We can make cells editable in the future, for now display them
    tr.innerHTML = `
      <td><strong>${device.serial || '-'}</strong></td>
      <td>${device.type || '-'}</td>
      <td>${device.set || '-'}</td>
      <td>${device.model || '-'}</td>
      <td>${device.calibrationDate || '-'}</td>
      <td><span style="background: var(--bg-color); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-color);">${device.currentLocation || '-'}</span></td>
      <td class="td-actions">
        <button class="btn-primary" onclick="editDevice('${device.id}')" title="Edit">
          Edit
        </button>
        <button class="btn-outline" onclick="showHistory('${device.id}')" title="Move & History">
          History
        </button>
        <button class="btn-danger" onclick="deleteDevice('${device.id}')" title="Delete">
          &times;
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// Global functions for inline event handlers
window.deleteDevice = deleteDevice;

window.editDevice = function(id) {
  const device = state.devices.find(d => d.id === id);
  if (!device) return;

  document.getElementById('edit-dev-id').value = id;
  document.getElementById('edit-dev-serial').value = device.serial || '';
  document.getElementById('edit-dev-type').value = device.type || '';
  document.getElementById('edit-dev-set').value = device.set || '';
  document.getElementById('edit-dev-model').value = device.model || '';
  document.getElementById('edit-dev-cal-date').value = device.calibrationDate || '';
  
  // ensure options are rendered
  renderLocationOptions();
  const locSelect = document.getElementById('edit-dev-location');
  if (device.currentLocation) {
    if (!state.locations.includes(device.currentLocation)) {
      state.locations.push(device.currentLocation);
      renderLocationOptions();
    }
    locSelect.value = device.currentLocation;
  } else {
    locSelect.value = "";
  }

  document.getElementById('modal-edit').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('modal-edit').classList.add('hidden');
}

async function handleEditDeviceSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-dev-id').value;
  const serial = document.getElementById('edit-dev-serial').value;
  const type = document.getElementById('edit-dev-type').value;
  const setBrand = document.getElementById('edit-dev-set').value;
  const model = document.getElementById('edit-dev-model').value;
  const calDate = document.getElementById('edit-dev-cal-date').value;
  const location = document.getElementById('edit-dev-location').value;

  if (id && db) {
    try {
      await updateDoc(doc(db, 'devices', id), {
        serial: serial,
        type: type,
        set: setBrand,
        model: model,
        calibrationDate: calDate,
        currentLocation: location
      });
      closeEditModal();
    } catch(err) {
      console.error(err);
      alert('Failed to update device.');
    }
  }
}

window.showHistory = function(id) {
  const device = state.devices.find(d => d.id === id);
  if (!device) return;

  // Set up modal context
  document.getElementById('modal-device-id').value = id;
  document.getElementById('modal-device-name').textContent = `History: S/N ${device.serial}`;
  
  // Populate the "Move To" dropdown in modal with current locations
  const modalSelect = document.getElementById('modal-move-to');
  modalSelect.innerHTML = '<option value="">Select New Location</option>';
  const uniqueLocs = [...new Set(state.locations)].sort();
  uniqueLocs.forEach(loc => {
    modalSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
  });

  // Render History List
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';

  if (device.moveHistory && device.moveHistory.length > 0) {
    // Reverse to show newest on top usually, or just iterate
    const sortedHistory = [...device.moveHistory].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    sortedHistory.forEach(move => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `<strong>${move.date}</strong>: Moved from <em>${move.locationFrom}</em> &rarr; <strong>${move.locationTo}</strong>`;
      historyList.appendChild(li);
    });
  } else {
    historyList.innerHTML = '<li class="history-item">No history found.</li>';
  }

  document.getElementById('modal-history').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-history').classList.add('hidden');
}

function populateColumnFilters(pageDevices) {
  const filters = [
    { id: 'ms-serial', key: 'serial', stateKey: 'serial' },
    { id: 'ms-type', key: 'type', stateKey: 'type' },
    { id: 'ms-set', key: 'set', stateKey: 'set' },
    { id: 'ms-model', key: 'model', stateKey: 'model' },
    { id: 'ms-cal-date', key: 'calibrationDate', stateKey: 'calDate' },
    { id: 'ms-location', key: 'currentLocation', stateKey: 'location' }
  ];

  filters.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    const optionsCont = el.querySelector('.ms-options');
    const titleEl = el.querySelector('.ms-title');
    
    const uniqueVals = [...new Set(pageDevices.map(d => d[f.key] || ''))].filter(Boolean).sort();
    
    // Check if current selected filters are still in the unique values
    state.columnFilters[f.stateKey] = state.columnFilters[f.stateKey].filter(val => uniqueVals.includes(val));

    optionsCont.innerHTML = '';
    
    uniqueVals.forEach(val => {
      const isChecked = state.columnFilters[f.stateKey].includes(val);
      
      const label = document.createElement('label');
      label.className = 'ms-option-item';
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = val;
      cb.checked = isChecked;
      
      cb.addEventListener('change', (e) => {
        if (e.target.checked) {
           if (!state.columnFilters[f.stateKey].includes(val)) {
             state.columnFilters[f.stateKey].push(val);
           }
        } else {
           state.columnFilters[f.stateKey] = state.columnFilters[f.stateKey].filter(v => v !== val);
        }
        renderDevices();
      });

      label.appendChild(cb);
      label.appendChild(document.createTextNode(val));
      
      label.addEventListener('click', (e) => e.stopPropagation());
      
      optionsCont.appendChild(label);
    });

    if (state.columnFilters[f.stateKey].length === 0) {
      titleEl.textContent = 'All';
    } else if (state.columnFilters[f.stateKey].length === 1) {
      titleEl.textContent = state.columnFilters[f.stateKey][0];
    } else {
      titleEl.textContent = `${state.columnFilters[f.stateKey].length} selected`;
    }
  });
}

function exportToExcel() {
  let pageDevices = state.devices.filter(d => {
    const devType = (d.type || '').toLowerCase();
    if (state.pageName === 'Total' && !(devType.includes('total') || devType.includes('توتال'))) return false;
    if (state.pageName === 'Level' && !(devType.includes('level') || devType.includes('ميزان') || devType.includes('ليفل'))) return false;
    return true;
  });

  let filtered = pageDevices.filter(d => {
    if (state.columnFilters.serial.length > 0 && !state.columnFilters.serial.includes(d.serial || '')) return false;
    if (state.columnFilters.type.length > 0 && !state.columnFilters.type.includes(d.type || '')) return false;
    if (state.columnFilters.set.length > 0 && !state.columnFilters.set.includes(d.set || '')) return false;
    if (state.columnFilters.model.length > 0 && !state.columnFilters.model.includes(d.model || '')) return false;
    if (state.columnFilters.calDate.length > 0 && !state.columnFilters.calDate.includes(d.calibrationDate || '')) return false;
    if (state.columnFilters.location.length > 0 && !state.columnFilters.location.includes(d.currentLocation || '')) return false;

    const term = state.searchTerm.toLowerCase();
    const searchString = `${d.serial} ${d.type} ${d.model} ${d.currentLocation}`.toLowerCase();
    return searchString.includes(term);
  });

  filtered.sort((a, b) => {
    const valA = (a.serial || '').toLowerCase();
    const valB = (b.serial || '').toLowerCase();
    return state.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const exportData = filtered.map(d => ({
    "Serial Number": d.serial || '-',
    "Type": d.type || '-',
    "Set / Brand": d.set || '-',
    "Model": d.model || '-',
    "Latest Calibration": d.calibrationDate || '-',
    "Current Location": d.currentLocation || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Devices");
  XLSX.writeFile(workbook, `${state.pageName}_Devices.xlsx`);
}