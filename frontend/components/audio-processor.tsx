"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AudioUpload } from './audio-upload'
import { AudioPlayer } from './audio-player'
import { AiChat } from './ai-chat'
import { useAudioProcessing, type AudioProcessingResult, type ChopResult } from '@/hooks/use-audio-processing'

export function AudioProcessor() {
  const [currentAudio, setCurrentAudio] = useState<{
    data: string
    filename: string
  } | null>(null)
  
  const [processedResults, setProcessedResults] = useState<{
    harmonics?: AudioProcessingResult
    reverb?: AudioProcessingResult
    chops?: ChopResult
  }>({})

  const { isProcessing, error, extractHarmonics, addReverb, chopAudio } = useAudioProcessing()

  const handleAudioUploaded = (audioData: string, filename: string) => {
    setCurrentAudio({ data: audioData, filename })
    setProcessedResults({}) // Clear previous results
  }

  const handleAudioProcess = async (prompt: string) => {
    if (!currentAudio) {
      throw new Error('Please upload an audio file first')
    }

    const lowerPrompt = prompt.toLowerCase()

    try {
      if (lowerPrompt.includes('harmonic') || lowerPrompt.includes('extract')) {
        const result = await extractHarmonics(currentAudio.data, currentAudio.filename)
        setProcessedResults(prev => ({ ...prev, harmonics: result }))
      } else if (lowerPrompt.includes('reverb')) {
        // Parse reverb parameters from prompt if available
        const params = {
          room_size: lowerPrompt.includes('large') ? 0.8 : lowerPrompt.includes('small') ? 0.3 : 0.5,
          wet_level: lowerPrompt.includes('heavy') ? 0.5 : lowerPrompt.includes('light') ? 0.2 : 0.3,
        }
        const result = await addReverb(currentAudio.data, currentAudio.filename, params)
        setProcessedResults(prev => ({ ...prev, reverb: result }))
      } else if (lowerPrompt.includes('chop') || lowerPrompt.includes('segment') || lowerPrompt.includes('slice')) {
        // Parse chopping parameters from prompt if available
        const params = {
          default_length: lowerPrompt.includes('short') ? 1.0 : lowerPrompt.includes('long') ? 3.0 : 1.8,
          n_clusters: lowerPrompt.includes('many') ? 10 : lowerPrompt.includes('few') ? 4 : 6,
        }
        const result = await chopAudio(currentAudio.data, currentAudio.filename, params)
        setProcessedResults(prev => ({ ...prev, chops: result }))
      } else {
        throw new Error('I can help with: extracting harmonics, adding reverb, or chopping audio into segments')
      }
    } catch (err) {
      throw err
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Lavoe Audio Processor
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          AI-powered audio processing with harmonic extraction, reverb, and intelligent chopping
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload and Chat */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Audio</CardTitle>
              <CardDescription>
                Upload an audio file to get started with AI-powered processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioUpload 
                onAudioUploaded={handleAudioUploaded}
                disabled={isProcessing}
              />
            </CardContent>
          </Card>

          {/* Original Audio Player */}
          {currentAudio && (
            <Card>
              <CardHeader>
                <CardTitle>Original Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <AudioPlayer
                  audioData={currentAudio.data}
                  filename={currentAudio.filename}
                  showDownload={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {Object.keys(processedResults).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Processed Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="harmonics" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="harmonics" disabled={!processedResults.harmonics}>
                      Harmonics
                    </TabsTrigger>
                    <TabsTrigger value="reverb" disabled={!processedResults.reverb}>
                      Reverb
                    </TabsTrigger>
                    <TabsTrigger value="chops" disabled={!processedResults.chops}>
                      Chops
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="harmonics" className="space-y-4">
                    {processedResults.harmonics && (
                      <div className="space-y-4">
                        <AudioPlayer
                          audioData={processedResults.harmonics.audio_data}
                          filename={processedResults.harmonics.filename}
                        />
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>Duration: {processedResults.harmonics.metadata.duration_seconds?.toFixed(2)}s</p>
                          <p>Sample Rate: {processedResults.harmonics.metadata.sample_rate}Hz</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="reverb" className="space-y-4">
                    {processedResults.reverb && (
                      <div className="space-y-4">
                        <AudioPlayer
                          audioData={processedResults.reverb.audio_data}
                          filename={processedResults.reverb.filename}
                        />
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>Room Size: {processedResults.reverb.metadata.reverb_settings?.room_size}</p>
                          <p>Wet Level: {processedResults.reverb.metadata.reverb_settings?.wet_level}</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="chops" className="space-y-4">
                    {processedResults.chops && (
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <p>Total Chops: {processedResults.chops.metadata.total_chops}</p>
                          <p>Onsets Detected: {processedResults.chops.metadata.onset_detection?.onsets_detected}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                          {processedResults.chops.chops.map((chop, index) => (
                            <div key={chop.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Chop {index + 1}</span>
                                <span className="text-xs text-gray-500">
                                  Cluster {chop.cluster_label}
                                </span>
                              </div>
                              <AudioPlayer
                                audioData={chop.audio_data}
                                filename={`${chop.id}.wav`}
                                showDownload={true}
                              />
                              <div className="text-xs text-gray-500">
                                <p>{chop.start.toFixed(2)}s - {chop.end.toFixed(2)}s ({chop.duration.toFixed(2)}s)</p>
                                <p>RMS: {chop.features.rms?.toFixed(4)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Chat */}
        <div className="lg:col-span-1">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>
                Chat with AI to process your audio
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-5rem)]">
              <AiChat
                onAudioProcess={handleAudioProcess}
                isProcessing={isProcessing}
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
