import { useEffect, useRef } from 'react';
import { Box, Grid, Paper } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff } from '@mui/icons-material';

interface VideoGridProps {
  localStream: MediaStream | null;
  peers: Array<{
    userId: string;
    stream: MediaStream;
  }>;
  isLocalAudioEnabled: boolean;
  isLocalVideoEnabled: boolean;
}

const VideoGrid = ({
  localStream,
  peers,
  isLocalAudioEnabled,
  isLocalVideoEnabled
}: VideoGridProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const calculateGridSize = () => {
    const totalParticipants = peers.length + 1; // Including local user
    if (totalParticipants <= 2) return 12;
    if (totalParticipants <= 4) return 6;
    if (totalParticipants <= 9) return 4;
    return 3;
  };

  const gridSize = calculateGridSize();

  return (
    <Box sx={{ p: 2, height: '100%' }}>
      <Grid container spacing={2}>
        {/* Local video */}
        <Grid item xs={12} sm={gridSize}>
          <Paper
            elevation={3}
            sx={{
              position: 'relative',
              paddingTop: '56.25%', // 16:9 Aspect Ratio
              backgroundColor: 'black'
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                display: 'flex',
                gap: 1,
                color: 'white'
              }}
            >
              {isLocalAudioEnabled ? <Mic /> : <MicOff />}
              {isLocalVideoEnabled ? <Videocam /> : <VideocamOff />}
            </Box>
          </Paper>
        </Grid>

        {/* Remote videos */}
        {peers.map((peer) => (
          <Grid key={peer.userId} item xs={12} sm={gridSize}>
            <Paper
              elevation={3}
              sx={{
                position: 'relative',
                paddingTop: '56.25%',
                backgroundColor: 'black'
              }}
            >
              <RemoteVideo stream={peer.stream} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const RemoteVideo = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }}
    />
  );
};

export default VideoGrid; 