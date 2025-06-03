import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream: MediaStream;
}

export const useWebRTC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerConnection[]>([]);
  const socketRef = useRef<Socket>();
  const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const { token } = useSelector((state: RootState) => state.auth);

  const createPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:your-turn-server.com:3478',
          username: 'username',
          credential: 'password'
        }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          targetUserId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setPeers((prevPeers) => {
        const existingPeer = prevPeers.find((p) => p.userId === targetUserId);
        if (existingPeer) {
          return prevPeers.map((p) =>
            p.userId === targetUserId ? { ...p, stream } : p
          );
        }
        return [...prevPeers, { userId: targetUserId, connection: pc, stream }];
      });
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    return pc;
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};
    setPeers([]);

    // Disconnect socket
    socketRef.current?.disconnect();
  };

  const toggleAudioTrack = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  };

  const toggleVideoTrack = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  };

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3004', {
      auth: { token }
    });

    const socket = socketRef.current;

    socket.on('offer', async ({ userId, offer }) => {
      const pc = createPeerConnection(userId);
      peerConnectionsRef.current[userId] = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', {
        targetUserId: userId,
        answer
      });
    });

    socket.on('answer', async ({ userId, answer }) => {
      const pc = peerConnectionsRef.current[userId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ userId, candidate }) => {
      const pc = peerConnectionsRef.current[userId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('user-left', ({ userId }) => {
      const pc = peerConnectionsRef.current[userId];
      if (pc) {
        pc.close();
        delete peerConnectionsRef.current[userId];
        setPeers((prevPeers) => prevPeers.filter((p) => p.userId !== userId));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return {
    localStream,
    peers,
    startLocalStream,
    stopLocalStream,
    toggleAudioTrack,
    toggleVideoTrack
  };
}; 