import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import ChatWindow from './ChatWindow';

interface ChatButtonProps {
  initialPartnerId?: string | null;
  initialPartnerName?: string | null;
}

export default function ChatButton({ 
  initialPartnerId = null, 
  initialPartnerName = null 
}: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { totalUnreadCount, loadConversations } = useChat();

  const handleOpen = () => {
    loadConversations();
    setIsOpen(true);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <MessageCircle className="w-6 h-6" />
        
        {/* Unread Badge */}
        {totalUnreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      <ChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialPartnerId={initialPartnerId}
        initialPartnerName={initialPartnerName}
      />
    </>
  );
}

// Compact inline chat button for partner cards, etc.
interface InlineChatButtonProps {
  partnerId: string;
  partnerName: string;
  size?: 'sm' | 'md';
}

export function InlineChatButton({ 
  partnerId, 
  partnerName,
  size = 'md'
}: InlineChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = size === 'sm' 
    ? 'p-1.5' 
    : 'p-2';

  const iconClasses = size === 'sm'
    ? 'w-4 h-4'
    : 'w-5 h-5';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`${sizeClasses} rounded-full bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 transition-colors`}
        title={`Nachricht an ${partnerName}`}
      >
        <MessageCircle className={iconClasses} />
      </button>

      <ChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialPartnerId={partnerId}
        initialPartnerName={partnerName}
      />
    </>
  );
}
