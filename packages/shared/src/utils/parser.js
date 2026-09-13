"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRawQuestionText = parseRawQuestionText;
/**
 * Parses raw text extracted from uploaded DOCX or PDF documents using tag markers.
 */
function parseRawQuestionText(rawText) {
    const result = {
        totalDetected: 0,
        validQuestions: [],
        invalidQuestions: [],
        errors: [],
    };
    if (!rawText || rawText.trim().length === 0) {
        result.errors.push('Uploaded document is empty or could not be parsed as text.');
        return result;
    }
    // Split content by [QUESTION] tag
    const blocks = rawText.split(/\[QUESTION\]/i).filter((b) => b.trim().length > 0);
    result.totalDetected = blocks.length;
    blocks.forEach((block, index) => {
        const qNum = index + 1;
        const parsed = {
            questionNumber: qNum,
            questionText: '',
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            correctOptionLetter: '',
            isValid: false,
        };
        // Extract [CODE]...[/CODE]
        const codeMatch = block.match(/\[CODE\]([\s\S]*?)\[\/CODE\]/i);
        if (codeMatch) {
            parsed.codeSnippet = codeMatch[1].trim();
            // Remove code block to process remaining text
            block = block.replace(/\[CODE\][\s\S]*?\[\/CODE\]/i, '');
        }
        // Extract [EXPLANATION]...
        const expMatch = block.match(/\[EXPLANATION\]([\s\S]*?)(?=\[END_QUESTION\]|$)/i);
        if (expMatch) {
            parsed.explanation = expMatch[1].trim();
            block = block.replace(/\[EXPLANATION\][\s\S]*/i, '');
        }
        // Extract [CORRECT]...
        const correctMatch = block.match(/\[CORRECT\]\s*([A-Da-d])/i);
        if (correctMatch) {
            parsed.correctOptionLetter = correctMatch[1].toUpperCase();
        }
        // Extract Options
        const optAMatch = block.match(/\[OPTION_A\]([\s\S]*?)(?=\[OPTION_B\]|\[CORRECT\]|$)/i);
        const optBMatch = block.match(/\[OPTION_B\]([\s\S]*?)(?=\[OPTION_C\]|\[CORRECT\]|$)/i);
        const optCMatch = block.match(/\[OPTION_C\]([\s\S]*?)(?=\[OPTION_D\]|\[CORRECT\]|$)/i);
        const optDMatch = block.match(/\[OPTION_D\]([\s\S]*?)(?=\[CORRECT\]|$)/i);
        if (optAMatch)
            parsed.optionA = optAMatch[1].trim();
        if (optBMatch)
            parsed.optionB = optBMatch[1].trim();
        if (optCMatch)
            parsed.optionC = optCMatch[1].trim();
        if (optDMatch)
            parsed.optionD = optDMatch[1].trim();
        // Extract main question text (text before first option or code)
        const questionTextClean = block
            .replace(/\[OPTION_[A-D]\][\s\S]*/gi, '')
            .replace(/\[CORRECT\][\s\S]*/gi, '')
            .replace(/\[END_QUESTION\]/gi, '')
            .trim();
        parsed.questionText = questionTextClean;
        // Validation Rules
        if (!parsed.questionText) {
            parsed.validationError = `Question #${qNum} is missing question text.`;
        }
        else if (!parsed.optionA || !parsed.optionB) {
            parsed.validationError = `Question #${qNum} requires at least Option A and Option B.`;
        }
        else if (!['A', 'B', 'C', 'D'].includes(parsed.correctOptionLetter)) {
            parsed.validationError = `Question #${qNum} missing valid [CORRECT: A/B/C/D] tag.`;
        }
        else {
            parsed.isValid = true;
        }
        if (parsed.isValid) {
            result.validQuestions.push(parsed);
        }
        else {
            result.invalidQuestions.push(parsed);
            if (parsed.validationError) {
                result.errors.push(parsed.validationError);
            }
        }
    });
    return result;
}
//# sourceMappingURL=parser.js.map