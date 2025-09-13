"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AudioUpload } from "./audio-upload"
import { AudioPlayer } from "./audio-player"
import { AiChat } from "./ai-chat"
import { useAudioProcessing } from "@/hooks/use-audio-processing"
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
} from "lucide-react"

interface MusicBlock {
  id: string
  name: string
  type: "melody" | "bass" | "drums" | "percussion"
  color: string
  startTime: number
  duration: number
  track: number
  audioData?: string // Base64 audio data for the block
}

interface Track {
  id: string
  name: string
  color: string
  muted: boolean
  volume: number
}

const initialTracks: Track[] = [
  { id: "track-1", name: "Melody", color: "bg-blue-600", muted: false, volume: 75 },
  { id: "track-2", name: "Bass", color: "bg-cyan-500", muted: false, volume: 75 },
  { id: "track-3", name: "Drums", color: "bg-violet-600", muted: false, volume: 75 },
  { id: "track-4", name: "Percussion", color: "bg-pink-500", muted: false, volume: 75 },
]

const TIMELINE_WIDTH = 800
const TIMELINE_MEASURES = 64
const PIXELS_PER_MEASURE = TIMELINE_WIDTH / TIMELINE_MEASURES

export default function BeatMaker() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [bpm, setBpm] = useState(160)
  const [blocks, setBlocks] = useState<MusicBlock[]>([])
  const [tracks, setTracks] = useState<Track[]>(initialTracks)
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [uploadedAudio, setUploadedAudio] = useState<{
    data: string
    filename: string
  } | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { isProcessing, chopAudio } = useAudioProcessing()

  const startPlayback = () => {
    if (!isPlaying) {
      setIsPlaying(true)
      intervalRef.current = setInterval(
        () => {
          setCurrentTime((prev) => {
            const newTime = prev + 0.25
            return newTime >= TIMELINE_MEASURES ? 0 : newTime
          })
        },
        (60 / bpm / 4) * 1000,
      )
    }
  }

  const stopPlayback = () => {
    setIsPlaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const resetPlayback = () => {
    stopPlayback()
    setCurrentTime(0)
  }

  const handleAudioUploaded = (audioData: string, filename: string) => {
    setUploadedAudio({ data: audioData, filename })
  }

  const handleAudioProcess = async (prompt: string) => {
    if (!uploadedAudio) {
      throw new Error('Please upload an audio file first')
    }

    const lowerPrompt = prompt.toLowerCase()

    if (lowerPrompt.includes('chop') || lowerPrompt.includes('segment') || lowerPrompt.includes('beat')) {
      // Chop audio and add to timeline
      const result = await chopAudio(uploadedAudio.data, uploadedAudio.filename, {
        default_length: lowerPrompt.includes('short') ? 1.0 : 1.8,
        n_clusters: 6,
      })

      // Convert chops to music blocks
      const newBlocks: MusicBlock[] = result.chops.map((chop, index) => ({
        id: `chop-${chop.id}`,
        name: `Chop ${index + 1}`,
        type: "drums" as const,
        color: `bg-emerald-${500 + (chop.cluster_label || 0) * 100}`,
        startTime: index * 4, // Space them out every 4 measures
        duration: Math.max(2, Math.min(8, chop.duration * 4)), // Convert to measures
        track: chop.cluster_label || 0,
        audioData: chop.audio_data,
      }))

      setBlocks(prev => [...prev, ...newBlocks])
    } else {
      throw new Error('Try asking me to "chop this into beats" or "segment this audio"')
    }
  }

  const generateTimeMarkers = () => {
    const markers = []
    for (let i = 0; i <= TIMELINE_MEASURES; i += 4) {
      if (i % 16 === 0) {
        markers.push(
          <div
            key={`major-${i}`}
            className="absolute top-0 h-6 w-0.5 bg-white"
            style={{ left: `${(i / TIMELINE_MEASURES) * 100}%` }}
          >
            <span className="absolute -top-8 -left-3 text-sm text-white font-mono font-bold">{i}</span>
          </div>,
        )
      } else {
        markers.push(
          <div
            key={`minor-${i}`}
            className="absolute top-0 h-4 w-0.5 bg-white/60"
            style={{ left: `${(i / TIMELINE_MEASURES) * 100}%` }}
          >
            <span className="absolute -top-7 -left-2 text-xs text-white/80 font-mono">{i}</span>
          </div>,
        )
      }
    }

    for (let i = 1; i < TIMELINE_MEASURES; i++) {
      if (i % 4 !== 0) {
        markers.push(
          <div
            key={`beat-${i}`}
            className="absolute top-0 h-2 w-px bg-white/30"
            style={{ left: `${(i / TIMELINE_MEASURES) * 100}%` }}
          />,
        )
      }
    }

    return markers
  }

  const handleBlockClick = (blockId: string) => {
    setSelectedBlock(selectedBlock === blockId ? null : blockId)
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      {/* Main Timeline Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Lavoe Beat Maker</h1>
              <span className="text-sm text-gray-400">♯ D Major • {bpm} BPM</span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={isPlaying ? stopPlayback : startPlayback}
                size="lg"
                className="bg-white text-black hover:bg-gray-200"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button onClick={stopPlayback} variant="outline" size="lg">
                <Square className="w-5 h-5" />
              </Button>
              <Button onClick={resetPlayback} variant="outline" size="lg">
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Audio Upload Section */}
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-medium mb-4">Upload Audio to Chop</h3>
          <AudioUpload 
            onAudioUploaded={handleAudioUploaded}
            disabled={isProcessing}
            className="mb-4"
          />
          {uploadedAudio && (
            <AudioPlayer
              audioData={uploadedAudio.data}
              filename={uploadedAudio.filename}
              showDownload={false}
            />
          )}
        </div>

        {/* Timeline */}
        <div className="flex-1 p-6">
          <div className="relative mb-8">
            {/* Timeline markers */}
            <div className="relative h-10 mb-4 border-b border-gray-600">
              {generateTimeMarkers()}
              {/* Playhead */}
              <div
                className="absolute top-0 h-full w-0.5 bg-blue-500 z-50"
                style={{ left: `${(currentTime / TIMELINE_MEASURES) * 100}%` }}
              >
                <div className="absolute -top-1 -left-2 w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-blue-500"></div>
              </div>
            </div>

            <div className="mt-8 relative flex-1">
              <div className="flex-1 min-h-[400px] bg-gray-900 border border-gray-600 rounded relative overflow-hidden">
                {/* Grid lines */}
                {Array.from({ length: TIMELINE_MEASURES + 1 }, (_, i) => (
                  <div
                    key={`grid-v-${i}`}
                    className={`absolute top-0 bottom-0 ${
                      i % 16 === 0
                        ? "border-l-2 border-gray-500"
                        : i % 4 === 0
                          ? "border-l border-gray-600"
                          : "border-l border-gray-700/50"
                    }`}
                    style={{ left: `${(i / TIMELINE_MEASURES) * 100}%` }}
                  />
                ))}

                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={`grid-h-${i}`}
                    className="absolute left-0 right-0 border-t border-gray-700/30"
                    style={{ top: `${(i / 4) * 100}%` }}
                  />
                ))}

                {/* Playhead overlay */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-50"
                  style={{ left: `${(currentTime / TIMELINE_MEASURES) * 100}%` }}
                />

                {/* Music blocks */}
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`absolute ${block.color} rounded cursor-pointer border-2 transition-all ${
                      selectedBlock === block.id ? "border-white" : "border-transparent"
                    } hover:border-gray-300 opacity-90 z-10`}
                    style={{
                      left: `${(block.startTime / TIMELINE_MEASURES) * 100}%`,
                      width: `${(block.duration / TIMELINE_MEASURES) * 100}%`,
                      top: `${(block.track / tracks.length) * 80 + 10}%`,
                      height: `${80 / tracks.length - 2}%`,
                    }}
                    onClick={() => handleBlockClick(block.id)}
                  >
                    <div className="p-2 h-full flex items-center">
                      <span className="text-xs font-medium text-white truncate">{block.name}</span>
                    </div>
                  </div>
                ))}

                {/* Track labels */}
                <div className="absolute left-2 top-2 space-y-2">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="text-xs text-gray-400"
                      style={{ 
                        marginTop: `${(index / tracks.length) * 80 + 5}%`,
                        height: `${80 / tracks.length}%`
                      }}
                    >
                      {track.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Sidebar */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-medium text-white">AI Beat Assistant</h2>
          <p className="text-sm text-gray-400">Upload audio and ask me to chop it into beats</p>
        </div>
        
        <div className="flex-1">
          <AiChat
            onAudioProcess={handleAudioProcess}
            isProcessing={isProcessing}
            className="h-full"
          />
        </div>
      </div>
    </div>
  )
}