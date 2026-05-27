import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  MailPlus,
  MessageSquare,
  RefreshCw,
  Send,
  UserRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchAllowedMessageRecipients,
  fetchMessageThreads,
  fetchThreadMessages,
  findOrCreateThread,
  markThreadMessagesRead,
  sendMessage
} from '../services/messagingService';
import {
  formatRelativeMessageTime,
  formatThreadTitle,
  getOtherParticipant,
  getRecipientRoleLabel,
  isThreadParticipant
} from '../services/messagingRules';
import './Messages.css';

const emptyComposer = {
  body: '',
  messageType: 'message',
  priority: 'normal',
  dueDate: ''
};

const getParticipantSubtitle = (participant) => {
  if (!participant) return '';
  if (participant.role === 'student') {
    const batch = participant.year_of_joining ? `Batch ${participant.year_of_joining}` : 'Student';
    const roll = participant.registration_number ? ` - ${participant.registration_number}` : '';
    return `${batch}${roll}`;
  }
  if (participant.role === 'teacher') return participant.department || 'Faculty Mentor';
  return getRecipientRoleLabel(participant);
};

const Messages = () => {
  const { profile } = useAuth();
  const [threads, setThreads] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [composer, setComposer] = useState(emptyComposer);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedRecipient = useMemo(() => (
    recipients.find((recipient) => recipient.id === selectedRecipientId) || null
  ), [recipients, selectedRecipientId]);

  const activeRecipient = useMemo(() => (
    activeThread ? getOtherParticipant(activeThread, profile?.id) : selectedRecipient
  ), [activeThread, profile?.id, selectedRecipient]);

  const activeThreadIsWritable = useMemo(() => (
    !activeThread || isThreadParticipant(activeThread, profile?.id)
  ), [activeThread, profile?.id]);

  const loadThreads = useCallback(async () => {
    if (!profile?.id) return [];
    const nextThreads = await fetchMessageThreads(profile.id);
    setThreads(nextThreads);

    setActiveThread((current) => {
      if (!current) return null;
      return nextThreads.find((thread) => thread.id === current.id) || current;
    });
    return nextThreads;
  }, [profile?.id]);

  const loadInitialData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    try {
      const [nextRecipients] = await Promise.all([
        fetchAllowedMessageRecipients(profile),
        loadThreads()
      ]);
      setRecipients(nextRecipients);
    } catch (loadError) {
      console.error('Could not load messages:', loadError);
      setError(loadError.message || 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [loadThreads, profile]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const openThread = useCallback(async (thread) => {
    if (!thread?.id || !profile?.id) return;
    setActiveThread(thread);
    setSelectedRecipientId('');
    setMessagesLoading(true);
    setError('');

    try {
      const nextMessages = await fetchThreadMessages(thread.id);
      setMessages(nextMessages);
      await markThreadMessagesRead({ threadId: thread.id, currentUserId: profile.id });
      window.dispatchEvent(new Event('fap-messages-read'));
      await loadThreads();
    } catch (threadError) {
      console.error('Could not load thread:', threadError);
      setError(threadError.message || 'Could not load this conversation.');
    } finally {
      setMessagesLoading(false);
    }
  }, [loadThreads, profile?.id]);

  useEffect(() => {
    const handleIncoming = async (event) => {
      const message = event.detail;
      await loadThreads();
      if (message?.thread_id && activeThread?.id === message.thread_id) {
        const nextMessages = await fetchThreadMessages(message.thread_id);
        setMessages(nextMessages);
        await markThreadMessagesRead({ threadId: message.thread_id, currentUserId: profile.id });
        window.dispatchEvent(new Event('fap-messages-read'));
      }
    };

    window.addEventListener('fap-message-received', handleIncoming);
    return () => window.removeEventListener('fap-message-received', handleIncoming);
  }, [activeThread?.id, loadThreads, profile?.id]);

  const startNewConversation = () => {
    setActiveThread(null);
    setMessages([]);
    setComposer(emptyComposer);
  };

  const startAdminConversationWith = (participant) => {
    if (!participant?.id) return;
    setActiveThread(null);
    setMessages([]);
    setSelectedRecipientId(participant.id);
    setComposer(emptyComposer);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!profile?.id) return;

    const recipientId = activeThread
      ? getOtherParticipant(activeThread, profile.id)?.id
      : selectedRecipientId;

    if (activeThread && !isThreadParticipant(activeThread, profile.id)) {
      toast.error('Open a separate admin conversation to send this message.');
      return;
    }

    if (!recipientId) {
      toast.error('Select a recipient first.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const thread = activeThread || await findOrCreateThread({
        currentUserId: profile.id,
        recipientId,
        actorRole: profile.role
      });

      await sendMessage({
        threadId: thread.id,
        senderId: profile.id,
        recipientId,
        body: composer.body,
        messageType: composer.messageType,
        priority: composer.priority,
        dueDate: composer.dueDate || null
      });

      setComposer(emptyComposer);
      window.dispatchEvent(new Event('fap-message-sent'));
      const nextThreads = await loadThreads();
      await openThread(nextThreads.find((item) => item.id === thread.id) || thread);
      toast.success(composer.messageType === 'reminder' ? 'Reminder sent.' : 'Message sent.');
    } catch (sendError) {
      console.error('Could not send message:', sendError);
      toast.error(sendError.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const conversationHeading = activeThread
    ? formatThreadTitle(activeThread, profile?.id)
    : selectedRecipient
      ? selectedRecipient.full_name || selectedRecipient.username
      : 'Select a conversation';

  return (
    <div className="messages-page">
      <header className="messages-header">
        <div>
          <div className="messages-kicker">
            <MessageSquare size={16} />
            Role-based communication
          </div>
          <h1>Messages</h1>
          <p>Send instructions, reminders, and replies within assigned mentorship channels.</p>
        </div>
        <button className="messages-refresh" onClick={loadInitialData} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </header>

      {error && (
        <div className="messages-error">
          {error}
        </div>
      )}

      <div className="messages-shell">
        <aside className="thread-list">
          <div className="thread-list-header">
            <div>
              <h2>Inbox</h2>
              <span>{threads.length} conversation{threads.length === 1 ? '' : 's'}</span>
            </div>
            <button onClick={startNewConversation} title="New message">
              <MailPlus size={18} />
            </button>
          </div>

          {loading ? (
            <div className="thread-empty">
              <Loader2 size={22} className="spin" />
              Loading messages
            </div>
          ) : threads.length === 0 ? (
            <div className="thread-empty">
              <Inbox size={24} />
              No conversations yet
            </div>
          ) : (
            <div className="thread-scroll">
              {threads.map((thread) => {
                const other = getOtherParticipant(thread, profile?.id);
                const isActive = activeThread?.id === thread.id;
                return (
                  <button
                    type="button"
                    key={thread.id}
                    className={`thread-row ${isActive ? 'active' : ''}`}
                    onClick={() => openThread(thread)}
                  >
                    <div className="thread-avatar">
                      {(other?.full_name || other?.username || '?').charAt(0)}
                    </div>
                    <div className="thread-copy">
                      <div className="thread-title-line">
                        <strong>{formatThreadTitle(thread, profile?.id)}</strong>
                        <span>{formatRelativeMessageTime(thread.latest_message?.created_at || thread.last_message_at)}</span>
                      </div>
                      <p>{thread.latest_message?.body || 'No messages yet'}</p>
                      <small>{getParticipantSubtitle(other)}</small>
                    </div>
                    {thread.unread_count > 0 && (
                      <span className="thread-unread">{thread.unread_count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="message-panel">
          <div className="message-panel-header">
            <div className="message-peer">
              <div className="peer-icon">
                <UserRound size={20} />
              </div>
              <div>
                <h2>{conversationHeading}</h2>
                <p>{getParticipantSubtitle(activeRecipient) || 'Choose a recipient to start'}</p>
              </div>
            </div>
            {activeThread?.thread_type === 'admin' && (
              <span className="thread-type">
                <Bell size={14} />
                Admin thread
              </span>
            )}
          </div>

          {!activeThread && (
            <div className="recipient-picker">
              <label htmlFor="message-recipient">To</label>
              <select
                id="message-recipient"
                value={selectedRecipientId}
                onChange={(event) => setSelectedRecipientId(event.target.value)}
              >
                <option value="">Select recipient...</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.full_name || recipient.username} - {getRecipientRoleLabel(recipient)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="message-stream">
            {messagesLoading ? (
              <div className="message-empty">
                <Loader2 size={24} className="spin" />
                Loading conversation
              </div>
            ) : !activeThread && !selectedRecipientId ? (
              <div className="message-empty">
                <MessageSquare size={28} />
                Select a conversation or choose a recipient.
              </div>
            ) : messages.length === 0 ? (
              <div className="message-empty">
                <Send size={28} />
                Start the conversation with a clear instruction or reminder.
              </div>
            ) : (
              messages.map((message) => {
                const mine = message.sender_id === profile?.id;
                return (
                  <article key={message.id} className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>
                    <div className="message-meta">
                      <span>{message.sender?.full_name || (mine ? 'You' : 'User')}</span>
                      <time>{new Date(message.created_at).toLocaleString()}</time>
                    </div>
                    <p>{message.body}</p>
                    <div className="message-flags">
                      {message.message_type === 'reminder' && (
                        <span className="message-chip reminder">
                          <Bell size={12} />
                          Reminder
                        </span>
                      )}
                      {message.priority === 'important' && (
                        <span className="message-chip important">Important</span>
                      )}
                      {message.due_date && (
                        <span className="message-chip">
                          <Clock size={12} />
                          Due {new Date(`${message.due_date}T00:00:00`).toLocaleDateString()}
                        </span>
                      )}
                      {mine && message.read_at && (
                        <span className="message-chip read">
                          <CheckCircle2 size={12} />
                          Read
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {!activeThreadIsWritable ? (
            <div className="message-audit-footer">
              <div>
                <strong>Admin view only</strong>
                <p>This is a mentor-student conversation. Start a separate admin conversation to send a message or reminder.</p>
              </div>
              <div className="audit-actions">
                <button type="button" onClick={() => startAdminConversationWith(activeThread?.participant_one)}>
                  Message {activeThread?.participant_one?.full_name || 'Participant 1'}
                </button>
                <button type="button" onClick={() => startAdminConversationWith(activeThread?.participant_two)}>
                  Message {activeThread?.participant_two?.full_name || 'Participant 2'}
                </button>
              </div>
            </div>
          ) : (
            <form className="message-composer" onSubmit={handleSend}>
              <div className="composer-toolbar">
                <select
                  value={composer.messageType}
                  onChange={(event) => setComposer((current) => ({
                    ...current,
                    messageType: event.target.value,
                    dueDate: event.target.value === 'reminder' ? current.dueDate : ''
                  }))}
                >
                  <option value="message">Message</option>
                  <option value="reminder">Reminder</option>
                </select>
                <select
                  value={composer.priority}
                  onChange={(event) => setComposer((current) => ({
                    ...current,
                    priority: event.target.value
                  }))}
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                </select>
                {composer.messageType === 'reminder' && (
                  <input
                    type="date"
                    value={composer.dueDate}
                    onChange={(event) => setComposer((current) => ({
                      ...current,
                      dueDate: event.target.value
                    }))}
                  />
                )}
              </div>
              <div className="composer-row">
                <textarea
                  value={composer.body}
                  onChange={(event) => setComposer((current) => ({
                    ...current,
                    body: event.target.value
                  }))}
                  placeholder="Type your instruction, reminder, or reply..."
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={sending || (!activeThread && !selectedRecipientId)}
                  title="Send message"
                >
                  {sending ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default Messages;
