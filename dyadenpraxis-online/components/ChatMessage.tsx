import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import type { Message } from '../hooks/useChat';

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
  showTimestamp?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn, showTimestamp = true }) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    } else {
      return date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-2
          ${isOwn 
            ? 'bg-amber-600 text-white rounded-br-md' 
            : 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 rounded-bl-md'
          }
        `}
      >
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        
        {/* Timestamp and read status */}
        {showTimestamp && (
          <div className={`
            flex items-center justify-end gap-1 mt-1
            ${isOwn ? 'text-amber-100' : 'text-stone-500 dark:text-stone-400'}
          `}>
            <span className="text-[10px]">
              {formatTime(message.created_at)}
            </span>
            
            {/* Read status indicator (only for own messages) */}
            {isOwn && (
              message.read_at ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Date separator component for chat
interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Heute';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Gestern';
    } else {
      return d.toLocaleDateString('de-DE', { 
        weekday: 'long',
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
      });
    }
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-stone-200 dark:bg-stone-700 px-3 py-1 rounded-full">
        <span className="text-xs text-stone-600 dark:text-stone-400">
          {formatDate(date)}
        </span>
      </div>
    </div>
  );
}

export default ChatMessage;
