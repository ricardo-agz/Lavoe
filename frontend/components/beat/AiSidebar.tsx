"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ChevronUp, WandSparkles, MessageCircle, Music } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TracksPanel from "./TracksPanel";
import { useChat } from '@ai-sdk/react';
import { openai } from '@ai-sdk/openai';
import { MusicBlock } from './types';
import { DefaultChatTransport } from "ai";

export interface AiSidebarProps {
  aiPrompt: string;
  setAiPrompt: (v: string) => void;
  onSubmit: (mode?: "beat" | "agent") => void;
  tracksRefreshTrigger?: number;
  isGeneratingTrack?: boolean;
  generationStatus?: string;
  onAddTrackToEditor?: (trackId: string, filename: string) => void;
  blocks?: MusicBlock[];
  onBlockMove?: (blockId: string, newTime: number) => void;
  onAddChopsToEditor?: (chops: any[], originalTrackName: string) => void;
}

export default function AiSidebar({
  aiPrompt,
  setAiPrompt,
  onSubmit,
  tracksRefreshTrigger,
  isGeneratingTrack,
  generationStatus,
  onAddTrackToEditor,
  blocks = [],
  onBlockMove,
  onAddChopsToEditor,
}: AiSidebarProps) {
  const [mode, setMode] = useState<"beat" | "agent">("beat");
  const placeholder =
    mode === "beat" ? "Describe a beat..." : "Ask the agent...";

  // Agent mode input state (separate from beatmaker aiPrompt)
  const [agentInput, setAgentInput] = useState("");

  // Set up client-side AI chat for Agent mode
  const { messages, sendMessage, status, error, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/agent-chat',
    }),
    onToolCall: ({ toolCall }) => {
      console.log('🔧 Tool call received:', toolCall);

      // Check if it's a dynamic tool first for proper type narrowing
      if (toolCall.dynamic) {
        return;
      }

      if (toolCall.toolName === 'moveBlock' && onBlockMove) {
        const { blockId, newStartTime } = toolCall.input as { blockId: string, newStartTime: number };
        console.log(`📦 Moving block ${blockId} to time ${newStartTime}`);

        // Execute the block move
        onBlockMove(blockId, newStartTime);

        // Add the tool result
        addToolResult({
          tool: 'moveBlock',
          toolCallId: toolCall.toolCallId,
          output: `Successfully moved block ${blockId} to time ${newStartTime} measures`,
        });
      }

      if (toolCall.toolName === 'chopAudio') {
        const { trackId, defaultLength = 1.8, minDuration = 0.2, nClusters = 6 } = toolCall.input as {
          trackId: string,
          defaultLength?: number,
          minDuration?: number,
          nClusters?: number
        };
        console.log(`🍞 Chopping audio track ${trackId}`);

        // Execute the chop audio operation
        handleChopAudio(trackId, defaultLength, minDuration, nClusters, toolCall.toolCallId);
      }
    },
    onFinish: ({ message }) => {
      console.log('✅ Chat finished:', message);
    },
    onError: (error) => {
      console.error('❌ Chat error:', error);
    },
    messages: [],
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Debug logging for status changes
  useEffect(() => {
    console.log('🎯 Chat status changed:', status);
    if (error) {
      console.error('❌ Chat error state:', error);
    }
  }, [status, error]);

  // Debug logging for messages changes
  useEffect(() => {
    console.log('💬 Messages updated:', messages);
  }, [messages]);

  // Handle chop audio operation
  const handleChopAudio = async (
    trackId: string,
    defaultLength: number,
    minDuration: number,
    nClusters: number,
    toolCallId: string
  ) => {
    try {
      console.log(`🍞 Starting chop operation for track ${trackId}`);

      // Call the backend chop endpoint
      const response = await fetch(`http://localhost:8000/process/chop-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          track_id: trackId,
          default_length: defaultLength,
          min_duration: minDuration,
          n_clusters: nClusters,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chop request failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🍞 Chop result:', result);

      // Add chops to the editor if callback is available
      if (onAddChopsToEditor && result.chop_summaries) {
        onAddChopsToEditor(result.chop_summaries, `Track ${trackId} chops`);
      }

      // Create summary for AI
      const chopCount = result.chop_summaries?.length || 0;
      const totalDuration = result.metadata?.source_track_id || 'unknown';
      const chopSummary = result.chop_summaries?.map((chop: any, index: number) =>
        `Chop ${index + 1}: ${chop.duration_seconds?.toFixed(2)}s (ID: ${chop.track_id})`
      ).join(', ') || 'No chop details available';

      const toolResult = `Successfully chopped track ${trackId} into ${chopCount} segments (total duration: ${totalDuration}s).`;

      // Add the tool result
      addToolResult({
        tool: 'chopAudio',
        toolCallId: toolCallId,
        output: toolResult,
      });

    } catch (error) {
      console.error('❌ Error chopping audio:', error);

      // Add error result
      addToolResult({
        tool: 'chopAudio',
        toolCallId: toolCallId,
        output: `Failed to chop track ${trackId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  // Handle form submission for different modes
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "agent") {
      // Use sendMessage for agent mode
      if (agentInput.trim()) {
        console.log('📤 Sending message to agent:', agentInput);
        console.log('📊 Current blocks state:', blocks);
        console.log('🎯 Chat status before send:', status);

        sendMessage(
          {
            text: agentInput
          },
          {
            body: {
              blocks // Include current blocks state with each message
            }
          }
        );
        setAgentInput(""); // Clear input after sending
      }
    } else {
      // Use existing beat generation for beatmaker mode
      onSubmit(mode);
    }
  };
  return (
    <div className="w-80 bg-background border-l border-border flex flex-col h-full overflow-scroll">
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <div className="border-b border-border">
          <TabsList className="grid w-full grid-cols-2 bg-background rounded-none h-12">
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-muted flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="tracks"
              className="data-[state=active]:bg-muted flex items-center gap-2"
            >
              <Music className="w-4 h-4" />
              Tracks
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 m-0 flex flex-col min-h-0">
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {generationStatus && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  {isGeneratingTrack && (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {generationStatus}
                </div>
              </div>
            )}

            {/* Show agent chat messages when in agent mode */}
            {mode === "agent" && messages.length > 0 && (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500/20 border border-blue-500/30 ml-8'
                        : 'bg-gray-500/20 border border-gray-500/30 mr-8'
                    }`}
                  >
                    <div className="text-sm text-gray-300 font-medium mb-1">
                      {message.role === 'user' ? 'You' : 'Lavoe Agent'}
                    </div>
                    <div className="text-white text-sm space-y-2">
                      {message.parts?.map((part: any, index: number) => {
                        switch (part.type) {
                          case 'text':
                            return (
                              <div key={index}>
                                {part.text}
                              </div>
                            );
                          case 'tool-moveBlock':
                            switch (part.state) {
                              case 'input-streaming':
                                return (
                                  <div key={index} className="text-yellow-400">
                                    🔧 Preparing to move block...
                                  </div>
                                );
                              case 'input-available':
                                return (
                                  <div key={index} className="text-yellow-400">
                                    🔧 Moving block "{part.input.blockId}" to measure {part.input.newStartTime}...
                                  </div>
                                );
                              case 'output-available':
                                return (
                                  <div key={index} className="text-green-400">
                                    ✅ {part.output}
                                  </div>
                                );
                              case 'output-error':
                                return (
                                  <div key={index} className="text-red-400">
                                    ❌ Error: {part.errorText}
                                  </div>
                                );
                            }
                            break;
                          case 'tool-chopAudio':
                            switch (part.state) {
                              case 'input-streaming':
                                return (
                                  <div key={index} className="text-yellow-400">
                                    🍞 Preparing to chop audio...
                                  </div>
                                );
                              case 'input-available':
                                return (
                                  <div key={index} className="text-yellow-400">
                                    🍞 Chopping track "{part.input.trackId}" (length: {part.input.defaultLength}s, clusters: {part.input.nClusters})...
                                  </div>
                                );
                              case 'output-available':
                                return (
                                  <div key={index} className="text-green-400">
                                    ✅ {part.output}
                                  </div>
                                );
                              case 'output-error':
                                return (
                                  <div key={index} className="text-red-400">
                                    ❌ Error: {part.errorText}
                                  </div>
                                );
                            }
                            break;
                          case 'step-start':
                            return index > 0 ? (
                              <div key={index} className="border-t border-gray-600 pt-2 mt-2" />
                            ) : null;
                          default:
                            return null;
                        }
                      })}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="bg-gray-500/20 border border-gray-500/30 mr-8 p-3 rounded-lg">
                    <div className="text-sm text-gray-300 font-medium mb-1">Lavoe Agent</div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4">
            <form onSubmit={handleFormSubmit}>
              <div className="bg-[#2F2F2F] rounded-lg p-3 space-y-2 border border-[#484848]">
                <Input
                  value={mode === "agent" ? agentInput : aiPrompt}
                  onChange={(e) => {
                    if (mode === "agent") {
                      setAgentInput(e.target.value);
                    } else {
                      setAiPrompt(e.target.value);
                    }
                  }}
                  placeholder={placeholder}
                  className="bg-transparent border-none text-white placeholder-gray-500 p-0 focus-visible:ring-0"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFormSubmit(e);
                    }
                  }}
                />

              {/* Submit Footer with drop-up mode switch */}
              <div className="flex items-center justify-between">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    {mode === "beat" ? (
                      <div className="flex items-center gap-1">
                        <WandSparkles className="w-4 h-4" />
                        <span className="text-xs">Beatmaker</span>
                        <ChevronUp className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <ArrowUp className="w-4 h-4" />
                        <span className="text-xs">Agent</span>
                        <ChevronUp className="w-3 h-3" />
                      </div>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="start"
                    sideOffset={6}
                    className="bg-[#2F2F2F] border-[#484848]"
                  >
                    <DropdownMenuItem onClick={() => setMode("beat")}>
                      <WandSparkles className="w-4 h-4" />
                      <span>Beatmaker</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMode("agent")}>
                      <ArrowUp className="w-4 h-4" />
                      <span>Agent</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                  disabled={
                    (mode === "agent" && (!agentInput.trim() || isLoading)) ||
                    (mode === "beat" && (!aiPrompt.trim() || isGeneratingTrack))
                  }
                  aria-label={
                    mode === "beat" ? "Submit to beatmaker" : "Submit to agent"
                  }
                  title={
                    mode === "beat" ? "Submit to beatmaker" : "Submit to agent"
                  }
                >
                  {mode === "beat" ? (
                    <WandSparkles className="w-4 h-4" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="tracks" className="flex-1 m-0 flex flex-col min-h-0">
          <TracksPanel
            refreshTrigger={tracksRefreshTrigger}
            onAddToEditor={onAddTrackToEditor}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
