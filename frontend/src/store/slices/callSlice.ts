import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CallState {
  roomId: string | null;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  participants: any[];
  isInCall: boolean;
  error: string | null;
}

const initialState: CallState = {
  roomId: null,
  localStream: null,
  remoteStreams: {},
  participants: [],
  isInCall: false,
  error: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    joinCall: (state, action: PayloadAction<{ roomId: string }>) => {
      state.roomId = action.payload.roomId;
      state.isInCall = true;
      state.error = null;
    },
    leaveCall: (state) => {
      state.roomId = null;
      state.localStream = null;
      state.remoteStreams = {};
      state.participants = [];
      state.isInCall = false;
      state.error = null;
    },
    setLocalStream: (state, action: PayloadAction<MediaStream>) => {
      state.localStream = action.payload;
      state.error = null;
    },
    addRemoteStream: (
      state,
      action: PayloadAction<{ userId: string; stream: MediaStream }>
    ) => {
      state.remoteStreams[action.payload.userId] = action.payload.stream;
    },
    removeRemoteStream: (state, action: PayloadAction<string>) => {
      delete state.remoteStreams[action.payload];
    },
    updateParticipants: (state, action: PayloadAction<any[]>) => {
      state.participants = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const {
  joinCall,
  leaveCall,
  setLocalStream,
  addRemoteStream,
  removeRemoteStream,
  updateParticipants,
  setError,
} = callSlice.actions;

export default callSlice.reducer; 