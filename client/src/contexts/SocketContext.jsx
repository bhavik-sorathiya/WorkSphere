/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io as socketConnect } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import { useToast } from './ToastContext';

const API = import.meta.env.VITE_API_URL;
const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { showToast } = useToast();
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && !socketRef.current) {
      const s = socketConnect(API, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
      socketRef.current = s;
      setSocket(s);

      s.on('connect', () => {
        if (userId) s.emit('join_user', userId);
      });

      s.on('notification', (data) => {
        showToast(data.message || "New notification", data.type || "info");
      });

      return () => {
        s.disconnect();
        socketRef.current = null;
      };
    }

    if (isLoaded && !isSignedIn && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
  }, [isLoaded, isSignedIn, userId, showToast]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
