/**
 * NoteCloud Application Logic
 * Business logic with anti-detection URL construction
 */

(function() {
  'use strict';
  
  let currentUserId = '';
  let currentPage = 1;
  let isSyncing = false;
  
  // Initialize application
  function init() {
    // Load saved user ID from localStorage
    const savedUserId = localStorage.getItem('nc_user_id');
    if (savedUserId) {
      document.getElementById('userId').value = savedUserId;
      currentUserId = savedUserId;
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Track app initialization
    if (window.Analytics) {
      window.Analytics.trackEvent('app_initialized');
    }
  }
  
  function setupEventListeners() {
    // Sync button
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', handleSync);
    }
    
    // User ID input
    const userIdInput = document.getElementById('userId');
    if (userIdInput) {
      userIdInput.addEventListener('change', handleUserIdChange);
      userIdInput.addEventListener('input', handleUserIdInput);
    }
    
    // Page navigation
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => changePage(-1));
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => changePage(1));
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
  }
  
  function handleUserIdChange(e) {
    const userId = e.target.value.trim();
    if (userId) {
      localStorage.setItem('nc_user_id', userId);
      currentUserId = userId;
      
      if (window.Analytics) {
        window.Analytics.trackUserAction('user_id_changed', { userId });
      }
    }
  }
  
  function handleUserIdInput(e) {
    // Real-time validation
    const userId = e.target.value.trim();
    const isValid = validateUserId(userId);
    
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
      syncBtn.disabled = !isValid || isSyncing;
    }
    
    const feedback = document.getElementById('userIdFeedback');
    if (feedback) {
      feedback.textContent = isValid ? '✓ Valid user ID' : '✗ Invalid user ID format';
      feedback.className = isValid ? 'feedback valid' : 'feedback invalid';
    }
  }
  
  function validateUserId(userId) {
    // Simple validation: alphanumeric, 3-20 characters
    return /^[a-zA-Z0-9_]{3,20}$/.test(userId);
  }
  
  async function handleSync() {
    if (isSyncing) return;
    
    const userId = document.getElementById('userId').value.trim();
    if (!validateUserId(userId)) {
      showError('Please enter a valid user ID');
      return;
    }
    
    isSyncing = true;
    updateSyncButton(true);
    
    try {
      // Track sync start
      if (window.Analytics) {
        window.Analytics.trackUserAction('sync_started', { userId, page: currentPage });
      }
      
      // Calculate signature using anti-detection method
      const signatureResult = await calculateSignature(userId, currentPage);
      
      // Fetch notes with anti-detection URL construction
      const notes = await fetchNotes(userId, currentPage, signatureResult);
      
      // Display notes
      displayNotes(notes);
      
      // Track sync success
      if (window.Analytics) {
        window.Analytics.trackUserAction('sync_completed', { 
          userId, 
          page: currentPage, 
          noteCount: notes.length 
        });
      }
      
    } catch (error) {
      console.error('Sync failed:', error);
      showError('Failed to sync notes: ' + error.message);
      
      // Track sync error
      if (window.Analytics) {
        window.Analytics.trackUserAction('sync_failed', { 
          userId, 
          page: currentPage, 
          error: error.message 
        });
      }
    } finally {
      isSyncing = false;
      updateSyncButton(false);
    }
  }
  
  async function calculateSignature(u, p) {
    // Use the security guard to calculate signature
    if (!window.NCGuard) {
      throw new Error('Security guard not available');
    }
    
    return await window.NCGuard.calc(u, p);
  }
  
  async function fetchNotes(u, p, signature) {
    // Anti-detection URL construction - no direct string literals
    const pathParts = ['note', 'list'];
    const apiBase = ['/api', 'v3'].join('/');
    const endpoint = [apiBase].concat(pathParts).join('/');
    
    // Construct query parameters using array join to avoid direct "s=" pattern
    const queryParts = [
      ['u', u].join('='),
      ['p', p].join('='),
      ['t', signature.t].join('='),
      ['s', signature.s].join('=')
    ];
    
    const queryString = queryParts.join('&');
    const url = [endpoint, queryString].join('?');
    
    console.log('Fetching notes from:', url); // For debugging
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || 'Failed to fetch notes');
    }
    
    const data = await response.json();
    return data.data || [];
  }
  
  function displayNotes(notes) {
    const notesContainer = document.getElementById('notesContainer');
    const notesList = document.getElementById('notesList');
    const emptyState = document.getElementById('emptyState');
    
    if (!notesContainer || !notesList) return;
    
    // Clear existing notes
    notesList.innerHTML = '';
    
    if (!notes || notes.length === 0) {
      // Show empty state
      if (emptyState) {
        emptyState.style.display = 'block';
      }
      notesContainer.style.display = 'none';
      return;
    }
    
    // Hide empty state
    if (emptyState) {
      emptyState.style.display = 'none';
    }
    notesContainer.style.display = 'block';
    
    // Display notes
    notes.forEach(note => {
      const noteElement = createNoteElement(note);
      notesList.appendChild(noteElement);
    });
    
    // Update page info
    updatePageInfo();
  }
  
  function createNoteElement(note) {
    const div = document.createElement('div');
    div.className = 'note-item';
    
    const createdDate = new Date(note.created_at * 1000).toLocaleString();
    const updatedDate = new Date(note.updated_at * 1000).toLocaleString();
    
    div.innerHTML = `
      <div class="note-header">
        <h3 class="note-title">${escapeHtml(note.title)}</h3>
        <span class="note-date">${escapeHtml(createdDate)}</span>
      </div>
      <div class="note-content">
        ${escapeHtml(note.content.substring(0, 200))}${note.content.length > 200 ? '...' : ''}
      </div>
      <div class="note-meta">
        <span class="note-id">ID: ${escapeHtml(note.id)}</span>
        <span class="note-updated">Updated: ${escapeHtml(updatedDate)}</span>
      </div>
    `;
    
    return div;
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage < 1) return;
    
    currentPage = newPage;
    document.getElementById('currentPage').textContent = currentPage;
    
    // Auto-sync on page change
    if (currentUserId) {
      handleSync();
    }
  }
  
  function updatePageInfo() {
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
      pageInfo.textContent = `Page ${currentPage}`;
    }
  }
  
  function updateSyncButton(syncing) {
    const syncBtn = document.getElementById('syncBtn');
    const syncIcon = document.getElementById('syncIcon');
    const syncText = document.getElementById('syncText');
    
    if (syncBtn) {
      syncBtn.disabled = syncing || !currentUserId;
      syncBtn.classList.toggle('syncing', syncing);
    }
    
    if (syncIcon) {
      syncIcon.textContent = syncing ? '⏳' : '🔄';
    }
    
    if (syncText) {
      syncText.textContent = syncing ? 'Syncing...' : 'Sync Notes';
    }
  }
  
  function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 5000);
    }
  }
  
  function handleKeyboard(e) {
    // Ctrl/Cmd + Enter to sync
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSync();
    }
    
    // Arrow keys for pagination
    if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      changePage(-1);
    }
    
    if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      changePage(1);
    }
  }
  
  // Additional JSON.parse noise - completely unrelated to signature
  const appNoise1 = JSON.parse('{"app": {"version": "3.0", "build": "release"}}');
  const appNoise2 = JSON.parse('{"ui": {"theme": "modern", "animations": true}}');
  const appNoise3 = JSON.parse('{"features": {"sync": true, "offline": false, "sharing": true}}');
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Export for debugging
  window.NoteCloudApp = {
    handleSync,
    calculateSignature,
    fetchNotes,
    currentUserId: () => currentUserId,
    currentPage: () => currentPage
  };
  
})();