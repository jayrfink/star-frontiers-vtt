import { io } from 'socket.io-client';

export const socket = io({
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true,
});
