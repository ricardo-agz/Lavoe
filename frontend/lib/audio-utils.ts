/**
 * Audio utility functions for file handling and conversion
 */

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (data:audio/wav;base64,)
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      } else {
        reject(new Error('Failed to read file as base64'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function base64ToBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

export function createAudioUrl(base64: string, mimeType: string = 'audio/wav'): string {
  const blob = base64ToBlob(base64, mimeType)
  return URL.createObjectURL(blob)
}

export function downloadAudio(base64: string, filename: string, mimeType: string = 'audio/wav') {
  const blob = base64ToBlob(base64, mimeType)
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const supportedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/flac', 'audio/ogg']
  const maxSize = 50 * 1024 * 1024 // 50MB
  
  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported types: WAV, MP3, FLAC, OGG`
    }
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max size: 50MB`
    }
  }
  
  return { valid: true }
}
