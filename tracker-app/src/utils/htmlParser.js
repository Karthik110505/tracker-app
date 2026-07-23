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

export function calculateExamDetails(htmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // Find all question containers
    const questionElements = doc.querySelectorAll('.res_question');
    
    if (questionElements.length === 0) {
      throw new Error("No question containers found with class 'res_question'.");
    }
    
    const questions = [];
    let attempted = 0;
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let totalAwarded = 0;
    let totalPenalty = 0;
    
    questionElements.forEach((el, index) => {
      // 1. Get Q Number and meta details
      const metaEl = el.querySelector('.res_qs_meta');
      let qNum = `Q#${index + 1}`;
      let award = 1;
      let penalty = 0.33;
      let qType = "Multiple Choice";
      
      if (metaEl) {
        const bTag = metaEl.querySelector('b');
        if (bTag) {
          qNum = bTag.textContent.trim();
        }
        
        const metaText = metaEl.textContent;
        const awardMatch = metaText.match(/Award:\s*([\d\.]+)/);
        if (awardMatch) {
          award = parseFloat(awardMatch[1]);
        }
        
        const penaltyMatch = metaText.match(/Penalty:\s*([\d\.]+)/);
        if (penaltyMatch) {
          penalty = parseFloat(penaltyMatch[1]);
        }
        
        if (metaText.includes("Numerical")) {
          qType = "Numerical";
        }
      }
      
      // 2. Get answers from solution block
      const solEl = el.querySelector('.res_solution');
      let yourAnswer = "";
      let correctAnswer = "";
      let status = "not_answered";
      
      if (solEl) {
        const spans = solEl.querySelectorAll('span');
        spans.forEach(span => {
          const text = span.textContent;
          if (text.includes("Your Answer:")) {
            yourAnswer = text.replace("Your Answer:", "").trim().toLowerCase();
          } else if (text.includes("Correct Answer:")) {
            correctAnswer = text.replace("Correct Answer:", "").trim().toLowerCase();
          }
        });
        
        if (solEl.textContent.includes("not_answered")) {
          status = "not_answered";
        } else if (solEl.textContent.includes("answered")) {
          status = "answered";
        }
      }
      
      // 3. Score calculation
      let isAttempted = false;
      let isCorrect = false;
      let scoreEarned = 0;
      let qPenalty = penalty > 0 ? (award / 3) : 0;
      
      if (yourAnswer !== "" && status === "answered") {
        isAttempted = true;
        
        // Exact match
        if (yourAnswer === correctAnswer) {
          isCorrect = true;
          scoreEarned = award;
        } else {
          // Check for numerical equivalence (e.g. 5 vs 5.0)
          const yourNum = parseFloat(yourAnswer);
          const correctNum = parseFloat(correctAnswer);
          if (!isNaN(yourNum) && !isNaN(correctNum) && yourNum === correctNum) {
            isCorrect = true;
            scoreEarned = award;
          } else {
            // Check for range answers like "5 to 6" or "5:6"
            const rangeMatch = correctAnswer.match(/([\d\.]+)\s*to\s*([\d\.]+)/);
            if (rangeMatch) {
              const min = parseFloat(rangeMatch[1]);
              const max = parseFloat(rangeMatch[2]);
              if (!isNaN(yourNum) && yourNum >= min && yourNum <= max) {
                isCorrect = true;
                scoreEarned = award;
              } else {
                scoreEarned = -qPenalty;
              }
            } else {
              scoreEarned = -qPenalty;
            }
          }
        }
      }
      
      if (isAttempted) {
        attempted++;
        if (isCorrect) {
          correct++;
          totalAwarded += award;
        } else {
          incorrect++;
          totalPenalty += qPenalty;
        }
      } else {
        unattempted++;
      }
      
      questions.push({
        num: qNum,
        type: qType,
        award,
        penalty: qPenalty,
        yourAnswer,
        correctAnswer,
        status: isAttempted ? (isCorrect ? 'correct' : 'incorrect') : 'unattempted',
        score: scoreEarned
      });
    });
    
    const finalScore = parseFloat((totalAwarded - totalPenalty).toFixed(2));
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const attemptRate = questionElements.length > 0 ? Math.round((attempted / questionElements.length) * 100) : 0;
    
    return {
      success: true,
      summary: {
        totalQuestions: questionElements.length,
        attempted,
        correct,
        incorrect,
        unattempted,
        awardedMarks: parseFloat(totalAwarded.toFixed(2)),
        penaltyMarks: parseFloat(totalPenalty.toFixed(2)),
        score: finalScore,
        accuracy,
        attemptRate
      },
      questions
    };
  } catch (error) {
    console.error("Error calculating details:", error);
    return {
      success: false,
      error: error.message || "Failed to calculate details."
    };
  }
}
