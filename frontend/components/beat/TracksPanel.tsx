"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download,
  Play,
  Pause,
  Music2,
  Clock,
  FileAudio,
  RefreshCw,
  Plus
} from "lucide-react";
import { toast } from "sonner";

interface Track {
  track_id: string;
  filename: string;
  file_size: number;
  created_at: string;
  duration_seconds?: number;
  sample_rate?: number;
  processing_type?: string;
  channels?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TracksPanelProps {
  refreshTrigger?: number;
  onAddToEditor?: (trackId: string, filename: string) => void;
}

export default function TracksPanel({ refreshTrigger, onAddToEditor }: TracksPanelProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tracks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks: ${response.statusText}`);
      }
      const tracksData = await response.json();
      setTracks(tracksData);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      toast.error("Failed to load tracks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      fetchTracks();
    }
  }, [refreshTrigger]);

  const handlePlayTrack = async (trackId: string) => {
    if (playingTrack === trackId) {
      // Stop playing
      setPlayingTrack(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tracks/${trackId}/download`);
      if (!response.ok) {
        throw new Error("Failed to download track");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      setPlayingTrack(trackId);

      audio.onended = () => {
        setPlayingTrack(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setPlayingTrack(null);
        URL.revokeObjectURL(audioUrl);
        toast.error("Failed to play track");
      };

      await audio.play();
    } catch (error) {
      console.error("Error playing track:", error);
      toast.error("Failed to play track");
      setPlayingTrack(null);
    }
  };

  const handleDownloadTrack = async (trackId: string, filename: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tracks/${trackId}/download`);
      if (!response.ok) {
        throw new Error("Failed to download track");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Track downloaded successfully");
    } catch (error) {
      console.error("Error downloading track:", error);
      toast.error("Failed to download track");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTrackTypeColor = (type?: string) => {
    switch (type) {
      case "beatoven_main_track":
        return "bg-blue-500";
      case "beatoven_stem_bass":
        return "bg-cyan-500";
      case "beatoven_stem_chords":
        return "bg-green-500";
      case "beatoven_stem_melody":
        return "bg-purple-500";
      case "beatoven_stem_percussion":
        return "bg-orange-500";
      case "harmonic_extraction":
        return "bg-pink-500";
      case "reverb":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTrackTypeLabel = (type?: string) => {
    switch (type) {
      case "beatoven_main_track":
        return "Main Track";
      case "beatoven_stem_bass":
        return "Bass";
      case "beatoven_stem_chords":
        return "Chords";
      case "beatoven_stem_melody":
        return "Melody";
      case "beatoven_stem_percussion":
        return "Percussion";
      case "harmonic_extraction":
        return "Harmonic";
      case "reverb":
        return "Reverb";
      case "original_upload":
        return "Upload";
      default:
        return "Audio";
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Catalog Tracks</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTracks}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading tracks...</p>
            </div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Music2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No tracks available</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => (
              <Card key={track.track_id} className="bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium break-words">
                        {track.filename}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground mt-1 break-all">
                        ID: {track.track_id}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`text-xs ${getTrackTypeColor(track.processing_type)} text-white`}
                        >
                          {getTrackTypeLabel(track.processing_type)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileAudio className="w-3 h-3" />
                        {formatFileSize(track.file_size)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(track.duration_seconds)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePlayTrack(track.track_id)}
                      >
                        {playingTrack === track.track_id ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadTrack(track.track_id, track.filename)}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      {onAddToEditor && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAddToEditor(track.track_id, track.filename)}
                          title="Add to Editor"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}