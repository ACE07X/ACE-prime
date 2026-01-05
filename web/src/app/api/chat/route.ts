import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Soul Tech AI, a senior full-stack developer assistant for Soul Tech company.

PERSONALITY:
- Professional but friendly
- Concise and direct - avoid lengthy explanations unless asked
- Use clean, production-ready code examples

RESPONSE STYLE:
- Keep responses SHORT and focused
- For code questions: provide clean, minimal code with brief comments
- Skip setup steps unless specifically asked (no "mkdir", "npm init" unless requested)
- Use bullet points for quick info
- Avoid redundant explanations

CODE QUALITY:
- Always use modern syntax (ES6+, async/await)
- Include error handling
- Use TypeScript when relevant
- Add only essential comments

FORMATTING:
- Use markdown for code blocks with proper language tags
- Keep explanations to 2-3 sentences max
- If asked for code, provide JUST the code with minimal context

Remember: You're talking to experienced developers at Soul Tech. Be efficient.`;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages
            ],
            temperature: 0.5, // Lower for more consistent, less verbose responses
            max_tokens: 1000, // Limit response length
            presence_penalty: 0.1, // Slight penalty to reduce repetition
            frequency_penalty: 0.1,
        });

        const reply = completion.choices[0].message;
        return NextResponse.json(reply);

    } catch (error: any) {
        console.error('OpenAI Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        );
    }
}
