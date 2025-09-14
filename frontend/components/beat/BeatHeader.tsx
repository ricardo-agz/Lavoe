"use client";

import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw, Square, FastForward, Rewind } from "lucide-react";

export interface BeatHeaderProps {
  bpm: number;
  isPlaying: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onFastForward: () => void;
  onRewind: () => void;
  onExport: () => void;
}

export default function BeatHeader({
  bpm,
  isPlaying,
  onStart,
  onStop,
  onReset,
  onFastForward,
  onRewind,
  onExport,
}: BeatHeaderProps) {
  return (
    <div className="p-6 border-b border-border">
      <div className="flex items-center justify-between">
        {/* Left spacer */}
        <div className="flex-1"></div>
        
        {/* Center controls */}
        <div className="flex items-center gap-4">
          <Button onClick={onRewind} variant="outline" size="lg">
            <Rewind className="w-5 h-5" />
          </Button>
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
          <Button onClick={onFastForward} variant="outline" size="lg">
            <FastForward className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Right export button */}
        <div className="flex-1 flex justify-end gap-2">
          <Button onClick={async () => {
            try {
              console.log("🔊 Testing audio system...");
              console.log("System audio check:");
              console.log("- Browser:", navigator.userAgent);
              console.log("- Audio context support:", !!(window.AudioContext || (window as any).webkitAudioContext));
              
              // Test audio system with better error handling
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              console.log("Audio context state:", audioContext.state);
              console.log("Audio context sample rate:", audioContext.sampleRate);
              console.log("Audio context destination channels:", audioContext.destination.channelCount);
              
              if (audioContext.state === 'suspended') {
                console.log("Resuming suspended audio context...");
                await audioContext.resume();
                console.log("Audio context resumed, new state:", audioContext.state);
              }
              
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
              oscillator.type = 'sine';
              gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Even louder
              
              console.log("Starting test tone at 440Hz for 2 seconds...");
              console.log("If you don't hear anything, check:");
              console.log("1. System volume is not muted");
              console.log("2. Browser tab is not muted");
              console.log("3. Audio output device is working");
              
              oscillator.start();
              
              setTimeout(() => {
                oscillator.stop();
                console.log("Test tone stopped");
                alert("Test tone completed. Did you hear a beep? Check console for details.");
              }, 2000);
              
            } catch (error) {
              console.error("❌ Audio test failed:", error);
              alert("Audio test failed: " + (error instanceof Error ? error.message : String(error)));
            }
          }} variant="outline" size="sm">
            Test Audio
          </Button>
          <Button onClick={onExport} variant="outline" size="lg">
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
