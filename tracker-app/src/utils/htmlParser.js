// HTML Parser utility to parse offline-compiled exam result files
// Extracts titles, marks, and other stats from Netlify offline HTML files

export function parseOfflineHtml(htmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // Extract title (e.g. "GATE CSE 2010 | Original Paper")
    let title = doc.title || 'Unknown Exam';
    title = title.replace('_Offline', '').replace(/_/g, ' ').trim();
    
    // Sometimes the title has the extension or trailing parts, let's clean it
    if (title.endsWith('.html')) {
      title = title.substring(0, title.length - 5);
    }
    
    // Helper to find leaf elements containing text and match them
    const extractVal = (label) => {
      // Find all elements in the document
      const elements = Array.from(doc.querySelectorAll('*'));
      
      for (const el of elements) {
        // Look for leaf elements that contain the label
        if (el.children.length === 0 && el.textContent.includes(label)) {
          const text = el.textContent.trim();
          
          // Case 1: Label and value are together in the text, e.g. "Qs. Attempted: 24 / 65"
          const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedLabel + '\\s*(.*)', 'i');
          const match = text.match(regex);
          if (match && match[1].trim()) {
            return match[1].trim();
          }
          
          // Case 2: Value is in the parent container's full text
          if (el.parentElement) {
            const parentText = el.parentElement.textContent.trim();
            const parentMatch = parentText.match(regex);
            if (parentMatch && parentMatch[1].trim()) {
              return parentMatch[1].trim();
            }
          }
          
          // Case 3: Value is in the next sibling element
          if (el.nextElementSibling) {
            return el.nextElementSibling.textContent.trim();
          }
        }
      }
      return '';
    };

    // Extract metrics raw strings
    const attemptedRaw = extractVal('Qs. Attempted:');
    const marksRaw = extractVal('Resultant Marks:');
    const durationRaw = extractVal('Exam Duration:');
    const correctRaw = extractVal('Correct Attempts:');
    const incorrectRaw = extractVal('Incorrect Attempts:');
    const notAttemptedRaw = extractVal('Not Attempted:');
    const timeTakenRaw = extractVal('Time Taken:');
    const accuracyRaw = extractVal('Accuracy:');
    const percentageRaw = extractVal('Percentage:');

    // Parse Attempted and Total Questions (e.g. "12 / 65")
    let attempted = 0;
    let totalQs = 65;
    if (attemptedRaw) {
      const parts = attemptedRaw.split('/');
      attempted = parseInt(parts[0]) || 0;
      totalQs = parseInt(parts[1]) || 65;
    }

    // Parse Marks (e.g. "45.33 / 100")
    let marks = 0;
    let totalMarks = 100;
    if (marksRaw) {
      const parts = marksRaw.split('/');
      marks = parseFloat(parts[0]) || 0;
      totalMarks = parseFloat(parts[1]) || 100;
    }

    // Parse Time Taken (e.g. "120 Min" or "2.05 Min")
    let timeTaken = timeTakenRaw || '';
    
    // Clean up percentages/accuracy
    let accuracy = accuracyRaw || '';
    if (accuracy && !accuracy.includes('%')) {
      accuracy += '%';
    }

    let percentage = percentageRaw || '';
    if (percentage && !percentage.includes('%')) {
      percentage += '%';
    }

    return {
      success: true,
      title: title || 'GATE Exam Paper',
      attempted,
      totalQs,
      marks,
      totalMarks,
      correct: parseInt(correctRaw) || 0,
      incorrect: parseInt(incorrectRaw) || 0,
      notAttempted: parseInt(notAttemptedRaw) || 0,
      duration: durationRaw || '180 Min',
      timeTaken: timeTaken || '0.00 Min',
      accuracy: accuracy || '0%',
      percentage: percentage || '0.00%'
    };
  } catch (error) {
    console.error('Error parsing offline HTML:', error);
    return {
      success: false,
      error: error.message || 'Failed to parse file content.'
    };
  }
}
