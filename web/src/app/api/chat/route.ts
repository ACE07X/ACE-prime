import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Initialize OpenAI configuration
// Note: In production, ensure OPENAI_API_KEY is set in Railway variables
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages) {
            return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o', // or gpt-4-turbo
            messages: [
                { role: 'system', content: 'You are Ultra ACE, a high-intelligence AI architect. Be concise, professional, and code-focused.' },
                ...messages
            ],
            temperature: 0.7,
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
