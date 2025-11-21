/**
 * Chat context provider.
 */

'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface ChatContextType {
  unreadCount: number;
  onlineUsers: string[];
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * ChatProvider component.
 * TODO: Manage WebSocket connection and chat state globally
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // TODO: Establish WebSocket connection
    // TODO: Listen for unread count updates
    // TODO: Listen for online user updates
    return () => {
      // TODO: Close WebSocket on unmount
    };
  }, []);

  return (
    <ChatContext.Provider value={{ unreadCount, onlineUsers, isConnected }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
