import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseGuestCallProps {
  socket: Socket | null;
  currentUserId: string;
  onIncomingCall?: (caller: { id: string; name: string; callType: 'audio' | 'video' }) => void;
  onCallEnded?: () => void;
}

export const useGuestCall = ({ socket, currentUserId, onIncomingCall, onCallEnded }: UseGuestCallProps) => {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callPartner, setCallPartner] = useState<{ id: string; name: string } | null>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');

  // ICE 서버 설정
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // TURN 서버가 있다면 추가
      ...(import.meta.env.VITE_TURN_URL ? [{
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL
      }] : [])
    ]
  };

  const createPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection(iceServers);

    // ICE Candidate 이벤트
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && callPartner) {
        console.log('Sending ICE candidate');
        socket.emit('ice-candidate', {
          to: callPartner.id,
          candidate: event.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
      }
    };

    // 원격 스트림 수신
    pc.ontrack = (event) => {
      console.log('Received remote stream');
      remoteStream.current = event.streams[0];
    };

    // 연결 상태 모니터링
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [socket, callPartner]);

  useEffect(() => {
    if (!socket) return;

    // 통화 수신 처리
    socket.on('offer', async (data: { from: string; sdp: RTCSessionDescriptionInit }) => {
      console.log('Received offer from:', data.from);
      
      try {
        // PeerConnection 생성
        const pc = await createPeerConnection();
        
        // 원격 설명 설정
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        
        // 통화 타입 감지 (SDP에서 비디오 트랙 확인)
        const hasVideo = data.sdp.sdp?.includes('m=video');
        const detectedCallType = hasVideo ? 'video' : 'audio';
        setCallType(detectedCallType);
        
        // 수신 통화 알림
        if (onIncomingCall) {
          onIncomingCall({ 
            id: data.from, 
            name: data.from, // 실제로는 게스트 정보에서 이름을 가져와야 함
            callType: detectedCallType
          });
        }
        
        setCallPartner({ id: data.from, name: data.from });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    // Answer 수신 처리
    socket.on('answer', async (data: { from: string; sdp: RTCSessionDescriptionInit }) => {
      console.log('Received answer from:', data.from);
      try {
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    // ICE Candidate 수신 처리
    socket.on('iceCandidate', async (data: { 
      from: string; 
      candidate: RTCIceCandidateInit;
      sdpMid: string | null;
      sdpMLineIndex: number | null;
    }) => {
      console.log('Received ICE candidate from:', data.from);
      try {
        if (peerConnection.current && data.candidate) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    // 통화 종료 신호
    socket.on('call-ended', (data: { from: string }) => {
      console.log('Call ended by:', data.from);
      endCall();
    });

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('iceCandidate');
      socket.off('call-ended');
    };
  }, [socket, createPeerConnection, onIncomingCall]);

  const startCall = async (targetUserId: string, targetUserName: string, callType: 'audio' | 'video') => {
    try {
      console.log(`Starting ${callType} call with ${targetUserName} (${targetUserId})`);
      
      // 미디어 스트림 획득
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 통화 상대 설정
      setCallPartner({ id: targetUserId, name: targetUserName });
      setCallType(callType);
      
      // PeerConnection 생성
      const pc = await createPeerConnection();
      
      // 로컬 스트림 추가
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current!);
      });
      
      // Offer 생성
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Offer 전송
      if (socket) {
        socket.emit('offer', {
          to: targetUserId,
          sdp: offer
        });
      }
      
      setIsCallActive(true);
    } catch (error) {
      console.error('Failed to start call:', error);
      endCall();
    }
  };

  const acceptCall = async () => {
    try {
      if (!peerConnection.current || !callPartner) {
        throw new Error('No incoming call to accept');
      }
      
      console.log(`Accepting ${callType} call from ${callPartner.name}`);
      
      // 미디어 스트림 획득
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      
      localStream.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 로컬 스트림 추가
      localStream.current.getTracks().forEach(track => {
        peerConnection.current!.addTrack(track, localStream.current!);
      });
      
      // Answer 생성
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      // Answer 전송
      if (socket) {
        socket.emit('answer', {
          to: callPartner.id,
          sdp: answer
        });
      }
      
      setIsCallActive(true);
    } catch (error) {
      console.error('Failed to accept call:', error);
      endCall();
    }
  };

  const rejectCall = () => {
    if (socket && callPartner) {
      socket.emit('call-rejected', {
        to: callPartner.id
      });
    }
    endCall();
  };

  const endCall = () => {
    console.log('Ending call');
    
    // 상대방에게 통화 종료 알림
    if (socket && callPartner && isCallActive) {
      socket.emit('call-ended', {
        to: callPartner.id
      });
    }
    
    // 스트림 정리
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    
    if (remoteStream.current) {
      remoteStream.current.getTracks().forEach(track => track.stop());
      remoteStream.current = null;
    }
    
    // PeerConnection 정리
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    setIsCallActive(false);
    setCallPartner(null);
    
    if (onCallEnded) {
      onCallEnded();
    }
  };

  const toggleAudio = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  };

  return {
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    isCallActive,
    callPartner,
    callType,
    localStream: localStream.current,
    remoteStream: remoteStream.current
  };
};
