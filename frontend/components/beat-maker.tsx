"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Copy,
  MoreHorizontal,
  MessageSquare,
  ArrowUp,
  AtSign,
} from "lucide-react"

interface MusicBlock {
  id: string
  name: string
  type: "melody" | "bass" | "drums" | "percussion"
  color: string
  startTime: number
  duration: number
  track: number
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

const initialBlocks: MusicBlock[] = [
  { id: "block-1", name: "Piano Melody", type: "melody", color: "bg-blue-600", startTime: 8, duration: 24, track: 0 },
  { id: "block-2", name: "Bass Line", type: "bass", color: "bg-cyan-500", startTime: 16, duration: 32, track: 1 },
  { id: "block-3", name: "Kick", type: "drums", color: "bg-violet-600", startTime: 0, duration: 4, track: 2 },
  { id: "block-4", name: "Kick", type: "drums", color: "bg-violet-600", startTime: 8, duration: 4, track: 2 },
  { id: "block-5", name: "Kick", type: "drums", color: "bg-violet-600", startTime: 16, duration: 4, track: 2 },
  { id: "block-6", name: "Kick", type: "drums", color: "bg-violet-600", startTime: 24, duration: 4, track: 2 },
  { id: "block-7", name: "Kick", type: "drums", color: "bg-violet-600", startTime: 32, duration: 4, track: 2 },
]

const TIMELINE_WIDTH = 800
const TIMELINE_MEASURES = 64 // measures instead of seconds
const PIXELS_PER_MEASURE = TIMELINE_WIDTH / TIMELINE_MEASURES

export default function BeatMaker() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [bpm, setBpm] = useState(160)
  const [blocks, setBlocks] = useState<MusicBlock[]>(initialBlocks)
  const [tracks, setTracks] = useState<Track[]>(initialTracks)
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [processedAudio, setProcessedAudio] = useState<any[]>([])

  // Chat functionality
  const [input, setInput] = useState('')
  const { messages, sendMessage, status, error } = useChat({
    onFinish: (message: any) => {
      // Handle tool results when they come back
      const toolCalls = message.toolInvocations || []
      toolCalls.forEach((toolCall: any) => {
        if (toolCall.result) {
          handleAudioProcessed(toolCall.result)
        }
      })
    }
  })
  
