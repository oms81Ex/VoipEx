import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
import { RootState } from '@/store';
import { toggleChat } from '@/store/slices/roomSlice';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

const ChatPanel = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { isChatOpen } = useSelector((state: RootState) => state.room);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      message: message.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage('');
  };

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
          {messages.map((msg) => (
            <ListItem
              key={msg.id}
              sx={{
                flexDirection: 'column',
                alignItems: msg.userId === user?.id ? 'flex-end' : 'flex-start',
                mb: 2
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                {msg.userId === user?.id ? 'You' : msg.userName}
              </Typography>
              <Paper
                elevation={1}
                sx={{
                  p: 1,
                  bgcolor: msg.userId === user?.id ? 'primary.main' : 'grey.100',
                  color: msg.userId === user?.id ? 'white' : 'text.primary',
                  maxWidth: '80%',
                  borderRadius: 2
                }}
              >
                <Typography variant="body1">{msg.message}</Typography>
              </Paper>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {new Date(msg.timestamp).toLocaleTimeString()}
              </Typography>
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>
        <Divider />
        <Box
          component="form"
          onSubmit={handleSendMessage}
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
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={!message.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ChatPanel; 