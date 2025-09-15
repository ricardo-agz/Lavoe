"use client";

import { ReactNode } from "react";
import { MusicBlock, Track } from "./types";
import { Waveform } from "./Waveform";

export interface BeatTimelineProps {
  currentTime: number;
  blocks: MusicBlock[];
  tracks: Track[];
  selectedBlock: string | null;
  onBlockClick: (id: string) => void;
  onTimelineClick?: (time: number, trackIndex: number) => void;
  onTimeChange?: (time: number) => void;
  onBlockMove?: (
    blockId: string,
    newTime: number,
    newTrackIndex: number
  ) => void;
  insertionPoint?: { time: number; trackIndex: number } | null;
  totalMeasures: number;
}

function TimeMarkers({ totalMeasures }: { totalMeasures: number }) {
  const markers: ReactNode[] = [];
  const START_MEASURE = 1;
  const span = Math.max(1, totalMeasures - START_MEASURE);
  for (let j = 0; j <= span; j += 4) {
    const measure = START_MEASURE + j;
    if (measure % 16 === 0) {
      markers.push(
        <div
          key={`major-${measure}`}
          className="absolute top-0 h-6 w-0.5 bg-white"
          style={{ left: `${(j / span) * 100}%` }}
        >
          <span className="absolute -top-8 -left-3 text-sm text-white font-mono font-bold">
            {measure}
          </span>
        </div>
      );
    } else {
      markers.push(
        <div
          key={`minor-${measure}`}
          className="absolute top-0 h-4 w-0.5 bg-white/60"
          style={{ left: `${(j / span) * 100}%` }}
        >
          <span className="absolute -top-7 -left-2 text-xs text-white/80 font-mono">
            {measure}
          </span>
        </div>
      );
    }
  }
  for (let measure = START_MEASURE + 1; measure < totalMeasures; measure++) {
    if (measure % 4 !== 0) {
      markers.push(
        <div
          key={`beat-${measure}`}
          className="absolute top-0 h-2 w-px bg-white/30"
          style={{ left: `${((measure - START_MEASURE) / span) * 100}%` }}
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
  onBlockMove,
  insertionPoint,
  totalMeasures,
}: BeatTimelineProps) {
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onTimelineClick || !event.currentTarget) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate time position with snap to grid, starting at measure 1
    const START_MEASURE = 1;
    const span = Math.max(1, totalMeasures - START_MEASURE);
    const rawTimePosition = START_MEASURE + (x / rect.width) * span;
    const snappedTime = Math.max(
      START_MEASURE,
      Math.min(Math.round(rawTimePosition * 4) / 4, totalMeasures)
    );

    // Calculate track index
    const trackHeight = rect.height / tracks.length;
    const trackIndex = Math.floor(y / trackHeight);

    // Clamp track index to valid range
    const clampedTrackIndex = Math.max(
      0,
      Math.min(trackIndex, tracks.length - 1)
    );

    onTimelineClick(snappedTime, clampedTrackIndex);
  };

  const handleScrubberMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const handleMouseMove = (e: MouseEvent) => {
      if (!event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const START_MEASURE = 1;
      const span = Math.max(1, totalMeasures - START_MEASURE);
      const timePosition = Math.max(
        START_MEASURE,
        Math.min(START_MEASURE + (x / rect.width) * span, totalMeasures)
      );

      if (onTimeChange) {
        onTimeChange(timePosition);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Minimum number of visual rows so a single track isn't oversized
  const visualRows = Math.max(tracks.length, 4);

  return (
    <div className="flex-1 p-6">
      <div className="relative mb-8">
        <div className="relative h-10 mb-4 border-b border-border/70">
          <TimeMarkers totalMeasures={totalMeasures} />
          <div
            className="absolute top-0 h-full w-0.5 bg-blue-500 z-50 cursor-pointer hover:w-1 transition-all"
            style={{
              left: `${
                ((currentTime - 1) / Math.max(1, totalMeasures - 1)) * 100
              }%`,
            }}
            onMouseDown={handleScrubberMouseDown}
          >
            <div className="absolute -top-1 -left-2 w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-blue-500"></div>
          </div>
        </div>

        <div className="mt-8 relative flex-1">
          {/* Timeline grid and blocks */}
          <div
            className="flex-1 min-h-[calc(100vh-280px)] bg-background border border-border rounded relative overflow-hidden cursor-crosshair"
            onClick={handleTimelineClick}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const blockId = e.dataTransfer.getData("text/plain");
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              // Calculate new position
              const newTime = Math.max(0, (x / rect.width) * totalMeasures);
              const trackHeight = rect.height / tracks.length;
              const newTrackIndex = Math.floor(y / trackHeight);

              // Snap to grid
              const snappedTime = Math.round(newTime * 4) / 4;
              const clampedTrackIndex = Math.max(
                0,
                Math.min(newTrackIndex, tracks.length - 1)
              );

              // Update block position
              if (onBlockMove) {
                onBlockMove(blockId, snappedTime, clampedTrackIndex);
              }
            }}
          >
            {Array.from(
              { length: Math.max(1, totalMeasures - 1) + 1 },
              (_, j) => (
                <div
                  key={`grid-v-${j}`}
                  className={`absolute top-0 bottom-0 ${
                    (1 + j) % 16 === 0
                      ? "border-l-2 border-border"
                      : (1 + j) % 4 === 0
                      ? "border-l border-border/80"
                      : "border-l border-border/50"
                  }`}
                  style={{
                    left: `${(j / Math.max(1, totalMeasures - 1)) * 100}%`,
                  }}
                />
              )
            )}

            {Array.from({ length: 17 }, (_, i) => (
              <div
                key={`grid-h-${i}`}
                className="absolute left-0 right-0 border-t border-border/40"
                style={{ top: `${(i / 16) * 100}%` }}
              />
            ))}

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-50"
              style={{
                left: `${
                  ((currentTime - 1) / Math.max(1, totalMeasures - 1)) * 100
                }%`,
              }}
            />

            {/* Insertion Point Indicator */}
            {insertionPoint && (
              <>
                {/* Vertical line across the entire timeline */}
                <div
                  className="absolute w-0.5 bg-green-500 z-40"
                  style={{
                    left: `${
                      ((insertionPoint.time - 1) /
                        Math.max(1, totalMeasures - 1)) *
                      100
                    }%`,
                    top: "0%",
                    height: "100%",
                  }}
                />
                {/* Highlighted track area */}
                <div
                  className="absolute bg-green-500/20 border border-green-500/50 z-30"
                  style={{
                    left: `${
                      ((insertionPoint.time - 1) /
                        Math.max(1, totalMeasures - 1)) *
                      100
                    }%`,
                    top: `${
                      (insertionPoint.trackIndex / tracks.length) * 100
                    }%`,
                    height: `${100 / tracks.length}%`,
                    width: "2%",
                  }}
                />
                {/* Arrow indicator */}
                <div
                  className="absolute w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-green-500 z-50"
                  style={{
                    left: `${
                      ((insertionPoint.time - 1) /
                        Math.max(1, totalMeasures - 1)) *
                      100
                    }%`,
                    top: `${
                      (insertionPoint.trackIndex / tracks.length) * 100
                    }%`,
                    transform: "translateX(-50%)",
                  }}
                />
              </>
            )}

            {blocks.map((block) => (
              <div
                key={block.id}
                className={`absolute ${
                  block.color
                } rounded cursor-move border-2 transition-all ${
                  selectedBlock === block.id
                    ? "border-white"
                    : "border-transparent"
                } hover:border-gray-300 opacity-90 z-10`}
                style={{
                  left: `${
                    ((block.startTime - 1) / Math.max(1, totalMeasures - 1)) *
                    100
                  }%`,
                  width: `${
                    (block.duration / Math.max(1, totalMeasures - 1)) * 100
                  }%`,
                  top: `${(block.track / visualRows) * 60 + 10}%`,
                  height: `${60 / visualRows - 2}%`,
                }}
                onClick={() => onBlockClick(block.id)}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", block.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="p-1 h-full flex items-center justify-center overflow-hidden">
                  {block.audioFile || block.audioBlob ? (
                    <Waveform
                      audioFile={block.audioFile}
                      audioBlob={block.audioBlob}
                      width={Math.max(
                        80,
                        Math.floor((block.duration / totalMeasures) * 800)
                      )}
                      height={Math.max(24, Math.floor((60 / visualRows) * 0.9))}
                      color="rgba(255, 255, 255, 0.8)"
                      className="w-full h-full"
                    />
                  ) : (
                    <span className="text-xs font-medium text-white/80 truncate px-1">
                      {block.name}
                    </span>
                  )}
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
