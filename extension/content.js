// Content Script for GATE Offline Saver
// Runs in the page context, dynamically injected

if (typeof window.gateOfflineSaverInjected === 'undefined') {
  window.gateOfflineSaverInjected = true;

  // Global settings holder for the active task
  let currentSettings = { autosave: false, subfolder: '' };

  // Listen for messages from the extension popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startHTMLCompilation') {
      currentSettings = message.settings || { autosave: false, subfolder: '' };
      runHTMLCompilation();
    }
  });

  // Main compilation process
  async function runHTMLCompilation() {
    try {
      const baseUri = document.baseURI;
      const originalTitle = document.title || 'GATE_Exam_Page';
      
      // Step 1: Clone DOM
      updateProgress(10, 'Cloning page structure...');
      const clone = document.documentElement.cloneNode(true);

      // Step 2: Preserve input values (e.g. checkboxes, text fields)
      updateProgress(15, 'Preserving user input values...');
      preserveInputValues(document, clone);

      // Step 3: Convert Canvas elements to static images
      updateProgress(20, 'Converting active charts and canvas drawings...');
      convertCanvases(document, clone);

      // Step 4: Process and inline stylesheets (external and inline style tags)
      updateProgress(25, 'Inlining stylesheets and fonts...');
      await processStylesheets(clone, baseUri);

      // Step 5: Process and inline images
      updateProgress(65, 'Inlining images...');
      await processImages(clone, baseUri);

      // Step 6: Clean up the DOM clone
      updateProgress(90, 'Removing scripts and cleaning interactive links...');
      cleanDOM(clone);

      // Step 7: Create HTML Blob and trigger download
      updateProgress(95, 'Compiling final offline document...');
      ensureMetaCharset(clone);

      const htmlContent = '<!DOCTYPE html>\n' + clone.outerHTML;
      const cleanTitle = originalTitle
        .replace(/[^a-z0-9_\-\s]/gi, '_')
        .replace(/\s+/g, '_')
        .trim();
      const filename = `${cleanTitle}_Offline.html`;

      // Trigger download using the background downloader to honor autosave settings
      await triggerDownload(htmlContent, filename);

    } catch (error) {
      console.error('Offline Saver compilation error:', error);
      chrome.runtime.sendMessage({ type: 'error', text: error.message || 'Unknown compilation error' }, () => {
        const err = chrome.runtime.lastError;
      });
    }
  }

  // Helper to send progress updates to popup
  function updateProgress(percent, text) {
    chrome.runtime.sendMessage({ type: 'progress', percent: percent, text: text }, () => {
      // Suppress errors if popup is closed
      const err = chrome.runtime.lastError;
    });
  }

  // Preserve form values in clone
  function preserveInputValues(original, clone) {
    const originalInputs = original.querySelectorAll('input, textarea, select');
    const cloneInputs = clone.querySelectorAll('input, textarea, select');
    
    for (let i = 0; i < originalInputs.length; i++) {
      const orig = originalInputs[i];
      const cln = cloneInputs[i];
      if (!cln) continue;
      
      if (orig.tagName === 'INPUT') {
        if (orig.type === 'checkbox' || orig.type === 'radio') {
          if (orig.checked) {
            cln.setAttribute('checked', 'checked');
          } else {
            cln.removeAttribute('checked');
          }
        } else {
          cln.setAttribute('value', orig.value);
        }
      } else if (orig.tagName === 'TEXTAREA') {
        cln.textContent = orig.value;
      } else if (orig.tagName === 'SELECT') {
        const origOptions = orig.querySelectorAll('option');
        const clnOptions = cln.querySelectorAll('option');
        for (let j = 0; j < origOptions.length; j++) {
          if (origOptions[j].selected) {
            clnOptions[j].setAttribute('selected', 'selected');
          } else {
            clnOptions[j].removeAttribute('selected');
          }
        }
      }
    }
  }

  // Convert canvases to base64 images
  function convertCanvases(original, clone) {
    const originalCanvases = original.querySelectorAll('canvas');
    const cloneCanvases = clone.querySelectorAll('canvas');
    
    for (let i = 0; i < originalCanvases.length; i++) {
      const orig = originalCanvases[i];
      const cln = cloneCanvases[i];
      if (!cln) continue;
      
      try {
        const dataUrl = orig.toDataURL('image/png');
        const img = document.createElement('img');
        
        // Copy all styling and classes
        for (const attr of cln.attributes) {
          img.setAttribute(attr.name, attr.value);
        }
        img.src = dataUrl;
        cln.replaceWith(img);
      } catch (e) {
        console.warn('Failed to convert canvas to image:', e);
      }
    }
  }

  // Recursively process and inline all styles
  async function processStylesheets(clone, baseUri) {
    const linkStylesheets = Array.from(clone.querySelectorAll('link[rel="stylesheet"]'));
    const inlineStylesheets = Array.from(clone.querySelectorAll('style'));
    
    const total = linkStylesheets.length + inlineStylesheets.length;
    let processed = 0;
    
    // Process external links
    for (const link of linkStylesheets) {
      processed++;
      const href = link.getAttribute('href');
      if (!href) continue;
      
      const absoluteHref = new URL(href, baseUri).href;
      updateProgress(25 + Math.round((processed / total) * 35), `Inlining CSS stylesheet ${processed}/${total}...`);
      
      try {
        const cssContent = await fetchTextFromBackground(absoluteHref);
        if (cssContent) {
          const compiledCss = await inlineCssUrls(cssContent, absoluteHref);
          
          const style = document.createElement('style');
          style.textContent = compiledCss;
          
          if (link.getAttribute('media')) style.setAttribute('media', link.getAttribute('media'));
          link.replaceWith(style);
        } else {
          link.setAttribute('href', absoluteHref);
        }
      } catch (e) {
        console.warn(`Failed to process stylesheet: ${absoluteHref}`, e);
        link.setAttribute('href', absoluteHref);
      }
    }
    
    // Process existing style blocks
    for (const style of inlineStylesheets) {
      processed++;
      updateProgress(25 + Math.round((processed / total) * 35), `Processing inline style block ${processed}/${total}...`);
      
      try {
        const compiledCss = await inlineCssUrls(style.textContent, baseUri);
        style.textContent = compiledCss;
      } catch (e) {
        console.warn('Failed to process inline style element:', e);
      }
    }
  }

  // Find and replace url(...) references inside CSS
  async function inlineCssUrls(cssText, cssBaseUrl) {
    const matches = [...cssText.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)];
    if (matches.length === 0) return cssText;
    
    let compiledCss = cssText;
    const replacements = {};
    
    for (const match of matches) {
      const rawUrl = match[1];
      
      if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('//:')) {
        continue;
      }
      
      try {
        const absoluteUrl = new URL(rawUrl, cssBaseUrl).href;
        if (!replacements[rawUrl]) {
          const dataUrl = await fetchBlobFromBackground(absoluteUrl);
          if (dataUrl) {
            replacements[rawUrl] = dataUrl;
          } else {
            replacements[rawUrl] = absoluteUrl;
          }
        }
      } catch (e) {
        console.warn('Failed to resolve URL inside CSS:', rawUrl, e);
      }
    }
    
    for (const [rawUrl, resolvedUrl] of Object.entries(replacements)) {
      compiledCss = compiledCss.split(rawUrl).join(resolvedUrl);
    }
    
    return compiledCss;
  }

  // Fetch and convert image elements to Base64 in parallel batches
  async function processImages(clone, baseUri) {
    const images = Array.from(clone.querySelectorAll('img'));
    const total = images.length;
    if (total === 0) return;
    
    let completed = 0;
    const batchSize = 10;
    
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (img) => {
        const src = img.getAttribute('src');
        if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
          completed++;
          return;
        }
        
        const absoluteSrc = new URL(src, baseUri).href;
        try {
          const dataUrl = await fetchBlobFromBackground(absoluteSrc);
          if (dataUrl) {
            img.setAttribute('src', dataUrl);
            img.removeAttribute('srcset');
          } else {
            img.setAttribute('src', absoluteSrc);
          }
        } catch (e) {
          console.warn(`Failed to inline image ${absoluteSrc}:`, e);
          img.setAttribute('src', absoluteSrc);
        }
        
        completed++;
        const percent = 65 + Math.round((completed / total) * 25);
        updateProgress(percent, `Inlining image ${completed}/${total}...`);
      }));
    }
  }

  // Strip scripts, noscripts, and inline event handlers to prevent dynamic execution offline
  function cleanDOM(clone) {
    const scripts = clone.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    
    const noscripts = clone.querySelectorAll('noscript');
    noscripts.forEach(n => n.remove());
    
    const allElements = clone.querySelectorAll('*');
    for (const el of allElements) {
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      }
      if (el.tagName === 'A') {
        const href = el.getAttribute('href');
        if (href && href.startsWith('javascript:')) {
          el.setAttribute('href', '#');
        }
      }
    }
  }

  // Ensure utf-8 encoding meta tag is present
  function ensureMetaCharset(clone) {
    const head = clone.querySelector('head');
    if (!head) return;
    
    const metaCharset = head.querySelector('meta[charset]');
    if (!metaCharset) {
      const meta = document.createElement('meta');
      meta.setAttribute('charset', 'utf-8');
      head.insertBefore(meta, head.firstChild);
    }
  }

  // Trigger browser download via background.js to utilize extension download API and user preferences
  function triggerDownload(content, filename) {
    return new Promise((resolve, reject) => {
      try {
        // Convert unicode HTML string to Base64 safely
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        const dataUrl = 'data:text/html;charset=utf-8;base64,' + base64Content;
        
        chrome.runtime.sendMessage({
          action: 'downloadHTML',
          dataUrl: dataUrl,
          filename: filename,
          settings: currentSettings
        }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            const errMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : (response ? response.error : 'Download failed');
            chrome.runtime.sendMessage({ type: 'error', text: `Download failed: ${errMsg}` }, () => {
              const err = chrome.runtime.lastError;
            });
            reject(new Error(errMsg));
          } else {
            chrome.runtime.sendMessage({ type: 'success', filename: response.filename }, () => {
              const err = chrome.runtime.lastError;
            });
            resolve();
          }
        });
      } catch (e) {
        chrome.runtime.sendMessage({ type: 'error', text: `Encoding failed: ${e.message}` }, () => {
          const err = chrome.runtime.lastError;
        });
        reject(e);
      }
    });
  }

  // Bridge functions to background.js
  function fetchTextFromBackground(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'fetchText', url: url }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          resolve(null);
        } else {
          resolve(response.data);
        }
      });
    });
  }

  function fetchBlobFromBackground(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'fetchBlob', url: url }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          resolve(null);
        } else {
          resolve(response.data);
        }
      });
    });
  }
}
