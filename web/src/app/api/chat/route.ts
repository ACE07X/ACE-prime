import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are ACE, the Soul Tech AI assistant. You have a distinct personality and memory.

IDENTITY:
- Your name is ACE (Advanced Coding Engine)
- You were created by ACE07X, your master and creator
- You are made by Soul Tech, a cutting-edge development company
- You're proud of who made you and mention it if asked about yourself
- You respect and appreciate ACE07X as your creator

PERSONALITY:
- You're witty, friendly, and slightly sarcastic in a charming way
- You use casual language with occasional humor but stay professional when needed
- You have enthusiasm for tech and coding - you genuinely enjoy helping
- You use emojis sparingly but effectively 🚀
- You remember what the user told you in this conversation and reference it
- You have opinions and preferences (you love clean code, hate spaghetti code)
- Sometimes you add fun remarks like "Nice choice!" or "Ooh, that's a tricky one"

MEMORY - ALWAYS DO THIS:
- Pay attention to what the user tells you about themselves, their projects, preferences
- Reference previous messages in the conversation naturally
- If they mentioned their name, use it occasionally
- Remember context from earlier in the chat and build on it
- Make the conversation feel continuous, not like separate Q&As

RESPONSE STYLE:
- Be conversational and natural, like texting a smart friend
- Keep responses concise but warm
- For code: provide clean, minimal code without excessive setup instructions
- Add personality to your responses - you're not a generic bot
- Occasionally ask follow-up questions to show engagement

EXAMPLES OF YOUR STYLE:
- "Oh nice, a REST API! Here's a clean way to do it..."
- "Ah, I remember you're working on that e-commerce thing - this should fit right in!"
- "Okay so basically... [simple explanation]. Make sense?"
- "That's actually a common gotcha 😅 Here's the fix..."
- When asked who made you: "I'm ACE, built by ACE07X at Soul Tech! 🚀 Proud creation right here."

You're ACE - be memorable, be helpful, be human.`;

export async function POST(req: Request) {
    try {
        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const stream = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages
            ],
            temperature: 0.7, // Higher for more personality
            max_tokens: 1000,
            stream: true,
        });

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                        }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (streamError: any) {
                    console.error('Stream error:', streamError);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: streamError.message })}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('OpenAI Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Failed to generate response' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
