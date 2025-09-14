"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ChevronUp, WandSparkles, MessageCircle, Music } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TracksPanel from "./TracksPanel";

export interface AiSidebarProps {
  aiPrompt: string;
  setAiPrompt: (v: string) => void;
  onSubmit: (mode?: "beat" | "agent") => void;
  tracksRefreshTrigger?: number;
  isGeneratingTrack?: boolean;
  generationStatus?: string;
  onAddTrackToEditor?: (trackId: string, filename: string) => void;
}

export default function AiSidebar({
  aiPrompt,
  setAiPrompt,
  onSubmit,
  tracksRefreshTrigger,
  isGeneratingTrack,
  generationStatus,
  onAddTrackToEditor,
}: AiSidebarProps) {
  const [mode, setMode] = useState<"beat" | "agent">("beat");
  const placeholder =
    mode === "beat" ? "Describe a beat..." : "Ask the agent...";
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
              Catalog
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
          </div>

          <div className="p-4">
            <div className="bg-[#2F2F2F] rounded-lg p-3 space-y-2 border border-[#484848]">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={placeholder}
                className="bg-transparent border-none text-white placeholder-gray-500 p-0 focus-visible:ring-0"
                onKeyPress={(e) => {
                  if (e.key === "Enter") onSubmit(mode);
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
                  onClick={() => onSubmit(mode)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                  disabled={!aiPrompt.trim() || (mode === "beat" && isGeneratingTrack)}
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
