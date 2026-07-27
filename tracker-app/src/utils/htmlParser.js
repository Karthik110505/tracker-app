// HTML Parser utility to parse offline-compiled exam result files
// Extracts titles, marks, and other stats from Netlify offline HTML files

function parseQuestionsList(elements, startIndex) {
  const questions = [];
  let attempted = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  let totalAwarded = 0;
  let totalPenalty = 0;
  
  elements.forEach((el, index) => {
    // Get Q Number and meta details
    const metaEl = el.querySelector('.res_qs_meta');
    let qNum = `Q#${startIndex + index + 1}`;
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
    
    // Get answers from solution block
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
    
    // Score calculation
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
  const attemptRate = elements.length > 0 ? Math.round((attempted / elements.length) * 100) : 0;
  const totalMarks = questions.reduce((sum, q) => sum + q.award, 0);
  
  return {
    summary: {
      totalQuestions: elements.length,
      totalMarks,
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
}

export function calculateExamDetails(htmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    const sectionElements = doc.querySelectorAll('.res_section');
    const sectionsData = [];
    const questions = [];
    
    let totalAttempted = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnattempted = 0;
    let totalAwarded = 0;
    let totalPenalty = 0;
    
    if (sectionElements.length > 0) {
      sectionElements.forEach((secEl) => {
        const h2 = secEl.querySelector('h2');
        const sectionName = h2 ? h2.textContent.trim() : 'General';
        const qElements = secEl.querySelectorAll('.res_question');
        
        const secSummary = parseQuestionsList(qElements, questions.length);
        
        questions.push(...secSummary.questions);
        
        sectionsData.push({
          name: sectionName,
          summary: secSummary.summary,
          questions: secSummary.questions
        });
        
        totalAttempted += secSummary.summary.attempted;
        totalCorrect += secSummary.summary.correct;
        totalIncorrect += secSummary.summary.incorrect;
        totalUnattempted += secSummary.summary.unattempted;
        totalAwarded += secSummary.summary.awardedMarks;
        totalPenalty += secSummary.summary.penaltyMarks;
      });
    } else {
      const qElements = doc.querySelectorAll('.res_question');
      if (qElements.length === 0) {
        throw new Error("No question containers found with class 'res_question'.");
      }
      
      const overallParsed = parseQuestionsList(qElements, 0);
      questions.push(...overallParsed.questions);
      
      // Auto-split 65 questions into Aptitude and Technical
      if (questions.length === 65) {
        const aptQs = questions.slice(0, 10);
        const techQs = questions.slice(10);
        
        const calculateSummary = (qsList) => {
          let attempted = 0, correct = 0, incorrect = 0, unattempted = 0;
          let awardedMarks = 0, penaltyMarks = 0;
          qsList.forEach(q => {
            if (q.status === 'correct') {
              attempted++;
              correct++;
              awardedMarks += q.award;
            } else if (q.status === 'incorrect') {
              attempted++;
              incorrect++;
              penaltyMarks += q.penalty;
            } else {
              unattempted++;
            }
          });
          const score = parseFloat((awardedMarks - penaltyMarks).toFixed(2));
          const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
          const attemptRate = qsList.length > 0 ? Math.round((attempted / qsList.length) * 100) : 0;
          const totalMarks = qsList.reduce((sum, q) => sum + q.award, 0);
          return {
            totalQuestions: qsList.length,
            totalMarks,
            attempted,
            correct,
            incorrect,
            unattempted,
            awardedMarks: parseFloat(awardedMarks.toFixed(2)),
            penaltyMarks: parseFloat(penaltyMarks.toFixed(2)),
            score,
            accuracy,
            attemptRate
          };
        };
        
        sectionsData.push({
          name: "General Aptitude",
          summary: calculateSummary(aptQs),
          questions: aptQs
        });
        sectionsData.push({
          name: "Technical",
          summary: calculateSummary(techQs),
          questions: techQs
        });
      } else {
        sectionsData.push({
          name: "Technical",
          summary: overallParsed.summary,
          questions: overallParsed.questions
        });
      }
      
      totalAttempted = overallParsed.summary.attempted;
      totalCorrect = overallParsed.summary.correct;
      totalIncorrect = overallParsed.summary.incorrect;
      totalUnattempted = overallParsed.summary.unattempted;
      totalAwarded = overallParsed.summary.awardedMarks;
      totalPenalty = overallParsed.summary.penaltyMarks;
    }
    
    const finalScore = parseFloat((totalAwarded - totalPenalty).toFixed(2));
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    const attemptRate = questions.length > 0 ? Math.round((totalAttempted / questions.length) * 100) : 0;
    const totalMarks = questions.reduce((sum, q) => sum + q.award, 0);
    
    return {
      success: true,
      summary: {
        totalQuestions: questions.length,
        totalMarks,
        attempted: totalAttempted,
        correct: totalCorrect,
        incorrect: totalIncorrect,
        unattempted: totalUnattempted,
        awardedMarks: parseFloat(totalAwarded.toFixed(2)),
        penaltyMarks: parseFloat(totalPenalty.toFixed(2)),
        score: finalScore,
        accuracy,
        attemptRate
      },
      questions,
      sections: sectionsData
    };
  } catch (error) {
    console.error("Error calculating details:", error);
    return {
      success: false,
      error: error.message || "Failed to calculate details."
    };
  }
}

export function parseOfflineHtml(htmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // Extract title (e.g. "GATE CSE 2010 | Original Paper")
    let title = doc.title || 'Unknown Exam';
    title = title.replace('_Offline', '').replace(/_/g, ' ').trim();
    if (title.endsWith('.html')) {
      title = title.substring(0, title.length - 5);
    }
    
    // Check if we can parse the question elements
    const questionElements = doc.querySelectorAll('.res_question');
    if (questionElements.length > 0) {
      // We have question containers! Perform the exact calculation!
      const calcResult = calculateExamDetails(htmlText);
      if (calcResult.success) {
        const { summary } = calcResult;
        
        // Find exam duration & time taken metadata
        const extractVal = (label) => {
          const elements = Array.from(doc.querySelectorAll('*'));
          for (const el of elements) {
            if (el.children.length === 0 && el.textContent.includes(label)) {
              const text = el.textContent.trim();
              const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
              const regex = new RegExp(escapedLabel + '\\s*(.*)', 'i');
              const match = text.match(regex);
              if (match && match[1].trim()) return match[1].trim();
              if (el.parentElement) {
                const parentText = el.parentElement.textContent.trim();
                const parentMatch = parentText.match(regex);
                if (parentMatch && parentMatch[1].trim()) return parentMatch[1].trim();
              }
              if (el.nextElementSibling) return el.nextElementSibling.textContent.trim();
            }
          }
          return '';
        };

        const durationRaw = extractVal('Exam Duration:');
        const timeTakenRaw = extractVal('Time Taken:');

        return {
          success: true,
          title: title || 'GATE Exam Paper',
          attempted: summary.attempted,
          totalQs: summary.totalQuestions,
          marks: summary.score,
          totalMarks: summary.totalMarks || 100,
          correct: summary.correct,
          incorrect: summary.incorrect,
          notAttempted: summary.unattempted,
          duration: durationRaw || '180 Min',
          timeTaken: timeTakenRaw || '0.00 Min',
          accuracy: `${summary.accuracy}%`,
          percentage: `${((summary.score / (summary.totalMarks || 100)) * 100).toFixed(2)}%`
        };
      }
    }
    
    // Fallback: If no question elements, try legacy parsing of headers
    const extractValLegacy = (label) => {
      const elements = Array.from(doc.querySelectorAll('*'));
      for (const el of elements) {
        if (el.children.length === 0 && el.textContent.includes(label)) {
          const text = el.textContent.trim();
          const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedLabel + '\\s*(.*)', 'i');
          const match = text.match(regex);
          if (match && match[1].trim()) return match[1].trim();
          if (el.parentElement) {
            const parentText = el.parentElement.textContent.trim();
            const parentMatch = parentText.match(regex);
            if (parentMatch && parentMatch[1].trim()) return parentMatch[1].trim();
          }
          if (el.nextElementSibling) return el.nextElementSibling.textContent.trim();
        }
      }
      return '';
    };

    const attemptedRaw = extractValLegacy('Qs. Attempted:');
    const marksRaw = extractValLegacy('Resultant Marks:');
    const durationRaw = extractValLegacy('Exam Duration:');
    const correctRaw = extractValLegacy('Correct Attempts:');
    const incorrectRaw = extractValLegacy('Incorrect Attempts:');
    const notAttemptedRaw = extractValLegacy('Not Attempted:');
    const timeTakenRaw = extractValLegacy('Time Taken:');
    const accuracyRaw = extractValLegacy('Accuracy:');

    let attempted = 0;
    let totalQs = 65;
    if (attemptedRaw) {
      const parts = attemptedRaw.split('/');
      attempted = parseInt(parts[0]) || 0;
      totalQs = parseInt(parts[1]) || 65;
    }

    let marks = 0;
    let totalMarks = 100;
    if (marksRaw) {
      const parts = marksRaw.split('/');
      marks = parseFloat(parts[0]) || 0;
      totalMarks = parseFloat(parts[1]) || 100;
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
      timeTaken: timeTakenRaw || '0.00 Min',
      accuracy: accuracyRaw || '0%',
      percentage: '0.00%'
    };
  } catch (error) {
    console.error('Error parsing offline HTML:', error);
    return {
      success: false,
      error: error.message || 'Failed to parse file content.'
    };
  }
}
