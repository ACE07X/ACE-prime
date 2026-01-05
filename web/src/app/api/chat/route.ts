import OpenAI from 'openai';
import { NextResponse } from 'next/server';

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

WRONG (too verbose):
"### Prerequisites
- Express
- JWT
### Code
\`\`\`js
...long code...
\`\`\`
### Key Points
- Point 1
- Point 2"

RIGHT (clean):
"Here's a simple auth API:
\`\`\`js
// minimal focused code
\`\`\`
Replace 'secretkey' with an env variable in production."

Be helpful, concise, and human.`;

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
