"use client";

import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw, Square } from "lucide-react";

export interface BeatHeaderProps {
  bpm: number;
  isPlaying: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export default function BeatHeader({
  bpm,
  isPlaying,
  onStart,
  onStop,
  onReset,
}: BeatHeaderProps) {
  return (
    <div className="p-6 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Lavoe</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-gray-400">02:25</span>
          <Button
            onClick={isPlaying ? onStop : onStart}
            size="lg"
            className="bg-white text-black hover:bg-gray-200"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>
          <Button onClick={onStop} variant="outline" size="lg">
            <Square className="w-5 h-5" />
          </Button>
          <Button onClick={onReset} variant="outline" size="lg">
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="lg">
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
