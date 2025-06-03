import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setCurrentRoom,
  setParticipants,
  toggleVideo,
  toggleAudio,
} from '@/store/slices/roomSlice';
import { useAuth } from '@/hooks/useAuth';
import { RootState } from '@/types';

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const {
    currentRoom,
    participants,
    call
  } = useAppSelector((state: RootState) => state.room);

  useEffect(() => {
    // TODO: Implement room joining logic
    if (roomId) {
      // Fetch room details and join room
    }
    return () => {
      // Cleanup when leaving room
    };
  }, [roomId, dispatch]);

  if (!currentRoom || !roomId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" align="center">
          Room not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5">
                {currentRoom.name}
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', height: 'calc(100% - 60px)' }}>
              {/* Video streams will be rendered here */}
            </Box>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <IconButton
                onClick={() => dispatch(toggleAudio())}
                color={call?.localStream?.getAudioTracks()[0]?.enabled ? 'primary' : 'error'}
              >
                {call?.localStream?.getAudioTracks()[0]?.enabled ? <Mic /> : <MicOff />}
              </IconButton>
              <IconButton
                onClick={() => dispatch(toggleVideo())}
                color={call?.localStream?.getVideoTracks()[0]?.enabled ? 'primary' : 'error'}
              >
                {call?.localStream?.getVideoTracks()[0]?.enabled ? <Videocam /> : <VideocamOff />}
              </IconButton>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Participants ({participants.length})
            </Typography>
            <List>
              {participants.map((participant) => (
                <ListItem key={participant.id}>
                  <ListItemIcon>
                    {participant.isMuted ? <MicOff /> : <Mic />}
                  </ListItemIcon>
                  <ListItemText
                    primary={participant.name}
                    secondary={participant.id === user?.id ? '(You)' : ''}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Room; 