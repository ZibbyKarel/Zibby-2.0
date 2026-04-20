interface SubtaskForPrompt {
  title: string;
  spec: string;
  acceptanceCriteria: string; // JSON-encoded string[]
}

export function buildSubtaskPrompt(subtask: SubtaskForPrompt): string {
  let criteria: string[];
  try {
    criteria = JSON.parse(subtask.acceptanceCriteria) as string[];
  } catch {
    criteria = [subtask.acceptanceCriteria];
  }

  const criteriaList = criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');

  return `You are an expert software engineer implementing the following task.

## Task: ${subtask.title}

## Specification
${subtask.spec}

## Acceptance Criteria
${criteriaList}

## Instructions
- Implement the task fully according to the specification and acceptance criteria above.
- Run the project's tests, linter, and type checker as you go and fix any issues.
- When you are satisfied that all acceptance criteria are met and tests pass, commit your changes with a descriptive commit message.
- Do NOT push the branch or create a pull request — the orchestrator will do that.
- If you cannot complete the task, explain why clearly in your response and exit WITHOUT committing.
- Do not modify files unrelated to this task.`;
}
