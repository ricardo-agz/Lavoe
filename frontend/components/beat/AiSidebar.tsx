"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUp,
  AtSign,
  Copy,
  MoreHorizontal,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  MessageSquare,
  Plus,
} from "lucide-react";

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
  return (
    <div className="w-80 bg-background border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Generate Music</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
          >
            ×
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="space-y-3">
          <div className="text-xs text-gray-500 mb-2">Thought for 3s</div>
          <div className="space-y-3">
            <p className="text-white text-sm leading-relaxed">
              I'll create a trap beat with heavy 808s and crisp hi-hats. This
              will include a punchy kick pattern and atmospheric elements.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-[#2F2F2F] rounded-lg p-3 space-y-2 border border-[#484848]">
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Plan, search, build anything"
            className="bg-transparent border-none text-white placeholder-gray-500 p-0 focus-visible:ring-0"
            onKeyPress={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button
                onClick={onSubmit}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                disabled={!aiPrompt.trim()}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
