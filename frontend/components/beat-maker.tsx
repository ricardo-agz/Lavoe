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
  const [insertionPoint, setInsertionPoint] = useState<{time: number, trackIndex: number} | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

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
      
      // Start playing all track audio that should be playing at current time
      tracks.forEach(track => {
        if ((track.audioFile || track.audioBlob) && !track.muted) {
          const audioElement = trackAudioRefs.current.get(track.id);
          if (audioElement && audioElement.duration && isFinite(audioElement.duration)) {
            const targetTime = (currentTime / TIMELINE_MEASURES) * audioElement.duration;
            if (isFinite(targetTime) && targetTime >= 0) {
              audioElement.currentTime = targetTime;
            }
            audioElement.volume = track.volume / 100;
            audioElement.play().catch(console.error);
          }
        }
      });
      
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
    
    // Pause all track audio
    trackAudioRefs.current.forEach(audioElement => {
      audioElement.pause();
    });
  };

  const resetPlayback = () => {
    stopPlayback();
    setCurrentTime(0);
    
    // Reset all track audio to beginning
    trackAudioRefs.current.forEach(audioElement => {
      if (audioElement.duration && isFinite(audioElement.duration)) {
        audioElement.currentTime = 0;
      }
    });
  };

  const handleBlockClick = (blockId: string) => {
    setSelectedBlock(selectedBlock === blockId ? null : blockId);
  };

  const generateAIComponent = () => {
    if (!aiPrompt.trim()) return;

    // Simulate AI generation
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

  const addTrack = () => {
    const trackColors = [
      "bg-blue-600",
      "bg-cyan-500", 
      "bg-violet-600",
      "bg-pink-500",
      "bg-emerald-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-purple-500"
    ];
    
    const trackNames = [
      "Melody",
      "Bass", 
      "Drums",
      "Percussion",
      "Lead",
      "Pad",
      "Arp",
      "FX",
      "Vocals",
      "Strings"
    ];
    
    const newTrack: Track = {
      id: `track-${Date.now()}`,
      name: trackNames[tracks.length % trackNames.length],
      color: trackColors[tracks.length % trackColors.length],
      muted: false,
      volume: 75,
    };
    
    setTracks((prev) => [...prev, newTrack]);
  };

  const handleFileUpload = (file: File) => {
    // Create a track from the uploaded file
    const trackColors = [
      "bg-blue-600",
      "bg-cyan-500", 
      "bg-violet-600",
      "bg-pink-500",
      "bg-emerald-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-purple-500"
    ];
    
    // Extract filename without extension for track name
    const fileName = file.name.split('.')[0];
    const trackId = `track-${Date.now()}`;
    
    const newTrack: Track = {
      id: trackId,
      name: fileName,
      color: trackColors[tracks.length % trackColors.length],
      muted: false,
      volume: 75,
      audioFile: file, // Store the file reference
    };
    
    setTracks((prev) => [...prev, newTrack]);
    
    // Create audio element for timeline playback
    const audioElement = new Audio(URL.createObjectURL(file));
    audioElement.loop = false;
    audioElement.preload = 'metadata';
    trackAudioRefs.current.set(trackId, audioElement);
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    // Create a track from the recorded audio
    const trackColors = [
      "bg-blue-600",
      "bg-cyan-500", 
      "bg-violet-600",
      "bg-pink-500",
      "bg-emerald-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-purple-500"
    ];
    
    const trackName = `Recording ${tracks.length + 1}`;
    const trackColor = trackColors[tracks.length % trackColors.length];
    const trackId = `track-${Date.now()}`;
    
    const newTrack: Track = {
      id: trackId,
      name: trackName,
      color: trackColor,
      muted: false,
      volume: 75,
      audioBlob: audioBlob, // Store the blob reference
    };
    
    setTracks((prev) => [...prev, newTrack]);
    
    // Create audio element for timeline playback
    const audioElement = new Audio(URL.createObjectURL(audioBlob));
    audioElement.loop = false;
    audioElement.preload = 'metadata';
    trackAudioRefs.current.set(trackId, audioElement);
    
    // If there's an insertion point, create a music block at that position
    if (insertionPoint) {
      const newBlock: MusicBlock = {
        id: `block-${Date.now()}`,
        name: trackName,
        type: "melody",
        color: trackColor,
        startTime: Math.floor(insertionPoint.time),
        duration: 8, // Default duration of 8 measures
        track: insertionPoint.trackIndex,
      };
      
      setBlocks((prev) => [...prev, newBlock]);
      setInsertionPoint(null); // Clear insertion point
    }
  };

  const handleTimelineClick = (time: number, trackIndex: number) => {
    setInsertionPoint({ time, trackIndex });
  };

  const handleTimeChange = (time: number) => {
    setCurrentTime(time);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="border-r border-border">
        <TracksSidebar
          tracks={tracks}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          onAddTrack={addTrack}
          onFileUpload={handleFileUpload}
          onRecordingComplete={handleRecordingComplete}
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
          onTimelineClick={handleTimelineClick}
          onTimeChange={handleTimeChange}
          insertionPoint={insertionPoint}
          totalMeasures={TIMELINE_MEASURES}
        />
      </div>
      <AiSidebar
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        onSubmit={generateAIComponent}
      />
    </div>
  );
}
