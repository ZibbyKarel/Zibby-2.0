import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DecomposerOutputSchema, type DecomposerOutput } from 'shared-types';
import { buildDecomposerPrompt, EMIT_SUBTASKS_TOOL } from './decomposer.prompt';

@Injectable()
export class DecomposerService {
  private readonly client: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.getOrThrow('ANTHROPIC_API_KEY'),
    });
  }

  async decompose(prompt: string, repoContext: string | undefined): Promise<DecomposerOutput> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [EMIT_SUBTASKS_TOOL],
      tool_choice: { type: 'tool', name: 'emit_subtasks' },
      messages: [{ role: 'user', content: buildDecomposerPrompt(prompt, repoContext) }],
    });

    const toolUse = response.content.find((c) => c.type === 'tool_use' && c.name === 'emit_subtasks');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Decomposer did not return tool_use block');
    }

    const parsed = DecomposerOutputSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      throw new Error(`Decomposer output invalid: ${parsed.error.message}`);
    }

    return parsed.data;
  }

  async getRepoContext(repoPath: string): Promise<string | undefined> {
    for (const candidate of ['CLAUDE.md', 'README.md', 'readme.md']) {
      try {
        const content = await readFile(join(repoPath, candidate), 'utf8');
        // Truncate to first 2000 chars to keep the prompt focused
        return content.slice(0, 2000);
      } catch {
        continue;
      }
    }
    return undefined;
  }
}
