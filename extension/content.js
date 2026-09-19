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
    } else if (message.action === 'extractNPTELResults') {
      currentSettings = message.settings || { autosave: false, subfolder: '' };
      runNptelExtraction();
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

      // Step 4.5: Process and inline inline style attributes
      updateProgress(60, 'Inlining background images and style attributes...');
      await processInlineStyles(clone, baseUri);

      // Step 5: Process and inline images
      updateProgress(65, 'Inlining images...');
      await processImages(clone, baseUri);

      // Step 5.5: Fix absolute SVG use references for MathJax/KaTeX compatibility
      resolveSvgUseTags(clone);

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
    
    // Process external links in parallel
    await Promise.all(linkStylesheets.map(async (link) => {
      const href = link.getAttribute('href');
      if (!href) {
        processed++;
        return;
      }
      
      const absoluteHref = new URL(href, baseUri).href;
      try {
        const cssContent = await fetchTextFromBackground(absoluteHref);
        processed++;
        updateProgress(25 + Math.round((processed / total) * 35), `Inlining CSS stylesheet ${processed}/${total}...`);
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
        processed++;
        updateProgress(25 + Math.round((processed / total) * 35), `Inlining CSS stylesheet ${processed}/${total}...`);
        console.warn(`Failed to process stylesheet: ${absoluteHref}`, e);
        link.setAttribute('href', absoluteHref);
      }
    }));
    
    // Process existing style blocks in parallel
    const originalInlineStylesheets = Array.from(document.querySelectorAll('style'));
    await Promise.all(inlineStylesheets.map(async (style, index) => {
      try {
        const originalStyle = originalInlineStylesheets[index];
        let originalText = '';
        if (originalStyle) {
          if (originalStyle.sheet) {
            try {
              originalText = Array.from(originalStyle.sheet.cssRules)
                .map(rule => rule.cssText)
                .join('\n');
            } catch (err) {
              console.warn('Failed to read cssRules (cross-origin sheet?):', err);
              originalText = originalStyle.textContent;
            }
          } else {
            originalText = originalStyle.textContent;
          }
        } else {
          originalText = style.textContent;
        }

        const compiledCss = await inlineCssUrls(originalText || '', baseUri);
        style.textContent = compiledCss;
      } catch (e) {
        console.warn('Failed to process inline style element:', e);
      }
      processed++;
      updateProgress(25 + Math.round((processed / total) * 35), `Processing inline style block ${processed}/${total}...`);
    }));
  }

  // Find and replace url(...) references inside CSS
  async function inlineCssUrls(cssText, cssBaseUrl) {
    const matches = [...cssText.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)];
    if (matches.length === 0) return cssText;
    
    let compiledCss = cssText;
    const replacements = {};
    
    // Deduplicate URLs to fetch
    const urlsToFetch = [];
    const urlMap = new Map();
    
    for (const match of matches) {
      const rawUrl = match[1];
      if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('//:') || rawUrl.startsWith('#')) {
        continue;
      }
      try {
        const absoluteUrl = new URL(rawUrl, cssBaseUrl).href;
        if (!urlMap.has(rawUrl)) {
          urlMap.set(rawUrl, absoluteUrl);
          urlsToFetch.push({ rawUrl, absoluteUrl });
        }
      } catch (e) {
        console.warn('Failed to resolve URL inside CSS:', rawUrl, e);
      }
    }
    
    // Fetch them all in parallel
    await Promise.all(urlsToFetch.map(async ({ rawUrl, absoluteUrl }) => {
      try {
        const dataUrl = await fetchBlobFromBackground(absoluteUrl);
        if (dataUrl) {
          replacements[rawUrl] = dataUrl;
        } else {
          replacements[rawUrl] = absoluteUrl;
        }
      } catch (e) {
        console.warn('Failed to fetch resource inside CSS:', absoluteUrl, e);
        replacements[rawUrl] = absoluteUrl;
      }
    }));
    
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
    const concurrencyLimit = 15;
    let index = 0;
    
    const originalImages = Array.from(document.querySelectorAll('img'));
    const worker = async () => {
      while (index < images.length) {
        const currentIdx = index++;
        const img = images[currentIdx];
        const src = img.getAttribute('src');
        if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
          completed++;
          continue;
        }
        
        const absoluteSrc = new URL(src, baseUri).href;
        try {
          // Attempt to extract base64 from the already loaded image element in the DOM using canvas
          const originalImg = originalImages[currentIdx];
          let dataUrl = null;
          if (originalImg) {
            dataUrl = getBase64FromImageElement(originalImg);
          }
          
          // Fall back to background fetch if canvas extraction failed or is not available
          if (!dataUrl) {
            dataUrl = await fetchBlobFromBackground(absoluteSrc);
          }
          
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
      }
    };
    
    const workers = [];
    for (let i = 0; i < Math.min(concurrencyLimit, images.length); i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
  }

  // Get base64 of loaded image using a canvas element to bypass background fetching issues
  function getBase64FromImageElement(img) {
    if (!img.complete || !img.naturalWidth) {
      return null;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL();
    } catch (e) {
      console.warn('Canvas conversion failed for image, falling back to network fetch:', e);
      return null;
    }
  }

  // Find and process inline style attributes like style="background-image: url(...)"
  async function processInlineStyles(clone, baseUri) {
    const allElements = Array.from(clone.querySelectorAll('[style*="url("]'));
    await Promise.all(allElements.map(async (el) => {
      const styleAttr = el.getAttribute('style');
      if (styleAttr) {
        try {
          const compiledStyle = await inlineCssUrls(styleAttr, baseUri);
          el.setAttribute('style', compiledStyle);
        } catch (e) {
          console.warn('Failed to process inline style for element:', el, e);
        }
      }
    }));
  }

  // Resolve SVG <use> tags that point to absolute URLs, converting them back to local hashes
  function resolveSvgUseTags(clone) {
    const uses = clone.querySelectorAll('use');
    for (const use of uses) {
      const href = use.getAttribute('href');
      if (href && href.includes('#')) {
        const hash = href.substring(href.indexOf('#'));
        use.setAttribute('href', hash);
      }
      const xlinkHref = use.getAttribute('xlink:href');
      if (xlinkHref && xlinkHref.includes('#')) {
        const hash = xlinkHref.substring(xlinkHref.indexOf('#'));
        use.setAttribute('xlink:href', hash);
      }
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

  // --- NPTEL CRAWLER AND EXTRACTOR LOGIC ---

  async function runNptelExtraction() {
    try {
      updateProgress(5, 'Locating question navigation chips...');
      const chips = document.querySelectorAll('.chips .chip');
      if (chips.length === 0) {
        throw new Error('No question navigation chips found. Please ensure you are on the NPTEL test evaluation page.');
      }
      
      const totalQs = chips.length;
      updateProgress(10, `Found ${totalQs} questions. Starting crawl...`);
      
      const parsedQuestions = [];
      
      for (let i = 0; i < totalQs; i++) {
        const percent = 10 + Math.round((i / totalQs) * 70); // Crawling is 10% to 80%
        updateProgress(percent, `Crawling question ${i + 1} of ${totalQs}...`);
        
        // Click the chip to load this question
        chips[i].click();
        
        // Wait for the DOM to update to the new question
        const targetLabel = `Question ${i + 1} /`;
        await new Promise((resolve) => {
          const startTime = Date.now();
          const checkInterval = setInterval(() => {
            const currentLabel = document.querySelector('.question-label')?.textContent || '';
            if (currentLabel.includes(targetLabel)) {
              clearInterval(checkInterval);
              resolve();
            } else if (Date.now() - startTime > 2500) {
              // Timeout fallback: proceed anyway
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
        });
        
        // Extra small pause for Angular to render everything fully
        await new Promise(resolve => setTimeout(resolve, 80));
        
        // Parse the active question
        const qData = parseNptelQuestion(i);
        parsedQuestions.push(qData);
      }
      
      // Step 2: Compile parsed questions into HTML
      updateProgress(85, 'Formatting and packaging result document...');
      const compiledHtml = buildNptelOfflineHtml(parsedQuestions);
      
      // Step 3: Trigger download
      updateProgress(95, 'Saving results file...');
      
      let originalTitle = document.querySelector('.child-title')?.textContent.trim() || document.title || 'NPTEL_Mock_Test';
      if (!originalTitle.toLowerCase().includes('nptel') && originalTitle !== 'Courses :: NPTEL') {
        originalTitle = originalTitle + ' - NPTEL';
      }
      const cleanTitle = originalTitle
        .replace(/[^a-z0-9_\-\s]/gi, '_')
        .replace(/\s+/g, '_')
        .trim();
      const filename = `${cleanTitle}_NPTEL_Results.html`;
      
      await triggerDownload(compiledHtml, filename);
      
    } catch (error) {
      console.error('NPTEL Extraction error:', error);
      chrome.runtime.sendMessage({ type: 'error', text: error.message || 'Unknown crawl error' }, () => {
        const err = chrome.runtime.lastError;
      });
    }
  }

  function parseNptelQuestion(index) {
    const questionLabel = document.querySelector('.question-label')?.textContent || '';
    const questionMarksText = document.querySelector('.question-marks')?.textContent || '';
    const questionBody = document.querySelector('.backend-html')?.innerHTML || '';
    
    // Extract max marks for the question (e.g., "1 marks" -> 1, "2 marks" -> 2)
    const maxMarksMatch = questionMarksText.match(/(-?[\d\.]+)\s*marks/i);
    const maxMarks = maxMarksMatch ? parseFloat(maxMarksMatch[1]) : 1;
    
    // Find the status and score from the right panel
    const headerSpans = document.querySelectorAll('.right-panel .header span');
    let statusText = '';
    let scoreText = '';
    
    headerSpans.forEach(span => {
      const txt = span.textContent.trim();
      if (txt.includes('Answer is') || txt.includes('Correct') || txt.includes('Incorrect')) {
        statusText = txt;
      } else if (txt.includes('Score:')) {
        scoreText = txt;
      }
    });
    
    // Fallbacks if headerSpans didn't match
    if (!statusText) {
      statusText = document.querySelector('.right-panel .header .text')?.textContent || '';
    }
    if (!scoreText) {
      const allSpans = document.querySelectorAll('.right-panel .header *');
      for (const el of allSpans) {
        if (el.textContent.includes('Score:')) {
          scoreText = el.textContent;
          break;
        }
      }
    }
    
    let status = 'unattempted';
    if (statusText.includes('Partially Correct')) {
      status = 'incorrect';
    } else if (statusText.includes('Incorrect') || statusText.includes('Wrong')) {
      status = 'incorrect';
    } else if (statusText.includes('Correct')) {
      status = 'correct';
    }
    
    let qMaxMarks = maxMarks;
    const scoreMatch = scoreText.match(/Score\s*:\s*(-?[\d\.]+)\s*\/\s*([\d\.]+)/i);
    if (scoreMatch) {
      qMaxMarks = parseFloat(scoreMatch[2]);
    }
    
    // Options and selected answers
    const options = [];
    let yourAnswer = '';
    let correctAnswer = '';
    let questionType = 'Multiple Choice';
    
    const optionButtons = document.querySelectorAll('.choices-fieldset button');
    if (optionButtons.length > 0) {
      optionButtons.forEach(btn => {
        const letter = btn.querySelector('.choice-letter')?.textContent.replace('.', '').trim() || '';
        const choiceTextEl = btn.querySelector('.choice-text');
        let text = '';
        if (choiceTextEl) {
          const cloneEl = choiceTextEl.cloneNode(true);
          const badges = cloneEl.querySelectorAll('.reveal-badge');
          badges.forEach(b => b.remove());
          text = cloneEl.textContent.trim();
        } else {
          text = btn.textContent.trim();
        }
        
        const isChecked = btn.getAttribute('aria-checked') === 'true';
        const badgeText = btn.querySelector('.reveal-badge')?.textContent || '';
        const isCorrect = badgeText.includes('Correct') || badgeText.includes('Expected');
        
        options.push({ letter, text, isChecked, isCorrect });
        
        if (isChecked) {
          yourAnswer = letter;
        }
        if (isCorrect) {
          correctAnswer = letter;
        }
      });
      
      const checkedButtons = Array.from(optionButtons).filter(btn => btn.getAttribute('aria-checked') === 'true');
      const correctButtons = Array.from(optionButtons).filter(btn => {
        const badgeText = btn.querySelector('.reveal-badge')?.textContent || '';
        return badgeText.includes('Correct') || badgeText.includes('Expected');
      });
      if (correctButtons.length > 1) {
        questionType = 'Multiple Select';
        correctAnswer = correctButtons.map(btn => btn.querySelector('.choice-letter')?.textContent.replace('.', '').trim()).join(',');
        yourAnswer = checkedButtons.map(btn => btn.querySelector('.choice-letter')?.textContent.replace('.', '').trim()).join(',');
      }
    } else {
      questionType = 'Numerical';
      const textInput = document.querySelector('.choices-fieldset input[type="text"]');
      if (textInput) {
        yourAnswer = textInput.value.trim();
      }
      
      const rightPanelText = document.querySelector('.right-panel')?.textContent || '';
      const natMatch = rightPanelText.match(/(?:Correct Answer|Correct Range|Answer)\s*:\s*([^\n\r]+)/i);
      if (natMatch) {
        correctAnswer = natMatch[1].trim();
      }
    }
    
    // Calculate scoring based on GATE rules
    let scoreEarned = 0;
    let penalty = 0;
    
    if (status === 'correct') {
      scoreEarned = qMaxMarks;
      penalty = 0;
    } else if (status === 'incorrect') {
      if (questionType === 'Multiple Choice') {
        penalty = parseFloat((qMaxMarks / 3).toFixed(2));
        scoreEarned = -penalty;
      } else {
        // MSQ or NAT gets 0 marks and 0 penalty for incorrect
        penalty = 0;
        scoreEarned = 0;
      }
    } else {
      scoreEarned = 0;
      penalty = 0;
    }
    
    return {
      num: `Q#${index + 1}`,
      label: questionLabel.trim() || `Question ${index + 1}`,
      maxMarks: qMaxMarks,
      score: scoreEarned,
      penalty: penalty,
      status: status,
      yourAnswer: yourAnswer || 'not answered',
      correctAnswer: correctAnswer || 'N/A',
      type: questionType,
      options: options,
      body: questionBody
    };
  }

  function buildNptelOfflineHtml(questions) {
    let totalQs = questions.length;
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let score = 0;
    let totalMarks = 0;
    
    questions.forEach(q => {
      totalMarks += q.maxMarks;
      score += q.score;
      if (q.status === 'correct') {
        correct++;
      } else if (q.status === 'incorrect') {
        incorrect++;
      } else {
        unattempted++;
      }
    });
    
    score = parseFloat(score.toFixed(2));
    const accuracy = (correct + incorrect) > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;
    
    const timeTakenEl = document.querySelector('.timer-container') || document.querySelector('.time-taken') || document.querySelector('.timer');
    const timeTaken = timeTakenEl ? timeTakenEl.textContent.trim() : '0.00 Min';
    let originalTitle = document.querySelector('.child-title')?.textContent.trim() || document.title || 'NPTEL Mock Test';
    if (!originalTitle.toLowerCase().includes('nptel') && originalTitle !== 'Courses :: NPTEL') {
      originalTitle = originalTitle + ' - NPTEL';
    }
    
    const questionsHtml = questions.map((q, idx) => {
      return `
      <div class="res_question" id="q_${idx + 1}">
        <div class="res_qs_meta">
          <b>Q#${idx + 1}</b> (Award: ${q.maxMarks}, Penalty: ${q.penalty}, ${q.type})
        </div>
        <div class="res_question_body">
          ${q.body}
          ${q.options.length > 0 ? `
          <div class="res_options">
            ${q.options.map(opt => `
              <div class="res_option ${opt.isChecked ? 'selected' : ''} ${opt.isCorrect ? 'correct' : ''}">
                <span class="res_option_letter">${opt.letter}.</span>
                <span class="res_option_text">${opt.text}</span>
                ${opt.isCorrect ? '<span class="correct-badge">Correct</span>' : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}
        </div>
        <div class="res_solution">
          <span>Your Answer: <strong>${q.yourAnswer}</strong></span>
          <span>Correct Answer: <strong>${q.correctAnswer}</strong></span>
          <span class="res_status res_status_${q.status}">${q.status === 'correct' ? 'Correct' : q.status === 'incorrect' ? 'Wrong' : 'Not Attempted'}</span>
        </div>
      </div>`;
    }).join('\n');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${originalTitle} - NPTEL Results</title>
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --primary-color: #3b82f6;
      --success-color: #10b981;
      --danger-color: #ef4444;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    body {
      font-family: var(--font-family);
      background: var(--bg-gradient);
      color: var(--text-primary);
      margin: 0;
      padding: 32px 16px;
      min-height: 100vh;
    }
    
    .exam-container {
      max-width: 900px;
      margin: 0 auto;
    }
    
    .exam-header {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 4px 30px rgba(0,0,0,0.25);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    
    .exam-title {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 16px 0;
      background: linear-gradient(to right, #ffffff, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 12px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .stat-card {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 14px 10px;
      text-align: center;
    }
    
    .stat-val {
      font-size: 22px;
      font-weight: 700;
    }
    
    .stat-val.score {
      color: var(--primary-color);
      text-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
    }
    
    .stat-val.correct {
      color: var(--success-color);
    }
    
    .stat-lbl {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .meta-footer {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-secondary);
      border-top: 1px solid rgba(255,255,255,0.04);
      padding-top: 12px;
      margin-top: 8px;
    }
    
    .res_question {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    
    .res_qs_meta {
      font-size: 13px;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
    }
    
    .res_qs_meta b {
      color: var(--primary-color);
      font-size: 14px;
    }
    
    .res_question_body {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 20px;
      color: #e2e8f0;
    }
    
    .res_options {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .res_option {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 13.5px;
      position: relative;
    }
    
    .res_option.selected {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(59, 130, 246, 0.05);
    }
    
    .res_option.correct {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.05);
    }
    
    .res_option.selected.correct {
      border-color: var(--success-color);
      background: rgba(16, 185, 129, 0.1);
    }
    
    .res_option_letter {
      font-weight: 700;
      margin-right: 10px;
      color: var(--primary-color);
    }
    
    .correct-badge {
      position: absolute;
      right: 16px;
      font-size: 10px;
      background: rgba(16, 185, 129, 0.2);
      color: var(--success-color);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .res_solution {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      padding: 12px 20px;
      font-size: 13px;
    }
    
    .res_status {
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    
    .res_status_correct {
      color: var(--success-color);
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    
    .res_status_incorrect {
      color: var(--danger-color);
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    .res_status_unattempted {
      color: var(--text-secondary);
      background: rgba(148, 163, 184, 0.1);
      border: 1px solid rgba(148, 163, 184, 0.15);
    }
    
    .backend-html img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <!-- Hidden element for tracker-app title parser -->
  <div class="exam_summary" style="display:none;"><h2>Exam Summary (${originalTitle})</h2></div>
  <div class="exam-container">
    <div class="exam-header">
      <h1 class="exam-title">${originalTitle}</h1>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-val score">${score} / ${totalMarks}</div><div class="stat-lbl">Resultant Marks</div></div>
        <div class="stat-card"><div class="stat-val correct">${correct}</div><div class="stat-lbl">Correct Attempts</div></div>
        <div class="stat-card"><div class="stat-val" style="color: var(--danger-color);">${incorrect}</div><div class="stat-lbl">Incorrect Attempts</div></div>
        <div class="stat-card"><div class="stat-val" style="color: var(--text-secondary);">${unattempted}</div><div class="stat-lbl">Not Attempted</div></div>
        <div class="stat-card"><div class="stat-val" style="color: #cbd5e1;">${accuracy}%</div><div class="stat-lbl">Accuracy</div></div>
      </div>
      <div class="meta-footer">
        <span>Exam Duration: 180 Min</span>
        <span>Time Taken: ${timeTaken}</span>
        <!-- Afternoon time window so detectSession automatically classifies it as afternoon -->
        <span style="display:none;">Session Time: 2:00 PM to 5:00 PM</span>
      </div>
    </div>
    
    <div class="questions-list">
      ${questionsHtml}
    </div>
  </div>
</body>
</html>`;
  }
}
