import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Drawer,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider
} from '@mui/material';
import { Send as SendIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleChat } from '@/store/slices/roomSlice';
import { useAuth } from '@/hooks/useAuth';
import { RootState } from '@/types';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

const Room = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { isChatOpen } = useAppSelector((state: RootState) => state.room);
  const { localStream, remoteStreams } = useAppSelector((state: RootState) => {
    const call = state.room.call;
    return {
      localStream: call?.localStream || null,
      remoteStreams: call?.remoteStreams || {}
    };
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    if (localStream && remoteVideoRefs.current) {
      Object.entries(remoteStreams).forEach(([participantId, stream]) => {
        const videoElement = remoteVideoRefs.current[participantId];
        if (videoElement && stream) {
          videoElement.srcObject = stream;
        }
      });
    }
  }, [localStream, remoteStreams]);

  return (
    <Drawer
      anchor="right"
      open={isChatOpen}
      onClose={() => dispatch(toggleChat())}
      variant="persistent"
      sx={{
        width: 320,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 320,
          boxSizing: 'border-box',
          height: '100%',
          top: 64, // AppBar height
          bottom: 72 // Controls height
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Chat
          </Typography>
          <IconButton onClick={() => dispatch(toggleChat())}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            bgcolor: 'background.default',
            p: 2
          }}
        >
          {/* Messages will be rendered here */}
          <div ref={messagesEndRef} />
        </List>
        <Divider />
        <Box
          component="form"
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            display: 'flex',
            gap: 1
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
          />
          <IconButton
            type="submit"
            color="primary"
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Room; 