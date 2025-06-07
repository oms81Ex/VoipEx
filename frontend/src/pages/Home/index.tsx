import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  TextField,
  FormControlLabel,
  Switch,
  Box
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import GuestContacts from '@/components/GuestContacts';
import { useGuestCall } from '@/hooks/guest/useGuestCall';
import { io, Socket } from 'socket.io-client';

interface RoomData {
  id: string;
  name: string;
  participantCount: number;
  maxParticipants: number;
  isPrivate: boolean;
  status: string;
}

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    maxParticipants: 10,
    isPrivate: false,
    password: ''
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // 게스트 통화 관련
  const { startCall, isCallActive } = useGuestCall({
    socket,
    currentUserId: user?.id || '',
    onIncomingCall: (caller) => {
      // 수신 통화 처리 (추후 구현)
      console.log('Incoming call from:', caller);
    }
  });
  
  const handleStartGuestCall = (targetUserId: string, targetUserName: string, callType: 'audio' | 'video') => {
    // 게스트 간 직접 통화 시작
    startCall(targetUserId, targetUserName, callType);
    // 통화 화면으로 이동
    navigate(`/call/${targetUserId}`);
  };

  const handleCreateRoom = async () => {
    try {
      const response = await api.post('/rooms/create', {
        ...newRoom,
        hostName: user?.name
      });
      
      const { roomId } = response.data.data;
      setCreateDialogOpen(false);
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleJoinRoom = async (roomId: string, isPrivate: boolean) => {
    try {
      const response = await api.post(`/rooms/join`, {
        roomId,
        userName: user?.name
      });
      
      if (response.data.status === 'success') {
        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  // 게스트 사용자 여부 확인
  const isGuest = user?.role === 'guest' || user?.id?.startsWith('guest_');

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {isGuest ? (
        // 게스트 사용자용 UI
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <GuestContacts
              currentUser={{
                id: user?.id || '',
                name: user?.name || 'Guest',
                token: user?.token
              }}
              onStartCall={handleStartGuestCall}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                게스트 모드
              </Typography>
              <Typography color="text.secondary" paragraph>
                왼쪽 목록에서 다른 게스트를 선택하여 통화할 수 있습니다.
              </Typography>
              <Typography color="text.secondary">
                또는 아래에서 룸을 생성하거나 참가할 수 있습니다.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      ) : (
        // 일반 사용자용 UI
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
            <Typography variant="h4" component="h1">
              Available Rooms
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Room
            </Button>
          </Box>
        </>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          {isGuest ? '룸 목록' : ''}
        </Typography>
        <Grid container spacing={3}>
          {rooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {room.name}
                  </Typography>
                  <Typography color="textSecondary">
                    Participants: {room.participantCount}/{room.maxParticipants}
                  </Typography>
                  <Typography color="textSecondary">
                    Status: {room.status}
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    disabled={room.status !== 'active'}
                    onClick={() => handleJoinRoom(room.id, room.isPrivate)}
                  >
                    Join Room
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Create New Room
          </Typography>
          <TextField
            fullWidth
            label="Room Name"
            value={newRoom.name}
            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="number"
            label="Max Participants"
            value={newRoom.maxParticipants}
            onChange={(e) =>
              setNewRoom({
                ...newRoom,
                maxParticipants: parseInt(e.target.value, 10)
              })
            }
            margin="normal"
            inputProps={{ min: 2, max: 50 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={newRoom.isPrivate}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, isPrivate: e.target.checked })
                }
              />
            }
            label="Private Room"
            sx={{ my: 2 }}
          />
          {newRoom.isPrivate && (
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={newRoom.password}
              onChange={(e) =>
                setNewRoom({ ...newRoom, password: e.target.value })
              }
              margin="normal"
            />
          )}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateRoom}
              disabled={!newRoom.name}
            >
              Create
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Container>
  );
};

export default Home;
