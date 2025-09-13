"use client";

import { ReactNode } from "react";
import { MusicBlock, Track } from "./types";

export interface BeatTimelineProps {
  currentTime: number;
  blocks: MusicBlock[];
  tracks: Track[];
  selectedBlock: string | null;
  onBlockClick: (id: string) => void;
  onTimelineClick?: (time: number, trackIndex: number) => void;
  onTimeChange?: (time: number) => void;
  insertionPoint?: {time: number, trackIndex: number} | null;
  totalMeasures: number;
}

function TimeMarkers({ totalMeasures }: { totalMeasures: number }) {
  const markers: ReactNode[] = [];
  for (let i = 0; i <= totalMeasures; i += 4) {
    if (i % 16 === 0) {
      markers.push(
        <div
          key={`major-${i}`}
          className="absolute top-0 h-6 w-0.5 bg-white"
          style={{ left: `${(i / totalMeasures) * 100}%` }}
        >
          <span className="absolute -top-8 -left-3 text-sm text-white font-mono font-bold">
            {i + 1}
          </span>
        </div>
      );
    } else {
      markers.push(
        <div
          key={`minor-${i}`}
          className="absolute top-0 h-4 w-0.5 bg-white/60"
          style={{ left: `${(i / totalMeasures) * 100}%` }}
        >
          <span className="absolute -top-7 -left-2 text-xs text-white/80 font-mono">
            {i + 1}
          </span>
        </div>
      );
    }
  }
  for (let i = 1; i < totalMeasures; i++) {
    if (i % 4 !== 0) {
      markers.push(
        <div
          key={`beat-${i}`}
          className="absolute top-0 h-2 w-px bg-white/30"
          style={{ left: `${(i / totalMeasures) * 100}%` }}
        />
      );
    }
  }
  return <>{markers}</>;
}

export default function BeatTimeline({
  currentTime,
  blocks,
  tracks,
  selectedBlock,
  onBlockClick,
  onTimelineClick,
  onTimeChange,
  insertionPoint,
  totalMeasures,
}: BeatTimelineProps) {
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onTimelineClick) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate time position with snap to grid
    const rawTimePosition = (x / rect.width) * totalMeasures;
    const snappedTime = Math.round(rawTimePosition * 4) / 4; // Snap to quarter beats
    
    // Calculate track index
    const trackHeight = rect.height / tracks.length;
    const trackIndex = Math.floor(y / trackHeight);
    
    // Clamp track index to valid range
    const clampedTrackIndex = Math.max(0, Math.min(trackIndex, tracks.length - 1));
    
    onTimelineClick(snappedTime, clampedTrackIndex);
  };

  const handleScrubberMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const timePosition = Math.max(0, Math.min((x / rect.width) * totalMeasures, totalMeasures));
      
      if (onTimeChange) {
        onTimeChange(timePosition);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex-1 p-6">
      <div className="relative mb-8">
        <div className="relative h-10 mb-4 border-b border-border/70">
          <TimeMarkers totalMeasures={totalMeasures} />
          <div
            className="absolute top-0 h-full w-0.5 bg-blue-500 z-50 cursor-pointer hover:w-1 transition-all"
            style={{ left: `${(currentTime / totalMeasures) * 100}%` }}
            onMouseDown={handleScrubberMouseDown}
          >
            <div className="absolute -top-1 -left-2 w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-blue-500"></div>
          </div>
        </div>

        <div className="mt-8 relative flex-1">
          <div 
            className="flex-1 min-h-[calc(100vh-280px)] bg-background border border-border rounded relative overflow-hidden cursor-crosshair"
            onClick={handleTimelineClick}
          >
            {Array.from({ length: totalMeasures + 1 }, (_, i) => (
              <div
                key={`grid-v-${i}`}
                className={`absolute top-0 bottom-0 ${
                  i % 16 === 0
                    ? "border-l-2 border-border"
                    : i % 4 === 0
                    ? "border-l border-border/80"
                    : "border-l border-border/50"
                }`}
                style={{ left: `${(i / totalMeasures) * 100}%` }}
              />
            ))}

            {Array.from({ length: 17 }, (_, i) => (
              <div
                key={`grid-h-${i}`}
                className="absolute left-0 right-0 border-t border-border/40"
                style={{ top: `${(i / 16) * 100}%` }}
              />
            ))}

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-50"
              style={{ left: `${(currentTime / totalMeasures) * 100}%` }}
            />

            {/* Insertion Point Indicator */}
            {insertionPoint && (
              <>
                {/* Vertical line across the entire timeline */}
                <div
                  className="absolute w-0.5 bg-green-500 z-40"
                  style={{
                    left: `${(insertionPoint.time / totalMeasures) * 100}%`,
                    top: '0%',
                    height: '100%',
                  }}
                />
                {/* Highlighted track area */}
                <div
                  className="absolute bg-green-500/20 border border-green-500/50 z-30"
                  style={{
                    left: `${(insertionPoint.time / totalMeasures) * 100}%`,
                    top: `${(insertionPoint.trackIndex / tracks.length) * 100}%`,
                    height: `${100 / tracks.length}%`,
                    width: '2%',
                  }}
                />
                {/* Arrow indicator */}
                <div
                  className="absolute w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-green-500 z-50"
                  style={{
                    left: `${(insertionPoint.time / totalMeasures) * 100}%`,
                    top: `${(insertionPoint.trackIndex / tracks.length) * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                />
              </>
            )}

            {blocks.map((block) => (
              <div
                key={block.id}
                className={`absolute ${
                  block.color
                } rounded cursor-pointer border-2 transition-all ${
                  selectedBlock === block.id
                    ? "border-white"
                    : "border-transparent"
                } hover:border-gray-300 opacity-90 z-10`}
                style={{
                  left: `${(block.startTime / totalMeasures) * 100}%`,
                  width: `${(block.duration / totalMeasures) * 100}%`,
                  top: `${(block.track / tracks.length) * 60 + 10}%`,
                  height: `${60 / tracks.length - 2}%`,
                }}
                onClick={() => onBlockClick(block.id)}
              >
                <div className="p-2 h-full flex items-center">
                  <span className="text-xs font-medium text-white truncate">
                    {block.name}
                  </span>
                </div>
              </div>
            ))}

            <div className="absolute top-2 left-2 text-xs text-gray-500">
              Piano Roll / MIDI Editor
            </div>
            
            {insertionPoint && (
              <div className="absolute top-2 right-2 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                Insertion point set - Record audio to place here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
