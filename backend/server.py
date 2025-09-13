import os
import tempfile

import librosa
import soundfile as sf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from audio_processing import get_harmonic_components, get_percussive_components, add_reverb

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
    Extract harmonic components from an uploaded audio file.
    
    Args:
        file: The audio file to process
        
    Returns:
        The processed audio file with only harmonic components
    """
    # Validate file has an extension
    if not file.filename or '.' not in file.filename:
        raise HTTPException(status_code=400, detail="File must have a valid audio extension")
    
    try:
        # Read the uploaded file
        file_contents = await file.read()
        
        # Create temporary files for processing
        file_ext = '.' + file.filename.split('.')[-1].lower()
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as temp_input:
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
            # Generate output filename
            base_name = '.'.join(file.filename.split('.')[:-1])
            output_filename = f"harmonic_{base_name}.wav"
            
            return Response(
                content=processed_audio,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": f"attachment; filename={output_filename}"
                }
            )
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(temp_input_path):
                os.unlink(temp_input_path)
            raise HTTPException(status_code=500, detail=f"Audio processing error: {str(e)}") from e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}") from e

@app.post("/api/extract_percussive")
async def extract_percussive(file: UploadFile = File(...)):
    """
    Extract percussive components from an uploaded audio file.
    
    Args:
        file: The audio file to process
        
    Returns:
        The processed audio file with only percussive components
    """
    # Validate file has an extension
    if not file.filename or '.' not in file.filename:
        raise HTTPException(status_code=400, detail="File must have a valid audio extension")
    
    try:
        # Read the uploaded file
        file_contents = await file.read()
        
        # Create temporary files for processing
        file_ext = '.' + file.filename.split('.')[-1].lower()
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as temp_input:
            temp_input.write(file_contents)
            temp_input_path = temp_input.name
        
        try:
            # Load audio file with librosa
            y, sr = librosa.load(temp_input_path, sr=None)
            
            # Extract harmonic components
            y_percussive = get_percussive_components(y)
            
            # Write processed audio to buffer as MP3
            # Since soundfile doesn't support MP3 directly, we'll use WAV format
            # and let the client handle conversion if needed, or we can use a different approach
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_output:
                sf.write(temp_output.name, y_percussive, sr)
                temp_output_path = temp_output.name
            
            # Read the processed file and convert back to bytes
            with open(temp_output_path, 'rb') as f:
                processed_audio = f.read()
            
            # Clean up temporary files
            os.unlink(temp_input_path)
            os.unlink(temp_output_path)
            
            # Return the processed audio file
            # Generate output filename
            base_name = '.'.join(file.filename.split('.')[:-1])
            output_filename = f"percussive_{base_name}.wav"
            
            return Response(
                content=processed_audio,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": f"attachment; filename={output_filename}"
                }
            )
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(temp_input_path):
                os.unlink(temp_input_path)
            raise HTTPException(status_code=500, detail=f"Audio processing error: {str(e)}") from e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}") from e


@app.post("/api/add_reverb")
async def add_reverb_endpoint(
    file: UploadFile = File(...),
    room_size: float = 0.5,
    damping: float = 0.5,
    wet_level: float = 0.3,
    dry_level: float = 0.7
):
    """
    Add reverb effect to an uploaded audio file.
    
    Args:
        file: The audio file to process
        room_size: Size of the reverb room (0.0 to 1.0, default: 0.5)
        damping: High frequency damping (0.0 to 1.0, default: 0.5)
        wet_level: Reverb effect level (0.0 to 1.0, default: 0.3)
        dry_level: Original signal level (0.0 to 1.0, default: 0.7)
        
    Returns:
        The processed audio file with reverb effect applied
    """
    # Validate file has an extension
    if not file.filename or '.' not in file.filename:
        raise HTTPException(status_code=400, detail="File must have a valid audio extension")
    
    # Validate parameters
    for param, value in [("room_size", room_size), ("damping", damping), 
                        ("wet_level", wet_level), ("dry_level", dry_level)]:
        if not 0.0 <= value <= 1.0:
            raise HTTPException(status_code=400, detail=f"{param} must be between 0.0 and 1.0")
    
    try:
        # Read the uploaded file
        file_contents = await file.read()
        
        # Create temporary files for processing
        file_ext = '.' + file.filename.split('.')[-1].lower()
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as temp_input:
            temp_input.write(file_contents)
            temp_input_path = temp_input.name
        
        try:
            # Load audio file with librosa
            y, sr = librosa.load(temp_input_path, sr=None)
            
            # Apply reverb effect
            y_reverb = add_reverb(y, sample_rate=sr, room_size=room_size, 
                                damping=damping, wet_level=wet_level, dry_level=dry_level)
            
            # Write processed audio to temporary file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_output:
                sf.write(temp_output.name, y_reverb, sr)
                temp_output_path = temp_output.name
            
            # Read the processed file
            with open(temp_output_path, 'rb') as f:
                processed_audio = f.read()
            
            # Clean up temporary files
            os.unlink(temp_input_path)
            os.unlink(temp_output_path)
            
            # Generate output filename
            base_name = '.'.join(file.filename.split('.')[:-1])
            output_filename = f"reverb_{base_name}.wav"
            
            return Response(
                content=processed_audio,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": f"attachment; filename={output_filename}"
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
