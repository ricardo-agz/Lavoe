"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Volume2, Mic, Plus, MoreHorizontal } from "lucide-react"
import { Track } from "./types"

interface TracksSidebarProps {
  tracks: Track[]
  onVolumeChange: (trackId: string, volume: number) => void
  onMuteToggle: (trackId: string) => void
}

export function TracksSidebar({ tracks, onVolumeChange, onMuteToggle }: TracksSidebarProps) {
  const [activeView, setActiveView] = useState<'tracks' | 'record' | null>(null)
  
  return (
    <div className="h-full bg-black flex">
      {/* Left Navigation */}
      <div className="w-16 border-r border-gray-800 flex flex-col items-center py-4 gap-6">
        <div className="mb-4">
          <img 
            src="/Lavoe.png"
            alt="Lavoe"
            className="h-5 w-auto"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 ${
            activeView === 'tracks' ? 'bg-gray-800' : 'hover:bg-gray-900'
          }`}
          onClick={() => setActiveView(activeView === 'tracks' ? null : 'tracks')}
        >
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="2" rx="1" fill="white"/>
              <rect x="2" y="7" width="12" height="2" rx="1" fill="white"/>
              <rect x="2" y="11" width="12" height="2" rx="1" fill="white"/>
            </svg>
          </div>
          <span className="text-[10px] text-gray-400">Tracks</span>
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 ${
            activeView === 'record' ? 'bg-gray-800' : 'hover:bg-gray-900'
          }`}
          onClick={() => setActiveView(activeView === 'record' ? null : 'record')}
        >
          <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
            <Mic className="h-4 w-4 text-gray-300" />
          </div>
          <span className="text-[10px] text-gray-400">Record</span>
        </Button>
      </div>

      {/* Content Area */}
      {activeView === 'tracks' && (
        <div className="w-64 bg-black">
          <div className="p-4 flex items-center justify-between">
            <span className="text-gray-300 font-medium">Tracks</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-5rem)]">
            <div className="px-4 space-y-4">
              {tracks.map((track) => (
                <div key={track.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-8 ${track.color} rounded-full`} />
                      <span className="text-sm text-gray-300">
                        {track.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMuteToggle(track.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Volume2 className={`h-4 w-4 ${track.muted ? "text-gray-600" : "text-gray-300"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                  <Slider
                    value={[track.volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => onVolumeChange(track.id, value[0])}
                    className={`${track.muted ? "opacity-50" : ""}`}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {activeView === 'record' && (
        <div className="w-64 bg-black p-4">
          <div className="flex flex-col gap-4">
            <span className="text-gray-300 font-medium">Record</span>
            <Button 
              variant="secondary"
              size="lg"
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300"
            >
              <Mic className="mr-2 h-4 w-4" />
              Click to Record
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}