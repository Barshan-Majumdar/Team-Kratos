import { io } from 'socket.io-client';

let socketInstance = null;

export const initSocket = (API_BASE) => {
  if (!socketInstance) {
    socketInstance = io(API_BASE, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
    });
    
    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }
  return socketInstance;
};

export const getSocket = () => {
  if (!socketInstance) {
    throw new Error('Socket not initialized. Call initSocket first.');
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
