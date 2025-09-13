"use client"

import { useCallback, useState } from 'react'
import { Upload, X, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { validateAudioFile, fileToBase64 } from '@/lib/audio-utils'

interface AudioUploadProps {
  onAudioUploaded: (audioData: string, filename: string) => void
  disabled?: boolean
  className?: string
}

export function AudioUpload({ onAudioUploaded, disabled, className }: AudioUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setIsUploading(true)

    try {
      const validation = validateAudioFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const base64Data = await fileToBase64(file)
      setUploadedFile(file)
      onAudioUploaded(base64Data, file.name)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }, [onAudioUploaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    const audioFile = files.find(file => file.type.startsWith('audio/'))
    
    if (audioFile) {
      handleFile(audioFile)
    } else {
      setError('Please drop an audio file')
    }
  }, [handleFile, disabled])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const clearFile = useCallback(() => {
    setUploadedFile(null)
    setError(null)
  }, [])

  return (
    <div className={className}>
      {!uploadedFile ? (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-700'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-600'}
          `}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => !disabled && setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => !disabled && document.getElementById('audio-upload')?.click()}
        >
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              {isUploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
              ) : (
                <Upload className="w-6 h-6 text-gray-500" />
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isUploading ? 'Processing...' : 'Drop audio file here or click to browse'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Supports WAV, MP3, FLAC, OGG (max 50MB)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Music className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {(uploadedFile.size / 1024 / 1024).toFixed(1)}MB • Ready for processing
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFile}
              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
