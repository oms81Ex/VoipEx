const mediasoup = require('mediasoup');
const logger = require('../utils/logger');

let worker;
const rooms = new Map();

const config = {
  mediasoup: {
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp']
    },
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1
          }
        }
      ]
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP
        }
      ],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      maxIncomingBitrate: 1500000
    }
  }
};

class WebRTCService {
  static async initialize() {
    try {
      worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel,
        logTags: config.mediasoup.worker.logTags,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort
      });

      worker.on('died', () => {
        logger.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
        setTimeout(() => process.exit(1), 2000);
      });

      logger.info('mediasoup worker created [pid:%d]', worker.pid);
    } catch (error) {
      logger.error('failed to create mediasoup worker:', error);
      throw error;
    }
  }

  static async createRoom(roomId) {
    if (rooms.has(roomId)) {
      return rooms.get(roomId);
    }

    try {
      const router = await worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
      const room = {
        router,
        peers: new Map(),
        transports: new Map()
      };
      rooms.set(roomId, room);
      return room;
    } catch (error) {
      logger.error('failed to create room:', error);
      throw error;
    }
  }

  static async createWebRtcTransport(roomId, peerId) {
    const room = rooms.get(roomId);
    if (!room) {
      throw new Error(`room with id "${roomId}" not found`);
    }

    try {
      const transport = await room.router.createWebRtcTransport({
        ...config.mediasoup.webRtcTransport,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      });

      transport.on('dtlsstatechange', dtlsState => {
        if (dtlsState === 'closed') {
          transport.close();
        }
      });

      transport.on('close', () => {
        logger.info('transport closed', { roomId, peerId });
      });

      room.transports.set(transport.id, transport);
      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      };
    } catch (error) {
      logger.error('failed to create WebRTC transport:', error);
      throw error;
    }
  }

  static async connectTransport(roomId, transportId, dtlsParameters) {
    const room = rooms.get(roomId);
    if (!room) {
      throw new Error(`room with id "${roomId}" not found`);
    }

    const transport = room.transports.get(transportId);
    if (!transport) {
      throw new Error(`transport with id "${transportId}" not found`);
    }

    await transport.connect({ dtlsParameters });
  }

  static closeRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    room.peers.forEach(peer => peer.close());
    room.transports.forEach(transport => transport.close());
    room.router.close();
    rooms.delete(roomId);
  }
}

module.exports = WebRTCService; 