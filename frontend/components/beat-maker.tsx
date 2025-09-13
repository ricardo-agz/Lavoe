"use client";

import { useState, useRef, useEffect } from "react";
import BeatHeader from "@/components/beat/BeatHeader";
import BeatTimeline from "@/components/beat/BeatTimeline";
import AiSidebar from "@/components/beat/AiSidebar";
import { TracksSidebar } from "@/components/beat/TracksSidebar";
import { MusicBlock, Track } from "@/components/beat/types";

const initialTracks: Track[] = [
  {
    id: "track-1",
    name: "Melody",
    color: "bg-blue-600",
    muted: false,
    volume: 75,
  },
  {
    id: "track-2",
    name: "Bass",
    color: "bg-cyan-500",
    muted: false,
    volume: 75,
  },
  {
    id: "track-3",
    name: "Drums",
    color: "bg-violet-600",
    muted: false,
    volume: 75,
  },
  {
    id: "track-4",
    name: "Percussion",
    color: "bg-pink-500",
    muted: false,
    volume: 75,
  },
];

const initialBlocks: MusicBlock[] = [
  {
    id: "block-1",
    name: "Piano Melody",
    type: "melody",
    color: "bg-blue-600",
    startTime: 8,
    duration: 24,
    track: 0,
  },
  {
    id: "block-2",
    name: "Bass Line",
    type: "bass",
    color: "bg-cyan-500",
    startTime: 16,
    duration: 32,
    track: 1,
  },
  {
    id: "block-3",
    name: "Kick",
    type: "drums",
    color: "bg-violet-600",
    startTime: 0,
    duration: 4,
    track: 2,
  },
  {
    id: "block-4",
    name: "Kick",
    type: "drums",
    color: "bg-violet-600",
    startTime: 8,
    duration: 4,
    track: 2,
  },
  {
    id: "block-5",
    name: "Kick",
    type: "drums",
    color: "bg-violet-600",
    startTime: 16,
    duration: 4,
    track: 2,
  },
  {
    id: "block-6",
    name: "Kick",
    type: "drums",
    color: "bg-violet-600",
    startTime: 24,
    duration: 4,
    track: 2,
  },
  {
    id: "block-7",
    name: "Kick",
    type: "drums",
    color: "bg-violet-600",
    startTime: 32,
    duration: 4,
    track: 2,
  },
];

const TIMELINE_WIDTH = 800;
const TIMELINE_MEASURES = 64; // measures instead of seconds
const PIXELS_PER_MEASURE = TIMELINE_WIDTH / TIMELINE_MEASURES;

