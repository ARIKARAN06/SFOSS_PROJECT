export interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  codeSnippet?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOptionLetter: string; // "A" | "B" | "C" | "D"
  explanation?: string;
  isValid: boolean;
  validationError?: string;
}

export interface ParseResult {
  totalDetected: number;
  validQuestions: ParsedQuestion[];
  invalidQuestions: ParsedQuestion[];
  errors: string[];
}

/**
 * Parses raw text extracted from uploaded DOCX or PDF documents using tag markers or standard formatting.
 */
export function parseRawQuestionText(rawText: string): ParseResult {
  const result: ParseResult = {
    totalDetected: 0,
    validQuestions: [],
    invalidQuestions: [],
    errors: [],
  };

  if (!rawText || rawText.trim().length === 0) {
    result.errors.push('Uploaded document is empty or could not be parsed as text.');
    return result;
  }

  // Determine split strategy: [QUESTION] tags vs "Question X:" numbers
  let rawBlocks: string[] = [];
  if (/\[QUESTION\]/i.test(rawText)) {
    rawBlocks = rawText.split(/\[QUESTION\]/i).filter((b) => b.trim().length > 0);
  } else {
    rawBlocks = rawText.split(/(?:^|\n)(?:Question|\d+\.)\s*\d*[:\.]?/i).filter((b) => b.trim().length > 0);
  }

  result.totalDetected = rawBlocks.length;

  rawBlocks.forEach((block, index) => {
    const qNum = index + 1;
    const parsed: ParsedQuestion = {
      questionNumber: qNum,
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOptionLetter: '',
      isValid: false,
    };

    // 1. Extract Code Snippet: ```code``` or [CODE]...[/CODE]
    const codeMatch = block.match(/(?:```(?:[a-z]*)\n?([\s\S]*?)```|\[CODE\]([\s\S]*?)\[\/CODE\])/i);
    if (codeMatch) {
      parsed.codeSnippet = (codeMatch[1] || codeMatch[2]).trim();
      block = block.replace(/(?:```(?:[a-z]*)\n?[\s\S]*?```|\[CODE\][\s\S]*?\[\/CODE\])/i, '');
    }

    // 2. Extract Explanation
    const expMatch = block.match(/(?:Explanation|\[EXPLANATION\])[:\s]*([\s\S]*?)(?=\[END_QUESTION\]|$)/i);
    if (expMatch) {
      parsed.explanation = expMatch[1].trim();
      block = block.replace(/(?:Explanation|\[EXPLANATION\])[:\s]*[\s\S]*/i, '');
    }

    // 3. Extract Correct Answer Letter
    const correctMatch = block.match(/(?:Answer|\[CORRECT\])[:\s]*([A-Da-d])/i);
    if (correctMatch) {
      parsed.correctOptionLetter = correctMatch[1].toUpperCase();
      block = block.replace(/(?:Answer|\[CORRECT\])[:\s]*[A-Da-d]/i, '');
    }

    // 4. Extract Options A, B, C, D
    const optAMatch = block.match(/(?:A\)|\[OPTION_A\])[:\s]*([\s\S]*?)(?=(?:B\)|\[OPTION_B\])|$)/i);
    const optBMatch = block.match(/(?:B\)|\[OPTION_B\])[:\s]*([\s\S]*?)(?=(?:C\)|\[OPTION_C\])|$)/i);
    const optCMatch = block.match(/(?:C\)|\[OPTION_C\])[:\s]*([\s\S]*?)(?=(?:D\)|\[OPTION_D\])|$)/i);
    const optDMatch = block.match(/(?:D\)|\[OPTION_D\])[:\s]*([\s\S]*?)(?=$)/i);

    if (optAMatch) parsed.optionA = optAMatch[1].trim();
    if (optBMatch) parsed.optionB = optBMatch[1].trim();
    if (optCMatch) parsed.optionC = optCMatch[1].trim();
    if (optDMatch) parsed.optionD = optDMatch[1].trim();

    // 5. Extract main question text
    const questionTextClean = block
      .replace(/(?:A\)|\[OPTION_A\])[\s\S]*/gi, '')
      .replace(/\[END_QUESTION\]/gi, '')
      .trim();
    parsed.questionText = questionTextClean;

    // Validation Rules
    if (!parsed.questionText) {
      parsed.validationError = `Question #${qNum} is missing question text.`;
    } else if (!parsed.optionA || !parsed.optionB) {
      parsed.validationError = `Question #${qNum} requires at least Option A and Option B.`;
    } else if (!['A', 'B', 'C', 'D'].includes(parsed.correctOptionLetter)) {
      parsed.validationError = `Question #${qNum} missing valid correct answer (A/B/C/D).`;
    } else {
      parsed.isValid = true;
    }

    if (parsed.isValid) {
      result.validQuestions.push(parsed);
    } else {
      result.invalidQuestions.push(parsed);
      if (parsed.validationError) {
        result.errors.push(parsed.validationError);
      }
    }
  });

  return result;
}
