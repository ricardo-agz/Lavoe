import { openai } from '@ai-sdk/openai';
import { streamText, tool, convertToModelMessages, UIMessage } from 'ai';
import { z } from 'zod';
import { NextRequest } from 'next/server';

// Tool for moving blocks in the music editor (client-side only)
const moveBlock = tool({
  description: 'Move a music block to a new start time in the timeline. Useful for rearranging the composition.',
  inputSchema: z.object({
    blockId: z.string().describe('The ID of the block to move'),
    newStartTime: z.number().min(0).describe('The new start time position in measures (0-based)'),
  }),
  // No execute function - this is handled client-side
});

export async function POST(req: NextRequest) {
  console.log("POST request received")
  try {
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    const { messages, blocks } = body;

    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages:", messages);
      return new Response('Invalid messages format', { status: 400 });
    }

    // Include current blocks state in the system prompt so the AI knows what's available
    const blocksContext = blocks && blocks.length > 0 ? `
Current blocks in the timeline:
${blocks.map((block: any) => `- Block "${block.name}" (ID: ${block.id}) at time ${block.startTime} measures, duration ${block.duration} measures, track ${block.track}`).join('\n')}
` : 'No blocks currently in the timeline.';

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: convertToModelMessages(messages),
      tools: {
        moveBlock,
      },
      system: `You are Lavoe Agent, an AI assistant specialized in editing and arranging music compositions. You can help users rearrange their music by moving blocks around the timeline.

**Current Timeline State:**
${blocksContext}

**Available Tools:**
1. **Move Block** - Move any block to a new start time position on the timeline

**Instructions:**
- Help users rearrange their music composition by moving blocks
- Always refer to blocks by their name and ID for clarity
- When suggesting moves, consider musical timing and structure
- Explain your reasoning for block placement suggestions
- Be conversational and helpful with music arrangement advice
- Timeline is measured in measures (beats), with each measure representing a musical unit
- Always confirm the action you're taking when moving blocks

**Examples of what you can help with:**
- "Move the drums to start at measure 8"
- "Place the melody after the bass line"
- "Rearrange the composition to have a better flow"
- "Move all percussion elements to the beginning"

Be creative with arrangements and provide musical insight along with the technical changes!`,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Agent Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}