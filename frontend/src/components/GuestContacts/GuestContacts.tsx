import React, { useEffect, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Typography,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import {
  Call as CallIcon,
  VideoCall as VideoCallIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';

interface GuestUser {
  id: string;
  name: string;
  socketId: string;
}

interface GuestContactsProps {
  currentUser: {
    id: string;
    name: string;
    token?: string;
  };
  onStartCall: (targetUserId: string, targetUserName: string, callType: 'audio' | 'video') => void;
}

const GuestContacts: React.FC<GuestContactsProps> = ({ currentUser, onStartCall }) => {
  const [guestUsers, setGuestUsers] = useState<GuestUser[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Socket 연결
    const socketUrl = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3004';
    const newSocket = io(socketUrl, {
      query: {
        userId: currentUser.id,
        name: currentUser.name,
        isGuest: 'true'
      },
      auth: currentUser.token ? { token: currentUser.token } : undefined
    });

    newSocket.on('connect', () => {
      console.log('Connected to signaling server');
      console.log('Socket ID:', newSocket.id);
      console.log('Current user:', currentUser);
      setIsConnected(true);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // 게스트 목록 수신
    newSocket.on('guestsList', (guests: GuestUser[]) => {
      console.log('Received guest list:', guests);
      setGuestUsers(guests);
    });

    // 새 게스트 참가
    newSocket.on('guestJoined', (guest: { userId: string; name: string }) => {
      console.log('Guest joined:', guest);
      setGuestUsers(prev => {
        // 중복 체크
        if (prev.find(g => g.id === guest.userId)) {
          return prev;
        }
        return [...prev, { id: guest.userId, name: guest.name, socketId: '' }];
      });
    });

    // 게스트 나감
    newSocket.on('guestLeft', (data: { userId: string }) => {
      console.log('Guest left:', data.userId);
      setGuestUsers(prev => prev.filter(g => g.id !== data.userId));
    });

    // 디버깅을 위한 모든 이벤트 로깅
    newSocket.onAny((eventName, ...args) => {
      console.log('Received event:', eventName, args);
    });
    
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [currentUser]);

  const handleCall = (targetUser: GuestUser, callType: 'audio' | 'video') => {
    console.log(`Starting ${callType} call with ${targetUser.name}`);
    onStartCall(targetUser.id, targetUser.name, callType);
  };

  return (
    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6">온라인 게스트</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Chip
            label={isConnected ? '연결됨' : '연결 중...'}
            size="small"
            color={isConnected ? 'success' : 'warning'}
            sx={{ bgcolor: 'white' }}
          />
          <Typography variant="body2" sx={{ ml: 1 }}>
            {guestUsers.length}명 온라인
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {guestUsers.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              현재 온라인인 다른 게스트가 없습니다
            </Typography>
          </Box>
        ) : (
          <List>
            {guestUsers.map((guest, index) => (
              <React.Fragment key={guest.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={guest.name}
                    secondary={`ID: ${guest.id}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="음성 통화"
                      onClick={() => handleCall(guest, 'audio')}
                      sx={{ mr: 1 }}
                    >
                      <CallIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="영상 통화"
                      onClick={() => handleCall(guest, 'video')}
                    >
                      <VideoCallIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
      
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          내 정보: {currentUser.name} ({currentUser.id})
        </Typography>
      </Box>
    </Paper>
  );
};

export default GuestContacts;
