import librosa

def get_harmonic_components(y):
    """Get the harmonic components of a given audio data."""

    y_harmonic, _ = librosa.effects.hpss(y)

    return y_harmonic
