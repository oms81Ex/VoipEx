import { store } from './index';
import { AuthState, RoomState } from '@/types';

export type RootState = {
  auth: AuthState;
  room: RoomState;
};

export type AppDispatch = typeof store.dispatch; 