export default function BeatMaker() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bpm, setBpm] = useState(160);
  const [blocks, setBlocks] = useState<MusicBlock[]>(initialBlocks);
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [tracksRefreshTrigger, setTracksRefreshTrigger] = useState(0);
  const [isGeneratingTrack, setIsGeneratingTrack] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio API
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startPlayback = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 0.25; // quarter beat increments
          return newTime >= TIMELINE_MEASURES ? 0 : newTime;
        });
      }, (60 / bpm / 4) * 1000); // quarter note timing based on BPM
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetPlayback = () => {
    stopPlayback();
    setCurrentTime(0);
  };

  const handleBlockClick = (blockId: string) => {
    setSelectedBlock(selectedBlock === blockId ? null : blockId);
  };

  const generateAIComponent = async (mode: "beat" | "agent" = "beat") => {
    if (!aiPrompt.trim()) return;

    if (mode === "beat") {
      // Handle Beatmaker mode - generate actual tracks
      await generateBeatovenTrack(aiPrompt);
    } else {
      // Handle Agent mode - simulate AI generation (existing behavior)
      const newBlock: MusicBlock = {
        id: `ai-block-${Date.now()}`,
        name: aiPrompt,
        type: "melody",
        color: "bg-emerald-500",
        startTime: Math.floor(Math.random() * 48),
        duration: 8 + Math.floor(Math.random() * 16),
        track: Math.floor(Math.random() * tracks.length),
      };

      setBlocks((prev) => [...prev, newBlock]);
      setAiPrompt("");
    }
  };

  const generateBeatovenTrack = async (prompt: string) => {
    try {
      setIsGeneratingTrack(true);
      setGenerationStatus("Starting track generation...");

      // Start track generation
      const response = await fetch("http://localhost:8000/start_track_generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: { text: prompt },
          format: "mp3",
          looping: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start track generation");
      }

      const result = await response.json();
      const taskId = result.task_id;

      setAiPrompt("");
      setGenerationStatus("Track generation in progress...");

      // Start polling for completion
      pollForTrackCompletion(taskId, prompt);

    } catch (error) {
      console.error("Error generating track:", error);
      setIsGeneratingTrack(false);
      setGenerationStatus("");
    }
  };

  const pollForTrackCompletion = async (taskId: string, originalPrompt: string) => {
    const maxAttempts = 60; // 10 minutes max (60 * 10 seconds)
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;

        const response = await fetch(`http://localhost:8000/get_generated_track?task_id=${taskId}`);

        if (!response.ok) {
          throw new Error("Failed to check track status");
        }

        const result = await response.json();

        if (result.status === "composed") {
          // Track generation completed - the tracks are now stored in our system
          console.log("Track generation completed:", result);
          setGenerationStatus("Track generation completed! Check the Tracks tab.");
          setIsGeneratingTrack(false);
          // Trigger tracks refresh
          setTracksRefreshTrigger(prev => prev + 1);

          // Clear status after a few seconds
          setTimeout(() => {
            setGenerationStatus("");
          }, 5000);

          return;
        } else if (result.status === "running" || result.status === "composing") {
          // Still processing
          setGenerationStatus(`Track generation in progress... (${attempts}/${maxAttempts})`);
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000); // Poll every 10 seconds
          } else {
            console.error("Track generation timed out");
            setGenerationStatus("Track generation timed out. Please try again.");
            setIsGeneratingTrack(false);
            setTimeout(() => {
              setGenerationStatus("");
            }, 5000);
          }
        } else {
          // Unknown status or error
          console.error("Unexpected track generation status:", result.status);
          setGenerationStatus(`Unexpected status: ${result.status}`);
          setIsGeneratingTrack(false);
          setTimeout(() => {
            setGenerationStatus("");
          }, 5000);
        }
      } catch (error) {
        console.error("Error polling track status:", error);
        setGenerationStatus("Error checking track status. Retrying...");
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Retry after 10 seconds
        } else {
          setIsGeneratingTrack(false);
          setGenerationStatus("Failed to check track status. Please try again.");
          setTimeout(() => {
            setGenerationStatus("");
          }, 5000);
        }
      }
    };

    // Start polling
    poll();
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleVolumeChange = (trackId: string, volume: number) => {
    setTracks(
      tracks.map((track) =>
        track.id === trackId ? { ...track, volume } : track
      )
    );
  };

  const handleMuteToggle = (trackId: string) => {
    setTracks(
      tracks.map((track) =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      )
    );
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="border-r border-border">
        <TracksSidebar
          tracks={tracks}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <BeatHeader
          bpm={bpm}
          isPlaying={isPlaying}
          onStart={startPlayback}
          onStop={stopPlayback}
          onReset={resetPlayback}
        />
        <BeatTimeline
          currentTime={currentTime}
          blocks={blocks}
          tracks={tracks}
          selectedBlock={selectedBlock}
          onBlockClick={handleBlockClick}
          totalMeasures={TIMELINE_MEASURES}
        />
      </div>
      <AiSidebar
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        onSubmit={generateAIComponent}
        tracksRefreshTrigger={tracksRefreshTrigger}
        isGeneratingTrack={isGeneratingTrack}
        generationStatus={generationStatus}
      />
    </div>
  );
}
