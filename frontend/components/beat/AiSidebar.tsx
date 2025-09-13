"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ChevronUp, WandSparkles } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AiSidebarProps {
  aiPrompt: string;
  setAiPrompt: (v: string) => void;
  onSubmit: () => void;
}

export default function AiSidebar({
  aiPrompt,
  setAiPrompt,
  onSubmit,
}: AiSidebarProps) {
  const [mode, setMode] = useState<"beat" | "agent">("beat");
  const placeholder =
    mode === "beat" ? "Describe a beat..." : "Ask the agent...";
  return (
    <div className="w-80 bg-background border-l border-border flex flex-col h-full">
      <div className="flex-1 p-4 space-y-4 overflow-y-auto"></div>

      <div className="p-4">
        <div className="bg-[#2F2F2F] rounded-lg p-3 space-y-2 border border-[#484848]">
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={placeholder}
            className="bg-transparent border-none text-white placeholder-gray-500 p-0 focus-visible:ring-0"
            onKeyPress={(e) => {
              if (e.key === "Enter") onSubmit();
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
              onClick={onSubmit}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              disabled={!aiPrompt.trim()}
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
    </div>
  );
}
