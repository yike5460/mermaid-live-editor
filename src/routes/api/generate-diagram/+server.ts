import { Ai } from '@cloudflare/ai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface CloudflarePlatform {
    env?: {
        AI?: unknown;
    };
}

// Mock AI response for development
const mockAiResponse = (prompt: string) => {
    // Create a simple flowchart based on the prompt
    return `flowchart TD
    A[Start] --> B{Process}
    B -- Yes --> C[Success]
    B -- No --> D[Error]
    C --> E[End]
    D --> E`;
};

// Clean up the AI response to ensure valid Mermaid syntax
const cleanMermaidCode = (code: string): string => {
    // Remove markdown code block markers if present
    code = code.replace(/```mermaid\n?/g, '');
    code = code.replace(/```\n?/g, '');

    // Remove any leading/trailing whitespace
    code = code.trim();

    // Ensure the code starts with a valid diagram type
    const validTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap'];
    const hasValidStart = validTypes.some(type => code.startsWith(type));

    if (!hasValidStart) {
        // Default to flowchart if no valid type is found
        code = 'flowchart TD\n' + code;
    }

    return code;
};

export const POST: RequestHandler = async ({ request, platform }) => {
    try {
        const { prompt, systemPrompt } = await request.json();

        if (!prompt) {
            return new Response('Prompt is required', { status: 400 });
        }

        // Check if we're in development environment
        const cfPlatform = platform as CloudflarePlatform;
        const isDev = !cfPlatform?.env?.AI;

        let mermaidCode: string;

        if (isDev) {
            // Use mock response in development
            console.log('Using mock AI response in development');
            mermaidCode = mockAiResponse(prompt);
        } else {
            try {
                // Use actual Cloudflare AI in production
                const ai = new Ai(cfPlatform.env!.AI);

                // First try with @cf/meta/llama-2-7b-chat-int8 model
                const result = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 1000,
                    temperature: 0.2
                });

                const response = result as any;
                const rawCode = response.response || response;
                mermaidCode = cleanMermaidCode(rawCode);
            } catch (aiError) {
                console.error('Error with primary model, falling back to mock:', aiError);
                // Fallback to mock response if AI service fails
                mermaidCode = mockAiResponse(prompt);
            }
        }

        return json({ mermaidCode });
    } catch (error) {
        console.error('Error generating diagram:', error);
        // Return a more specific error message
        return json({
            error: 'Failed to generate diagram. Please try again or contact support if the issue persists.',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        });
    }
}; 