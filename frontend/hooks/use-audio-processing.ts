import { useState } from 'react'

export interface AudioProcessingResult {
  audio_data: string
  filename: string
  metadata: Record<string, any>
}

export interface ChopResult {
  chops: Array<{
    id: string
    audio_data: string
    start: number
    end: number
    duration: number
    features: Record<string, any>
    cluster_label?: number
    descriptor: string
  }>
  metadata: Record<string, any>
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export function useAudioProcessing() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processAudio = async (
    endpoint: string,
    audioData: string,
    filename: string,
    params: Record<string, any> = {}
  ) => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: audioData,
          filename,
          ...params,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Processing failed')
      }

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  const extractHarmonics = async (audioData: string, filename: string): Promise<AudioProcessingResult> => {
    return processAudio('/extract-harmonics', audioData, filename)
  }

  const addReverb = async (
    audioData: string,
    filename: string,
    params: {
      room_size?: number
      damping?: number
      wet_level?: number
      dry_level?: number
    } = {}
  ): Promise<AudioProcessingResult> => {
    return processAudio('/process-reverb', audioData, filename, params)
  }

  const chopAudio = async (
    audioData: string,
    filename: string,
    params: {
      default_length?: number
      min_duration?: number
      n_clusters?: number
    } = {}
  ): Promise<ChopResult> => {
    return processAudio('/chop-audio', audioData, filename, params)
  }

  return {
    isProcessing,
    error,
    extractHarmonics,
    addReverb,
    chopAudio,
  }
}
