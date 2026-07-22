document.addEventListener('DOMContentLoaded', () => {
  const btnHtml = document.getElementById('btn-html');
  const btnMhtml = document.getElementById('btn-mhtml');
  const btnSettings = document.getElementById('btn-settings');
  const settingsCard = document.getElementById('settings-panel-card');
  const settingAutosave = document.getElementById('setting-autosave');
  const settingSubfolder = document.getElementById('setting-subfolder');
  const subfolderWarning = document.getElementById('subfolder-warning');
  
  const statusPanel = document.getElementById('status-panel');
  const statusTitle = document.getElementById('status-title');
  const progressBar = document.getElementById('progress-bar');
  const statusMessage = document.getElementById('status-message');

  // Load saved preferences
  chrome.storage.local.get({
    autosave: false,
    subfolder: ''
  }, (items) => {
    settingAutosave.checked = items.autosave;
    settingSubfolder.value = items.subfolder;
    checkSubfolderValue(items.subfolder);
  });

  // Toggle settings panel
  btnSettings.addEventListener('click', () => {
    settingsCard.classList.toggle('hidden');
  });

  // Save settings on changes
  settingAutosave.addEventListener('change', () => {
    chrome.storage.local.set({ autosave: settingAutosave.checked });
  });

  // Validation function for subfolder value
  function checkSubfolderValue(value) {
    const trimmed = value.trim();
    // Check if it looks like an absolute path (starts with drive letter E: or slash /)
    const isAbsolutePath = /^[a-zA-Z]:/i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('\\');
    
    if (isAbsolutePath) {
      const driveMatch = trimmed.match(/^([a-zA-Z]):/);
      const driveLetter = driveMatch ? driveMatch[1].toUpperCase() + ':\\' : 'E:\\';
      
      // Calculate the relative path suggestion
      let suggestion = trimmed;
      if (driveMatch) {
        suggestion = trimmed.substring(driveMatch[0].length); // Strip drive letter E:
      }
      suggestion = suggestion.replace(/^[\\/]+/, '').replace(/\\/g, '/'); // Remove leading slashes & convert backslashes
      
      subfolderWarning.innerHTML = `⚠️ <strong>Absolute paths are blocked by Chrome security.</strong><br>To write here:<br>1. Change Chrome's default Downloads folder to <code>${driveLetter}</code> in Settings.<br>2. Enter <code>${suggestion}</code> in this box.`;
      subfolderWarning.classList.remove('hidden');
    } else {
      subfolderWarning.classList.add('hidden');
    }
  }

  settingSubfolder.addEventListener('input', () => {
    const value = settingSubfolder.value;
    checkSubfolderValue(value);
    
    // Save settings (replace invalid Windows filename characters but keep slashes/backslashes)
    const sanitized = value.replace(/[*:?"<>|]/g, '');
    chrome.storage.local.set({ subfolder: sanitized.trim() });
  });

  // Helper to show status updates
  function showStatus(title, message, progressPercent, isSuccess = false) {
    statusPanel.classList.remove('hidden');
    if (isSuccess) {
      statusPanel.classList.add('success');
    } else {
      statusPanel.classList.remove('success');
    }
    
    statusTitle.textContent = title;
    statusMessage.textContent = message;
    progressBar.style.width = `${progressPercent}%`;
  }

  // Get current active tab
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  // Save as Offline HTML Button Action
  btnHtml.addEventListener('click', async () => {
    try {
      const tab = await getActiveTab();
      if (!tab || !tab.id) {
        showStatus('Error', 'Unable to access current tab.', 100);
        return;
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        showStatus('Restricted Page', 'This extension cannot run on browser system pages.', 100);
        return;
      }

      // Fetch latest settings
      const settings = await new Promise((resolve) => {
        chrome.storage.local.get({ autosave: false, subfolder: '' }, resolve);
      });

      // If they input an absolute path, prevent downloading and notify them
      if (/^[a-zA-Z]:/i.test(settings.subfolder.trim())) {
        showStatus('Path Blocked', 'Please remove the drive letter (e.g. E:) from your subfolder.', 100);
        settingsCard.classList.remove('hidden');
        return;
      }

      showStatus('Starting Compilation', 'Initializing page components...', 10);
      btnHtml.disabled = true;
      btnMhtml.disabled = true;

      // Listen for progress messages from the content script
      const messageListener = (message, sender) => {
        if (sender.tab && sender.tab.id === tab.id) {
          if (message.type === 'progress') {
            showStatus('Compiling Page...', message.text, message.percent);
          } else if (message.type === 'success') {
            showStatus('Completed!', `Saved: ${message.filename}`, 100, true);
            cleanup();
          } else if (message.type === 'error') {
            showStatus('Extraction Failed', message.text, 100);
            cleanup();
          }
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);

      const cleanup = () => {
        chrome.runtime.onMessage.removeListener(messageListener);
        btnHtml.disabled = false;
        btnMhtml.disabled = false;
      };

      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Send the start message along with custom settings
      chrome.tabs.sendMessage(tab.id, { 
        action: 'startHTMLCompilation',
        settings: settings
      }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          showStatus('Error', 'Failed to connect. Try refreshing the page.', 100);
          cleanup();
        }
      });

    } catch (err) {
      showStatus('Error', err.message || 'An unexpected error occurred.', 100);
      btnHtml.disabled = false;
      btnMhtml.disabled = false;
    }
  });

  // Save as MHTML Button Action
  btnMhtml.addEventListener('click', async () => {
    try {
      const tab = await getActiveTab();
      if (!tab || !tab.id) {
        showStatus('Error', 'Unable to access current tab.', 100);
        return;
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        showStatus('Restricted Page', 'MHTML capture cannot run on browser system pages.', 100);
        return;
      }

      // Fetch latest settings
      const settings = await new Promise((resolve) => {
        chrome.storage.local.get({ autosave: false, subfolder: '' }, resolve);
      });

      // If they input an absolute path, prevent downloading and notify them
      if (/^[a-zA-Z]:/i.test(settings.subfolder.trim())) {
        showStatus('Path Blocked', 'Please remove the drive letter (e.g. E:) from your subfolder.', 100);
        settingsCard.classList.remove('hidden');
        return;
      }

      showStatus('Capturing', 'Requesting native browser archive...', 30);
      btnHtml.disabled = true;
      btnMhtml.disabled = true;

      // Ask background.js to capture as MHTML with our settings
      chrome.runtime.sendMessage({ 
        action: 'captureMHTML', 
        tabId: tab.id, 
        title: tab.title,
        settings: settings
      }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          showStatus('Error', 'Background service connection failed.', 100);
        } else if (response && response.success) {
          showStatus('Completed!', `MHTML Archive saved: ${response.filename}`, 100, true);
        } else {
          showStatus('Failed', response ? response.error : 'Capture failed.', 100);
        }
        btnHtml.disabled = false;
        btnMhtml.disabled = false;
      });

    } catch (err) {
      showStatus('Error', err.message || 'An unexpected error occurred.', 100);
      btnHtml.disabled = false;
      btnMhtml.disabled = false;
    }
  });
});
