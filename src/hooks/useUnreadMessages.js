import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import {
  fetchUnreadMessageCount,
  subscribeToIncomingMessages
} from '../services/messagingService';

export const useUnreadMessages = (currentUserId, { enableToasts = true } = {}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!currentUserId || !supabase) {
      setUnreadCount(0);
      return 0;
    }

    setLoading(true);
    try {
      const count = await fetchUnreadMessageCount(currentUserId);
      setUnreadCount(count);
      return count;
    } catch (error) {
      console.warn('Could not load unread message count:', error?.message || error);
      return unreadCount;
    } finally {
      setLoading(false);
    }
  }, [currentUserId, unreadCount]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!currentUserId || !supabase) return undefined;

    const channel = subscribeToIncomingMessages({
      currentUserId,
      onMessage: (payload) => {
        setUnreadCount((count) => count + 1);
        window.dispatchEvent(new CustomEvent('fap-message-received', {
          detail: payload.new
        }));

        if (enableToasts) {
          const isReminder = payload.new?.message_type === 'reminder';
          toast.success(isReminder ? 'New reminder received' : 'New message received', {
            duration: 3500
          });
        }
      }
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUserId, enableToasts]);

  useEffect(() => {
    const handleRefresh = () => {
      refreshUnreadCount();
    };

    window.addEventListener('fap-messages-read', handleRefresh);
    window.addEventListener('fap-message-sent', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.removeEventListener('fap-messages-read', handleRefresh);
      window.removeEventListener('fap-message-sent', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [refreshUnreadCount]);

  return {
    unreadCount,
    unreadLoading: loading,
    refreshUnreadCount
  };
};

export default useUnreadMessages;
