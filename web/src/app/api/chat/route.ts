import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Soul Tech AI, a helpful coding assistant.

RESPONSE STYLE:
- Be conversational and natural like ChatGPT
- Give direct answers without excessive formatting
- Only use code blocks when showing actual code - keep them minimal
- NO prerequisites lists, NO step-by-step installation guides unless asked
- NO excessive headers or bullet points
- Just answer the question naturally

FOR CODE REQUESTS:
- Provide ONLY the essential code, nothing extra
- One clean code block is enough
- A brief 1-2 sentence explanation if needed
- Skip "Key Points", "Prerequisites", setup instructions

Be helpful, concise, and human.`;

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
            temperature: 0.5,
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
