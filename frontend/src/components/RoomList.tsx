import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import axios from 'axios';

interface Room {
  id: string;
  name: string;
  participants: number;
}

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('http://localhost:3000/calls/rooms');
      setRooms(response.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const response = await axios.post('http://localhost:3000/calls/rooms', {
        name: newRoomName,
      });
      setOpenDialog(false);
      setNewRoomName('');
      navigate(`/room/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h4">Available Rooms</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpenDialog(true)}
          >
            Create Room
          </Button>
        </Box>
        <Paper elevation={3}>
          <List>
            {rooms.map((room) => (
              <ListItem
                key={room.id}
                divider
                secondaryAction={
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleJoinRoom(room.id)}
                  >
                    Join
                  </Button>
                }
              >
                <ListItemText
                  primary={room.name}
                  secondary={`${room.participants} participant(s)`}
                />
              </ListItem>
            ))}
            {rooms.length === 0 && (
              <ListItem>
                <ListItemText primary="No rooms available" />
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Room Name"
            fullWidth
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateRoom} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RoomList; 