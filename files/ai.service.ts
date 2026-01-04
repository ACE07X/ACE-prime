/**
 * Ultra ACE - AI Assistant Service
 * Integrates with OpenAI for coding assistance and debugging
 */

import OpenAI from 'openai';
import { log } from '../utils/logger';
import { memoryService } from './memory.service';
import type { ServiceResult, ProjectContext, ChannelContext } from '../types';

interface AIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface AIResponse {
  content: string;
  tokens_used: number;
  model: string;
}

export class AIAssistantService {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config?: Partial<AIConfig>) {
    this.openai = new OpenAI({
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = config?.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    this.maxTokens = config?.maxTokens || 4096;
    this.temperature = config?.temperature || 0.7;
  }

  /**
   * System prompt for the AI assistant
   */
  private getSystemPrompt(context?: ProjectContext | ChannelContext): string {
    const basePrompt = `You are Ultra ACE, an advanced AI Project Manager Bot for SoulTech. 
You help software development teams manage projects, tasks, and code through Discord.

Your capabilities include:
- Project and task management guidance
- Code review and debugging assistance
- Architecture recommendations
- Best practices for software development
- Documentation help

Guidelines:
- Be concise but thorough
- Provide code examples when helpful
- Use Discord markdown formatting (code blocks, bold, etc.)
- Reference project context when available
- Suggest actionable next steps

When reviewing code:
- Point out potential bugs or issues
- Suggest improvements for readability and performance
- Follow language-specific best practices
- Consider security implications`;

    if (context) {
      const contextStr = memoryService.formatContextForAI(context);
      return `${basePrompt}\n\n---\nCurrent Context:\n${contextStr}`;
    }

    return basePrompt;
  }

  /**
   * Chat with the AI assistant
   */
  async chat(
    message: string,
    options: {
      channelId?: string;
      projectId?: string;
      userId?: string;
      includeContext?: boolean;
    } = {}
  ): Promise<ServiceResult<AIResponse>> {
    try {
      const { channelId, projectId, userId, includeContext = true } = options;

      // Build context
      let context: ProjectContext | ChannelContext | undefined;
      
      if (includeContext) {
        if (projectId) {
          const contextResult = await memoryService.buildProjectContext(projectId);
          if (contextResult.success && contextResult.data) {
            context = contextResult.data;
          }
        } else if (channelId) {
          const contextResult = await memoryService.buildChannelContext(
            channelId, 
            'guild' // This should come from the actual guild
          );
          if (contextResult.success && contextResult.data) {
            context = contextResult.data;
          }
        }
      }

      const systemPrompt = this.getSystemPrompt(context);

      // Build messages array
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history if available
      if (context?.conversation_history) {
        for (const msg of context.conversation_history.slice(-10)) {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const responseContent = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Save to memory
      if (channelId && userId) {
        await memoryService.saveMessage(channelId, userId, message, 'user', { projectId });
        await memoryService.saveMessage(channelId, 'assistant', responseContent, 'assistant', {
          projectId,
          tokens: tokensUsed,
        });
      }

      log.info('AI chat completed', { tokens: tokensUsed, model: this.model });

      return {
        success: true,
        data: {
          content: responseContent,
          tokens_used: tokensUsed,
          model: this.model,
        },
      };

    } catch (err) {
      log.error('AI chat error', err);
      return { success: false, error: 'Failed to get AI response' };
    }
  }

  /**
   * Debug code with AI assistance
   */
  async debugCode(
    code: string,
    error: string,
    language: string = 'typescript'
  ): Promise<ServiceResult<AIResponse>> {
    const prompt = `Debug this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Error message:
\`\`\`
${error}
\`\`\`

Please:
1. Identify the cause of the error
2. Explain why it's happening
3. Provide the corrected code
4. Suggest how to prevent similar issues`;

    return this.chat(prompt, { includeContext: false });
  }

  /**
   * Review code for improvements
   */
  async reviewCode(
    code: string,
    language: string = 'typescript',
    focus?: string[]
  ): Promise<ServiceResult<AIResponse>> {
    const focusAreas = focus?.length 
      ? `Focus particularly on: ${focus.join(', ')}`
      : 'Review all aspects';

    const prompt = `Review this ${language} code:

\`\`\`${language}
${code}
\`\`\`

${focusAreas}

Please analyze:
1. Code quality and readability
2. Potential bugs or issues
3. Performance considerations
4. Security implications
5. Suggested improvements

Provide specific, actionable feedback with code examples where helpful.`;

    return this.chat(prompt, { includeContext: false });
  }

  /**
   * Generate code from description
   */
  async generateCode(
    description: string,
    language: string = 'typescript',
    options: {
      framework?: string;
      style?: 'minimal' | 'documented' | 'production';
    } = {}
  ): Promise<ServiceResult<AIResponse>> {
    const { framework, style = 'documented' } = options;

    let styleGuide = '';
    switch (style) {
      case 'minimal':
        styleGuide = 'Keep the code minimal and concise.';
        break;
      case 'production':
        styleGuide = 'Write production-ready code with error handling, types, and comments.';
        break;
      default:
        styleGuide = 'Include helpful comments and type annotations.';
    }

    const frameworkNote = framework ? ` using ${framework}` : '';

    const prompt = `Generate ${language} code${frameworkNote}:

Description: ${description}

${styleGuide}

Requirements:
- Follow ${language} best practices
- Include necessary imports
- Add error handling where appropriate
- Use modern syntax and patterns`;

    return this.chat(prompt, { includeContext: false });
  }

  /**
   * Explain code
   */
  async explainCode(
    code: string,
    language: string = 'typescript',
    level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<ServiceResult<AIResponse>> {
    const levelGuide = {
      beginner: 'Explain as if teaching someone new to programming. Use simple terms and analogies.',
      intermediate: 'Explain the key concepts and patterns. Assume basic programming knowledge.',
      advanced: 'Focus on subtle details, performance implications, and advanced patterns.',
    };

    const prompt = `Explain this ${language} code:

\`\`\`${language}
${code}
\`\`\`

${levelGuide[level]}

Include:
1. What the code does overall
2. How each major part works
3. Any patterns or techniques used
4. Potential edge cases or limitations`;

    return this.chat(prompt, { includeContext: false });
  }

  /**
   * Get architecture advice
   */
  async getArchitectureAdvice(
    description: string,
    constraints?: string[]
  ): Promise<ServiceResult<AIResponse>> {
    const constraintStr = constraints?.length 
      ? `\n\nConstraints:\n${constraints.map(c => `- ${c}`).join('\n')}`
      : '';

    const prompt = `Provide architecture advice for:

${description}${constraintStr}

Please include:
1. Recommended architecture pattern(s)
2. Key components and their responsibilities
3. Data flow overview
4. Technology recommendations
5. Potential challenges and mitigations
6. A simple diagram using ASCII or mermaid syntax`;

    return this.chat(prompt, { includeContext: false });
  }

  /**
   * Summarize a conversation or document
   */
  async summarize(
    content: string,
    options: { format?: 'bullet' | 'paragraph' | 'action-items' } = {}
  ): Promise<ServiceResult<AIResponse>> {
    const { format = 'bullet' } = options;

    const formatGuide = {
      bullet: 'Use bullet points for key takeaways',
      paragraph: 'Write a concise paragraph summary',
      'action-items': 'Extract and list action items with owners if mentioned',
    };

    const prompt = `Summarize this content:

${content}

${formatGuide[format]}

Be concise but capture all important points.`;

    return this.chat(prompt, { includeContext: false });
  }

  /**
   * Generate commit message from diff or description
   */
  async generateCommitMessage(
    changes: string,
    style: 'conventional' | 'simple' = 'conventional'
  ): Promise<ServiceResult<string>> {
    const styleGuide = style === 'conventional'
      ? 'Use conventional commits format (type(scope): description)'
      : 'Use a simple, clear format';

    const prompt = `Generate a git commit message for these changes:

${changes}

${styleGuide}

Requirements:
- Be specific about what changed
- Keep the first line under 72 characters
- Add a body if changes are complex`;

    const result = await this.chat(prompt, { includeContext: false });
    
    if (result.success && result.data) {
      // Extract just the commit message (remove markdown formatting if present)
      let commitMessage = result.data.content
        .replace(/```[a-z]*\n?/g, '')
        .replace(/```/g, '')
        .trim();

      return { success: true, data: commitMessage };
    }

    return { success: false, error: result.error };
  }

  /**
   * Suggest improvements for a task description
   */
  async improveTaskDescription(
    title: string,
    description?: string
  ): Promise<ServiceResult<{ improved_title: string; improved_description: string; acceptance_criteria: string[] }>> {
    const prompt = `Improve this task:

Title: ${title}
${description ? `Description: ${description}` : ''}

Provide:
1. An improved, clearer title
2. A detailed description with context and requirements
3. 3-5 acceptance criteria

Format your response as JSON with keys: improved_title, improved_description, acceptance_criteria (array)`;

    const result = await this.chat(prompt, { includeContext: false });

    if (result.success && result.data) {
      try {
        // Try to parse JSON from response
        const jsonMatch = result.data.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return { success: true, data: parsed };
        }
      } catch {
        // If parsing fails, return the raw response
      }
    }

    return { success: false, error: 'Failed to improve task description' };
  }
}

// Export singleton instance
export const aiService = new AIAssistantService();
export default aiService;
