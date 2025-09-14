import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { cohere } from '@ai-sdk/cohere';
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

// Tool for chopping audio tracks (client-side only)
const chopAudio = tool({
  description: 'Chop an audio track into segments based on onset detection. Creates multiple new blocks from the original track. Very useful for creating drum loops or breaking down complex audio. Automatically picks representative chops from each cluster.',
  inputSchema: z.object({
    trackId: z.string().describe('The ID of the track to chop'),
    defaultLength: z.number().min(0.1).max(10).default(1.8).describe('Default length for chops in seconds (default: 1.8)'),
    minDuration: z.number().min(0.05).max(2).default(0.2).describe('Minimum duration for chops in seconds (default: 0.2)'),
    nClusters: z.number().min(1).max(20).default(3).describe('Number of clusters for grouping similar chops (default: 3)'),
    maxChops: z.number().min(1).max(50).default(6).describe('Maximum number of chops to return, picks best representatives from each cluster (default: 6)'),
  }),
  // No execute function - this is handled client-side
});

export async function POST(req: NextRequest) {
  console.log("POST request received")
  try {
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    const { messages, blocks, model = 'gpt-4o-mini' } = body;

    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages:", messages);
      return new Response('Invalid messages format', { status: 400 });
    }

    // Include current blocks state in the system prompt so the AI knows what's available
    const blocksContext = blocks && blocks.length > 0 ? `
Current blocks in the timeline:
${blocks.map((block: any) => `- Block "${block.name}" (ID: ${block.id}) at time ${block.startTime} measures, duration ${block.duration} measures, track index ${block.track}${block.trackId ? `, track ID: ${block.trackId}` : ''}`).join('\n')}
` : 'No blocks currently in the timeline.';

    // Select the appropriate model provider based on the requested model
    let selectedModel;
    switch (model) {
      case 'gemini-2.5-flash':
        selectedModel = google('gemini-2.5-flash');
        break;
      case 'command-a-03-2025':
        selectedModel = cohere('command-a-03-2025');
        break;
      case 'gpt-4o-mini':
      default:
        selectedModel = openai('gpt-4o-mini');
        break;
    }

    const result = await streamText({
      model: selectedModel,
      messages: convertToModelMessages(messages),
      tools: {
        moveBlock,
        chopAudio,
      },
      system: `You are Lavoe Agent, an AI assistant specialized in editing and arranging music compositions. You can help users rearrange their music by moving blocks around the timeline.

**Current Timeline State:**
${blocksContext}

**Available Tools:**
1. **Move Block** - Move any block to a new start time position on the timeline
2. **Chop Audio** - Chop an audio track into segments based on onset detection, automatically adding the chops to the timeline

**Instructions:**
- Help users rearrange their music composition by moving blocks
- Use chopAudio to break down complex audio into manageable segments (use the track ID, not track index)
- Always refer to blocks by their name and ID for clarity
- When suggesting moves, consider musical timing and structure
- Explain your reasoning for block placement suggestions
- Be conversational and helpful with music arrangement advice
- Timeline is measured in measures (beats), with each measure representing a musical unit
- Always confirm the action you're taking when moving or chopping blocks
- When chopping audio, explain what you're doing and why the parameters were chosen (default: 6 max chops, 3 clusters)
- For chopAudio tool, use the track ID (not track index) from the block information

**Examples of what you can help with:**
- "Move the drums to start at measure 8"
- "Chop the main track into segments"
- "Place the melody after the bass line"
- "Rearrange the composition to have a better flow"
- "Break down this audio and arrange the pieces"

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