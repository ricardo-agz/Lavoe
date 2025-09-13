export interface MusicBlock {
  id: string;
  name: string;
  type: "melody" | "bass" | "drums" | "percussion";
  color: string;
  startTime: number;
  duration: number;
  track: number;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  volume: number;
  audioFile?: File; // Optional audio file for uploaded tracks
  audioBlob?: Blob; // Optional audio blob for recorded tracks
}
