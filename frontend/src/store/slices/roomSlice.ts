import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RoomState, Room, Participant } from '@/types';

const initialState: RoomState = {
  currentRoom: null,
  participants: [],
  isChatOpen: false,
  call: {
    isConnected: false,
    localStream: null,
    remoteStreams: {}
  }
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setCurrentRoom: (state, action: PayloadAction<Room>) => {
      state.currentRoom = action.payload;
    },
    setParticipants: (state, action: PayloadAction<Participant[]>) => {
      state.participants = action.payload;
    },
    addParticipant: (state, action: PayloadAction<Participant>) => {
      state.participants.push(action.payload);
    },
    removeParticipant: (state, action: PayloadAction<string>) => {
      state.participants = state.participants.filter(p => p.id !== action.payload);
    },
    updateParticipant: (state, action: PayloadAction<Participant>) => {
      const index = state.participants.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.participants[index] = action.payload;
      }
    },
    toggleChat: (state) => {
      state.isChatOpen = !state.isChatOpen;
    },
    setLocalStream: (state, action: PayloadAction<MediaStream>) => {
      if (state.call) {
        state.call.localStream = action.payload;
      }
    },
    addRemoteStream: (state, action: PayloadAction<{ id: string; stream: MediaStream }>) => {
      if (state.call) {
        state.call.remoteStreams[action.payload.id] = action.payload.stream;
      }
    },
    removeRemoteStream: (state, action: PayloadAction<string>) => {
      if (state.call) {
        delete state.call.remoteStreams[action.payload];
      }
    },
    toggleVideo: (state) => {
      if (state.call?.localStream) {
        const videoTrack = state.call.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
        }
      }
    },
    toggleAudio: (state) => {
      if (state.call?.localStream) {
        const audioTrack = state.call.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
        }
      }
    },
    toggleScreenShare: (state, action: PayloadAction<MediaStream>) => {
      if (state.call) {
        if (state.call.localStream) {
          state.call.localStream.getTracks().forEach(track => track.stop());
        }
        state.call.localStream = action.payload;
      }
    }
  }
});

export const {
  setCurrentRoom,
  setParticipants,
  addParticipant,
  removeParticipant,
  updateParticipant,
  toggleChat,
  setLocalStream,
  addRemoteStream,
  removeRemoteStream,
  toggleVideo,
  toggleAudio,
  toggleScreenShare
} = roomSlice.actions;

export default roomSlice.reducer; 