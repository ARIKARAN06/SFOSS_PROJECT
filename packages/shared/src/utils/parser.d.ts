export interface ParsedQuestion {
    questionNumber: number;
    questionText: string;
    codeSnippet?: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOptionLetter: string;
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
 * Parses raw text extracted from uploaded DOCX or PDF documents using tag markers.
 */
export declare function parseRawQuestionText(rawText: string): ParseResult;
//# sourceMappingURL=parser.d.ts.map