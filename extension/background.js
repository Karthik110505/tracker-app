// Background Service Worker for GATE Offline Saver

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Action 1: Capture MHTML
  if (message.action === 'captureMHTML') {
    chrome.pageCapture.saveAsMHTML({ tabId: message.tabId }, (blob) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      // Convert blob to Data URL to download it from Service Worker
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const cleanTitle = (message.title || 'GATE_Exam_Result')
          .replace(/[^a-z0-9_\-\s]/gi, '_')
          .replace(/\s+/g, '_')
          .trim();
        
        let filename = `${cleanTitle}.mhtml`;
        
        // Apply settings
        const settings = message.settings || {};
        if (settings.subfolder) {
          filename = `${settings.subfolder}/${filename}`;
        }
        
        const saveAs = !settings.autosave;

        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: saveAs
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, filename: filename });
          }
        });
      };
      
      reader.onerror = () => {
        sendResponse({ success: false, error: 'Failed to read captured page blob.' });
      };
      
      reader.readAsDataURL(blob);
    });
    return true; // Keeps the message port open for asynchronous sendResponse
  }
  
  // Action 2: Download Compiled HTML (saves HTML bypass CORS/size restrictions)
  if (message.action === 'downloadHTML') {
    const settings = message.settings || {};
    let filename = message.filename;
    
    if (settings.subfolder) {
      filename = `${settings.subfolder}/${filename}`;
    }
    
    const saveAs = !settings.autosave;

    chrome.downloads.download({
      url: message.dataUrl,
      filename: filename,
      saveAs: saveAs
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, filename: filename });
      }
    });
    return true;
  }
  
  // Action 3: Fetch Text (Used for fetching stylesheets cross-origin without CORS)
  if (message.action === 'fetchText') {
    fetch(message.url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP status ${response.status}`);
        return response.text();
      })
      .then(text => {
        sendResponse({ success: true, data: text });
      })
      .catch(err => {
        console.error(`Failed to fetch text from ${message.url}:`, err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
  
  // Action 4: Fetch Blob as Base64 (Used for images and fonts cross-origin)
  if (message.action === 'fetchBlob') {
    fetch(message.url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP status ${response.status}`);
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ success: true, data: reader.result });
        };
        reader.onerror = () => {
          sendResponse({ success: false, error: 'Failed to read fetched resource blob.' });
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => {
        console.error(`Failed to fetch blob from ${message.url}:`, err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});
