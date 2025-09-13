import os
import tempfile
import base64
import io
import logging
from contextlib import asynccontextmanager

import librosa
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any

from audio_processing import get_harmonic_components, get_percussive_components, add_reverb, adjust_pitch
import json
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Lavoe Audio Processing API", version="1.0.0")

# Pydantic models for Base64 audio processing
class AudioInput(BaseModel):
    audio_data: str = Field(..., description="Base64 encoded audio data")
    filename: Optional[str] = Field(default="audio.wav", description="Original filename for reference")
    
    @validator('audio_data')
    def validate_audio_data(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError('audio_data must be a non-empty string')
        try:
            base64.b64decode(v)
        except Exception:
            raise ValueError('audio_data must be valid base64 encoded data')
        return v

class ReverbInput(BaseModel):
    audio_data: str = Field(..., description="Base64 encoded audio data")
    filename: Optional[str] = Field(default="audio.wav", description="Original filename for reference")
    room_size: float = Field(default=0.5, ge=0.0, le=1.0, description="Size of the reverb room (0.0 to 1.0)")
    damping: float = Field(default=0.5, ge=0.0, le=1.0, description="High frequency damping (0.0 to 1.0)")
    wet_level: float = Field(default=0.3, ge=0.0, le=1.0, description="Reverb effect level (0.0 to 1.0)")
    dry_level: float = Field(default=0.7, ge=0.0, le=1.0, description="Original signal level (0.0 to 1.0)")
    
    @validator('audio_data')
    def validate_audio_data(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError('audio_data must be a non-empty string')
        try:
            base64.b64decode(v)
        except Exception:
            raise ValueError('audio_data must be valid base64 encoded data')
        return v

class ChopInput(BaseModel):
    audio_data: str = Field(..., description="Base64 encoded audio data")
    filename: Optional[str] = Field(default="audio.wav", description="Original filename for reference")
    default_length: float = Field(default=1.8, ge=0.1, le=10.0, description="Default length for chops in seconds")
    min_duration: float = Field(default=0.2, ge=0.05, le=2.0, description="Minimum duration for chops in seconds")
    n_clusters: int = Field(default=6, ge=1, le=20, description="Number of clusters for grouping similar chops")
    
    @validator('audio_data')
    def validate_audio_data(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError('audio_data must be a non-empty string')
        try:
            base64.b64decode(v)
        except Exception:
            raise ValueError('audio_data must be valid base64 encoded data')
        return v

class AudioOutput(BaseModel):
    audio_data: str  # Base64 encoded processed audio
    filename: str
    metadata: Dict[str, Any]

class ChopOutput(BaseModel):
    chops: List[Dict[str, Any]]
    metadata: Dict[str, Any]

# Helper functions
def decode_base64_audio(audio_data: str) -> bytes:
    """Decode base64 audio data to bytes."""
    try:
        if not audio_data:
            raise ValueError("Empty audio data")
        return base64.b64decode(audio_data)
    except Exception as e:
        logger.error(f"Base64 decode error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid base64 audio data: {str(e)}")

def encode_audio_to_base64(audio_bytes: bytes) -> str:
    """Encode audio bytes to base64 string."""
    return base64.b64encode(audio_bytes).decode('utf-8')

def process_audio_from_base64(audio_data: str, filename: str = "audio.wav"):
    """Process base64 audio data and return numpy array and sample rate."""
    temp_file_path = None
    try:
        audio_bytes = decode_base64_audio(audio_data)
        
        # Create temporary file
        file_ext = '.wav'  # Default to wav
        if filename and '.' in filename:
            file_ext = '.' + filename.split('.')[-1].lower()
        
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        # Load with librosa
        y, sr = librosa.load(temp_file_path, sr=None)
        
        if len(y) == 0:
            raise ValueError("Audio file is empty or corrupted")
            
        logger.info(f"Loaded audio: {len(y)} samples at {sr}Hz")
        return y, sr, temp_file_path
        
    except Exception as e:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        logger.error(f"Audio processing error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error loading audio: {str(e)}")

def save_audio_to_base64(y: np.ndarray, sr: int) -> str:
    """Save numpy audio array to base64 encoded WAV."""
    temp_file_path = None
    try:
        if len(y) == 0:
            raise ValueError("Cannot save empty audio array")
            
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            sf.write(temp_file.name, y, sr)
            temp_file_path = temp_file.name
        
        with open(temp_file_path, 'rb') as f:
            audio_bytes = f.read()
        
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
            
        return encode_audio_to_base64(audio_bytes)
        
    except Exception as e:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        logger.error(f"Audio encoding error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error encoding audio: {str(e)}")

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


@app.post("/api/adjust_pitch")
async def adjust_pitch_endpoint(
    file: UploadFile = File(...),
    semitones: float = Form(0.0)
):
    """
    Adjust the pitch of an uploaded audio file by a specified number of semitones.
    
    Args:
        file: The audio file to process
        semitones: Number of semitones to shift (positive for higher pitch, negative for lower)
        
    Returns:
        The processed audio file with adjusted pitch
    """
    # Validate file has an extension
    if not file.filename or '.' not in file.filename:
        raise HTTPException(status_code=400, detail="File must have a valid audio extension")
    
    # Validate semitones range (reasonable limits to prevent extreme processing)
    if not -24.0 <= semitones <= 24.0:
        raise HTTPException(status_code=400, detail="Semitones must be between -24.0 and 24.0")
    
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
            
            # Adjust pitch
            y_shifted = adjust_pitch(y, sr, semitones)
            
            # Write processed audio to temporary file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_output:
                sf.write(temp_output.name, y_shifted, sr)
                temp_output_path = temp_output.name
            
            # Read the processed file
            with open(temp_output_path, 'rb') as f:
                processed_audio = f.read()
            
            # Clean up temporary files
            os.unlink(temp_input_path)
            os.unlink(temp_output_path)
            
            # Generate output filename
            base_name = '.'.join(file.filename.split('.')[:-1])
            semitone_str = f"{semitones:+.1f}st" if semitones != 0 else "0st"
            output_filename = f"pitch_{semitone_str}_{base_name}.wav"
            
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
    room_size: float = Form(0.5),
    damping: float = Form(0.5),
    wet_level: float = Form(0.3),
    dry_level: float = Form(0.7)
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




# Base64 Audio Processing Endpoints for AI Agent Integration

@app.post("/extract-harmonics", response_model=AudioOutput)
async def extract_harmonics_base64(input_data: AudioInput, request: Request):
    """
    Extract harmonic components from Base64 encoded audio.
    
    Args:
        input_data: AudioInput containing Base64 encoded audio data
        
    Returns:
        AudioOutput with Base64 encoded harmonic audio and metadata
    """
    temp_file_path = None
    try:
        logger.info(f"Processing harmonic extraction request from {request.client.host if request.client else 'unknown'}")
        
        # Process audio from Base64
        y, sr, temp_file_path = process_audio_from_base64(input_data.audio_data, input_data.filename)
        
        # Extract harmonic components
        y_harmonic = get_harmonic_components(y)
        
        if len(y_harmonic) == 0:
            raise ValueError("Harmonic extraction resulted in empty audio")
        
        # Convert back to Base64
        harmonic_base64 = save_audio_to_base64(y_harmonic, sr)
        
        # Generate output filename
        base_name = input_data.filename.split('.')[0] if input_data.filename else "audio"
        output_filename = f"harmonic_{base_name}.wav"
        
        # Create metadata
        metadata = {
            "original_filename": input_data.filename,
            "processing_type": "harmonic_extraction",
            "sample_rate": int(sr),
            "duration_seconds": float(len(y_harmonic) / sr),
            "channels": 1 if len(y_harmonic.shape) == 1 else y_harmonic.shape[0],
            "original_duration": float(len(y) / sr)
        }
        
        logger.info(f"Successfully processed harmonic extraction: {len(y_harmonic)} samples")
        
        return AudioOutput(
            audio_data=harmonic_base64,
            filename=output_filename,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Harmonic extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Harmonic extraction error: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


@app.post("/process-reverb", response_model=AudioOutput)
async def process_reverb_base64(input_data: ReverbInput, request: Request):
    """
    Apply reverb effect to Base64 encoded audio.
    
    Args:
        input_data: ReverbInput containing Base64 audio and reverb parameters
        
    Returns:
        AudioOutput with Base64 encoded processed audio and metadata
    """
    temp_file_path = None
    try:
        logger.info(f"Processing reverb request from {request.client.host if request.client else 'unknown'}")
        
        # Process audio from Base64
        y, sr, temp_file_path = process_audio_from_base64(input_data.audio_data, input_data.filename)
        
        # Apply reverb effect
        y_reverb = add_reverb(
            y, 
            sample_rate=sr, 
            room_size=input_data.room_size,
            damping=input_data.damping, 
            wet_level=input_data.wet_level, 
            dry_level=input_data.dry_level
        )
        
        if len(y_reverb) == 0:
            raise ValueError("Reverb processing resulted in empty audio")
        
        # Convert back to Base64
        reverb_base64 = save_audio_to_base64(y_reverb, sr)
        
        # Generate output filename
        base_name = input_data.filename.split('.')[0] if input_data.filename else "audio"
        output_filename = f"reverb_{base_name}.wav"
        
        # Create metadata
        metadata = {
            "original_filename": input_data.filename,
            "processing_type": "reverb",
            "sample_rate": int(sr),
            "duration_seconds": float(len(y_reverb) / sr),
            "channels": 1 if len(y_reverb.shape) == 1 else y_reverb.shape[0],
            "original_duration": float(len(y) / sr),
            "reverb_settings": {
                "room_size": input_data.room_size,
                "damping": input_data.damping,
                "wet_level": input_data.wet_level,
                "dry_level": input_data.dry_level
            }
        }
        
        logger.info(f"Successfully processed reverb: {len(y_reverb)} samples")
        
        return AudioOutput(
            audio_data=reverb_base64,
            filename=output_filename,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reverb processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Reverb processing error: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


@app.post("/chop-audio", response_model=ChopOutput)
async def chop_audio_base64(input_data: ChopInput, request: Request):
    """
    Chop audio into segments using harmonic component analysis.
    
    Args:
        input_data: ChopInput containing Base64 audio and chopping parameters
        
    Returns:
        ChopOutput with array of chop segments and metadata
    """
    temp_file_path = None
    try:
        logger.info(f"Processing chop audio request from {request.client.host if request.client else 'unknown'}")
        
        # Process audio from Base64
        y, sr, temp_file_path = process_audio_from_base64(input_data.audio_data, input_data.filename)
        
        # Apply HPSS to get harmonic component
        y_harmonic, _ = librosa.effects.hpss(y)
        
        # Detect onsets on harmonic component
        onset_kwargs = dict(backtrack=True, pre_max=7, post_max=7, pre_avg=7, post_avg=7, delta=0.25, wait=0)
        oenv = librosa.onset.onset_strength(y=y_harmonic, sr=sr, hop_length=512)
        onset_frames = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=512, **onset_kwargs)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=512)
        
        # Create chops from onsets
        chops_sec = []
        n = len(onset_times)
        for i, t in enumerate(onset_times):
            start = float(t)
            if i < n - 1:
                end = float(onset_times[i + 1])
                if end - start < input_data.min_duration:
                    end = start + input_data.default_length
            else:
                end = start + input_data.default_length
            if end <= start:
                end = start + input_data.min_duration
            chops_sec.append((start, end))
        
        if len(chops_sec) == 0:
            chops_sec = [(0.0, len(y_harmonic) / sr)]
        
        # Extract features and create chop data
        chops = []
        feature_matrix = []
        
        for i, (start, end) in enumerate(chops_sec):
            duration = end - start
            chop_id = f'harmonic_chop_{i:03d}'
            
            # Extract audio slice
            start_sample = int(round(start * sr))
            end_sample = int(round(end * sr))
            y_slice = y_harmonic[start_sample:end_sample]
            
            # Extract features
            if y_slice.size == 0:
                features = {
                    'rms': 0.0, 'centroid': 0.0, 'zcr': 0.0,
                    'chroma_mean': [0.0] * 12, 'mfcc_mean': [0.0] * 13,
                    'dominant_pc': None, 'dominant_note': None
                }
            else:
                features = {}
                features['rms'] = float(np.mean(librosa.feature.rms(y=y_slice)[0]))
                features['centroid'] = float(np.mean(librosa.feature.spectral_centroid(y=y_slice, sr=sr)[0]))
                features['zcr'] = float(np.mean(librosa.feature.zero_crossing_rate(y_slice)[0]))
                
                chroma = librosa.feature.chroma_stft(y=y_slice, sr=sr)
                features['chroma_mean'] = [float(x) for x in np.mean(chroma, axis=1)]
                dom = int(np.argmax(features['chroma_mean'])) if np.array(features['chroma_mean']).size > 0 else None
                features['dominant_pc'] = dom
                features['dominant_note'] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][dom] if dom is not None else None
                
                mfcc = librosa.feature.mfcc(y=y_slice, sr=sr, n_mfcc=13)
                features['mfcc_mean'] = [float(x) for x in np.mean(mfcc, axis=1)]
            
            # Convert slice to Base64
            slice_base64 = save_audio_to_base64(y_slice, sr)
            
            # Create feature vector for clustering
            feature_vec = [features['rms'], features['centroid'], features['zcr']] + features['mfcc_mean'][:4]
            feature_matrix.append(feature_vec)
            
            chop_data = {
                'id': chop_id,
                'audio_data': slice_base64,
                'start': float(start),
                'end': float(end),
                'duration': float(duration),
                'features': features,
                'descriptor': f"Harmonic | RMS={features['rms']:.4f} | Dur={duration:.2f}"
            }
            chops.append(chop_data)
        
        # Perform clustering if possible
        if len(feature_matrix) > 0:
            X = np.array(feature_matrix)
            try:
                k = min(input_data.n_clusters, X.shape[0])
                if k > 1:
                    scaler = StandardScaler()
                    X_scaled = scaler.fit_transform(X)
                    kmeans = KMeans(n_clusters=k, random_state=0, n_init=10).fit(X_scaled)
                    labels = kmeans.labels_
                    
                    for chop, label in zip(chops, labels):
                        chop['cluster_label'] = int(label)
                        chop['descriptor'] += f" | Cluster={label}"
                else:
                    for chop in chops:
                        chop['cluster_label'] = 0
                        
            except Exception as e:
                logger.warning(f"Clustering failed: {str(e)}")
                for chop in chops:
                    chop['cluster_label'] = 0
        
        # Create metadata
        metadata = {
            "original_filename": input_data.filename,
            "processing_type": "audio_chopping",
            "sample_rate": int(sr),
            "total_chops": len(chops),
            "chopping_params": {
                "default_length": input_data.default_length,
                "min_duration": input_data.min_duration,
                "n_clusters": input_data.n_clusters
            },
            "onset_detection": {
                "onsets_detected": len(onset_times),
                "onset_times": [float(t) for t in onset_times]
            }
        }
        
        logger.info(f"Successfully processed audio chopping: {len(chops)} chops created")
        
        return ChopOutput(chops=chops, metadata=metadata)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio chopping error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audio chopping error: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Lavoe Audio Processing API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
