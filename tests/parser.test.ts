import { describe, it, expect } from 'vitest';
import { parseRawQuestionText } from '../packages/shared/src';

describe('Document Question Parser Tests', () => {
  it('should parse valid questions with code blocks, options and answer key', () => {
    const rawText = `
[QUESTION]
What is the output of the following C code snippet?
[CODE]
#include <stdio.int>
int main() {
    int x = 5;
    printf("%d", x++);
    return 0;
}
[/CODE]
[OPTION_A] 5
[OPTION_B] 6
[OPTION_C] 0
[OPTION_D] Compilation Error
[CORRECT] A
[EXPLANATION] Post-increment returns original value before incrementing.

[QUESTION]
Which keyword in Python defines a function?
[OPTION_A] func
[OPTION_B] def
[OPTION_C] function
[OPTION_D] define
[CORRECT] B
[EXPLANATION] Python uses 'def' keyword.
    `;

    const result = parseRawQuestionText(rawText);
    expect(result.validQuestions.length).toBe(2);
    expect(result.invalidQuestions.length).toBe(0);

    const q1 = result.validQuestions[0];
    expect(q1.questionNumber).toBe(1);
    expect(q1.correctOptionLetter).toBe('A');
    expect(q1.codeSnippet).toContain('printf');
    expect(q1.optionA).toBe('5');

    const q2 = result.validQuestions[1];
    expect(q2.questionNumber).toBe(2);
    expect(q2.correctOptionLetter).toBe('B');
    expect(q2.optionB).toBe('def');
  });

  it('should report malformed question blocks as invalid', () => {
    const rawText = `
[QUESTION]
Incomplete question without options
[CORRECT] A
    `;

    const result = parseRawQuestionText(rawText);
    expect(result.validQuestions.length).toBe(0);
    expect(result.invalidQuestions.length).toBe(1);
  });
});
