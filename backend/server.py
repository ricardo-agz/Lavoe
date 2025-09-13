import os
import tempfile

import librosa
import soundfile as sf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from audio_processing import get_harmonic_components

app = FastAPI(title="Lavoe Audio Processing API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/extract_harmonic")
async def extract_harmonic(file: UploadFile = File(...)):
    """
    Extract harmonic components from an uploaded MP3 file.
    
    Args:
        file: The MP3 file to process
        
    Returns:
        The processed MP3 file with only harmonic components
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.mp3'):
        raise HTTPException(status_code=400, detail="File must be an MP3")
    
    try:
        # Read the uploaded file
        file_contents = await file.read()
        
        # Create temporary files for processing
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_input:
            temp_input.write(file_contents)
            temp_input_path = temp_input.name
        
        try:
            # Load audio file with librosa
            y, sr = librosa.load(temp_input_path, sr=None)
            
            # Extract harmonic components
            y_harmonic = get_harmonic_components(y)
            
            # Write processed audio to buffer as MP3
            # Since soundfile doesn't support MP3 directly, we'll use WAV format
            # and let the client handle conversion if needed, or we can use a different approach
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_output:
                sf.write(temp_output.name, y_harmonic, sr)
                temp_output_path = temp_output.name
            
            # Read the processed file and convert back to bytes
            with open(temp_output_path, 'rb') as f:
                processed_audio = f.read()
            
            # Clean up temporary files
            os.unlink(temp_input_path)
            os.unlink(temp_output_path)
            
            # Return the processed audio file
            return Response(
                content=processed_audio,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": f"attachment; filename=harmonic_{file.filename.replace('.mp3', '.wav')}"
                }
            )
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(temp_input_path):
                os.unlink(temp_input_path)
            raise HTTPException(status_code=500, detail=f"Audio processing error: {str(e)}") from e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}") from e


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Lavoe Audio Processing API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
