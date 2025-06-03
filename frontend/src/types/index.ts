export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  error: string | null;
  loading: boolean;
}

export interface RoomState {
  currentRoom: Room | null;
  participants: Participant[];
  isChatOpen: boolean;
  call: CallState | null;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  participants: string[];
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
}

export interface CallState {
  isConnected: boolean;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
}

export interface RootState {
  auth: AuthState;
  room: RoomState;
} 