  const isLoading = status === 'streaming' || status === 'submitted'
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage({ text: input })
      setInput('')
    }
  }

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize Web Audio API
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const startPlayback = () => {
    if (!isPlaying) {
      setIsPlaying(true)
      intervalRef.current = setInterval(
        () => {
          setCurrentTime((prev) => {
            const newTime = prev + 0.25 // quarter beat increments
            return newTime >= TIMELINE_MEASURES ? 0 : newTime
          })
        },
        (60 / bpm / 4) * 1000,
      ) // quarter note timing based on BPM
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

  const generateTimeMarkers = () => {
    const markers = []
    // Major markers every 4 measures
    for (let i = 0; i <= TIMELINE_MEASURES; i += 4) {
      if (i % 16 === 0) {
        // Extra prominent markers every 16 measures
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

    // Beat markers (every measure)
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

  const handleAudioProcessed = (result: any) => {
    // Store processed audio results
    setProcessedAudio(prev => [...prev, result])
    
    // If it's chops, create blocks for each chop
    if (result.success && result.chops) {
      const newBlocks: MusicBlock[] = result.chops.slice(0, 8).map((chop: any, index: number) => ({
        id: `chop-${Date.now()}-${index}`,
        name: chop.id,
        type: "melody" as const,
        color: "bg-emerald-500",
        startTime: index * 8, // Space them out
        duration: Math.max(2, Math.min(8, chop.duration * 4)), // Convert to measures
        track: index % tracks.length,
      }))
      
      setBlocks(prev => [...prev, ...newBlocks])
    }
    
    // If it's a single processed audio file, create one block
    else if (result.success && result.audioData) {
      const newBlock: MusicBlock = {
        id: `processed-${Date.now()}`,
        name: result.filename || "Processed Audio",
        type: "melody",
        color: "bg-blue-500",
        startTime: Math.floor(Math.random() * 32),
        duration: 8,
        track: 0,
      }
      
      setBlocks(prev => [...prev, newBlock])
    }
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
              <h1 className="text-2xl font-bold">Gliding 808 Trap Starter</h1>
              <span className="text-sm text-gray-400">♯ D Major • {bpm}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono text-gray-400">02:25</span>
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
              <Button variant="outline" size="lg">
                Export
              </Button>
            </div>
          </div>
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
              <div className="flex-1 min-h-[calc(100vh-280px)] bg-gray-900 border border-gray-600 rounded relative overflow-hidden">
                {/* Vertical grid lines */}
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

                {/* Horizontal grid lines */}
                {Array.from({ length: 17 }, (_, i) => (
                  <div
                    key={`grid-h-${i}`}
                    className="absolute left-0 right-0 border-t border-gray-700/30"
                    style={{ top: `${(i / 16) * 100}%` }}
                  />
                ))}

                {/* Playhead overlay for grid area */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-50"
                  style={{ left: `${(currentTime / TIMELINE_MEASURES) * 100}%` }}
                />

                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`absolute ${block.color} rounded cursor-pointer border-2 transition-all ${
                      selectedBlock === block.id ? "border-white" : "border-transparent"
                    } hover:border-gray-300 opacity-90 z-10`}
                    style={{
                      left: `${(block.startTime / TIMELINE_MEASURES) * 100}%`,
                      width: `${(block.duration / TIMELINE_MEASURES) * 100}%`,
                      top: `${(block.track / tracks.length) * 60 + 10}%`,
                      height: `${60 / tracks.length - 2}%`,
                    }}
                    onClick={() => handleBlockClick(block.id)}
                  >
                    <div className="p-2 h-full flex items-center">
                      <span className="text-xs font-medium text-white truncate">{block.name}</span>
                    </div>
                  </div>
                ))}

                {/* Grid content area label */}
                <div className="absolute top-2 left-2 text-xs text-gray-500">Piano Roll / MIDI Editor</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Sidebar */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Generate Music</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
              ×
            </Button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 space-y-2">
              <p className="text-sm">Upload audio and describe what you'd like to do!</p>
              <div className="text-xs space-y-1">
                <p>• Extract harmonics from vocals</p>
                <p>• Add reverb effects</p>
                <p>• Chop audio into segments</p>
              </div>
            </div>
          )}
          
          {messages.map((message: any) => {
            const isUser = message.role === 'user'
            const hasToolInvocations = message.toolInvocations && message.toolInvocations.length > 0

            return (
              <div key={message.id} className={`space-y-3 ${isUser ? 'ml-8' : 'mr-8'}`}>
                <div className={`rounded-lg p-3 ${isUser ? 'bg-blue-600 ml-auto' : 'bg-gray-800'}`}>
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>

                {/* Render tool invocations */}
                {hasToolInvocations && message.toolInvocations.map((toolCall: any, index: number) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Processing: {toolCall.toolName}</span>
                      {toolCall.state === 'call' && <span className="animate-pulse">...</span>}
                    </div>
                    
                    {toolCall.result && (
                      <div className="space-y-2">
                        <p className="text-white text-sm">{toolCall.result.message}</p>
                        
                        {/* Show success/error status */}
                        {!toolCall.result.success && toolCall.result.error && (
                          <div className="bg-red-900/50 rounded p-2">
                            <p className="text-red-300 text-xs">{toolCall.result.error}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400">
              <span className="animate-pulse">●</span>
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-800 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="bg-gray-700 px-2 py-1 rounded flex items-center">
                <AtSign className="w-3 h-3" />
              </span>
              <span className="bg-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>1 Tab
              </span>
              <span className="ml-auto">6.8%</span>
              <div className="w-4 h-4 border border-gray-600 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              </div>
            </div>

            <form id="chat-form" onSubmit={handleSubmit}>
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Describe what you want to do with audio..."
                className="bg-transparent border-none text-white placeholder-gray-500 p-0 focus-visible:ring-0"
                disabled={isLoading}
              />
            </form>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span>∞</span>
                  <span className="bg-gray-700 px-1 rounded">#1</span>
                  <span>⌃</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>gpt-5</span>
                  <span className="text-yellow-400">⚡</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button
                  type="submit"
                  form="chat-form"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                  disabled={isLoading || !input.trim()}
                  onClick={handleSubmit}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
