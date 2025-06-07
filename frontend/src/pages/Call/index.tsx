import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  IconButton,
  Typography,
  Paper,
  Stack
} from '@mui/material';
import {
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon
} from '@mui/icons-material';

interface CallPageProps {
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  onEndCall?: () => void;
  onToggleAudio?: () => boolean;
  onToggleVideo?: () => boolean;
}

const CallPage = ({ 
  localStream, 
  remoteStream, 
  onEndCall,
  onToggleAudio,
  onToggleVideo 
}: CallPageProps) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    // 로컬 비디오 스트림 연결
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    // 원격 비디오 스트림 연결
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    if (onEndCall) {
      onEndCall();
    }
    navigate('/');
  };

  const handleToggleAudio = () => {
    if (onToggleAudio) {
      const enabled = onToggleAudio();
      setIsAudioEnabled(enabled);
    }
  };

  const handleToggleVideo = () => {
    if (onToggleVideo) {
      const enabled = onToggleVideo();
      setIsVideoEnabled(enabled);
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 헤더 */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" align="center">
          통화 중: {userId}
        </Typography>
      </Box>

      {/* 비디오 영역 */}
      <Box sx={{ 
        flex: 1, 
        position: 'relative',
        bgcolor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* 원격 비디오 (메인) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />

        {/* 로컬 비디오 (PiP) */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            width: 200,
            height: 150,
            overflow: 'hidden',
            bgcolor: 'grey.900'
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </Paper>

        {/* 비디오가 없을 때 표시 */}
        {!remoteStream && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" color="white">
              연결 중...
            </Typography>
          </Box>
        )}
      </Box>

      {/* 컨트롤 바 */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider'
      }}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <IconButton
            onClick={handleToggleAudio}
            color={isAudioEnabled ? 'default' : 'error'}
            size="large"
          >
            {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
          </IconButton>

          <IconButton
            onClick={handleToggleVideo}
            color={isVideoEnabled ? 'default' : 'error'}
            size="large"
          >
            {isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>

          <IconButton
            onClick={handleEndCall}
            color="error"
            size="large"
            sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
          >
            <CallEndIcon />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
};

export default CallPage;
