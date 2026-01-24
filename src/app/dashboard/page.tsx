'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';

// --- Types ---
interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  verified?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachment?: string;
  fileName?: string;
}

type ViewState = 'home' | 'chat' | 'profile';

// --- Separate ChatView Component (Memoized) ---
interface ChatViewProps {
  messages: Message[];
  chatInput: string;
  selectedFile: File | null;
  isTyping: boolean;
  onChatInputChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onClose: () => void;
  chatInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const ChatView = memo(function ChatViewComponent({
  messages,
  chatInput,
  selectedFile,
  isTyping,
  onChatInputChange,
  onSendMessage,
  onFileSelect,
  onRemoveFile,
  onClose,
  chatInputRef,
  fileInputRef,
  messagesEndRef,
}: ChatViewProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-5xl mx-auto">
      <div className="flex-1 overflow-hidden rounded-3xl bg-white/40 dark:bg-white/5 shadow-2xl backdrop-blur-xl border border-white/20 ring-1 ring-gray-900/5 flex flex-col">
        {/* Header with Close Button */}
        <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Chat</h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            title="Close (or press Esc)"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          {messages.map((msg, i) => (
            <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.attachment && (
                  <div className="p-2 bg-white/10 rounded-lg border border-white/20">
                    {msg.attachment.startsWith('data:image') ? 
                      <img src={msg.attachment} className="max-h-40 rounded" alt="upload" /> :
                      <div className="flex items-center gap-2 text-xs text-gray-200"><span className="p-1 bg-white/20 rounded">FILE</span> {msg.fileName}</div>
                    }
                  </div>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white/70 dark:bg-white/10 text-gray-800 dark:text-gray-100 rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isTyping && <div className="text-xs text-gray-500 animate-pulse ml-4">AI is thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white/30 dark:bg-black/20 border-t border-white/20">
          {selectedFile && (
            <div className="mb-2 inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 px-3 py-1 rounded-lg text-xs text-blue-800 dark:text-blue-200">
              <span className="max-w-[150px] truncate">{selectedFile.name}</span>
              <button onClick={onRemoveFile} className="hover:text-red-500">×</button>
            </div>
          )}
          <form onSubmit={onSendMessage} className="relative flex gap-2">
            <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-white/50 dark:bg-white/10 rounded-xl hover:bg-white/80 transition text-gray-500 dark:text-gray-300">
              📎
            </button>
            <input
              ref={chatInputRef}
              autoFocus
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              placeholder="Type your message..."
              className="w-full bg-white/50 dark:bg-black/20 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white"
            />
            <button type="submit" disabled={!chatInput.trim() && !selectedFile} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
});

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewState>('home');

  // --- Chat State (Lifted so it persists between views) ---
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your AI assistant. Ready to help.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // --- Auth Check ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userStr));
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // --- Load chat messages when opening chat ---
  useEffect(() => {
    if (activeView === 'chat') {
      const loadMessages = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/chat/load', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          
          if (response.ok && data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((msg: any) => ({
              role: msg.role,
              content: msg.message,
              attachment: msg.attachment || undefined,
              fileName: msg.file_name || undefined,
            })));
          }
        } catch (error) {
          console.error('Failed to load messages:', error);
        }
      };
      
      loadMessages();
    }
  }, [activeView]);

  // --- Scroll to bottom when opening chat or receiving message ---
  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      // Focus the input when entering chat view
      setTimeout(() => chatInputRef.current?.focus(), 0);
    }
  }, [messages, isTyping, activeView]);

  // --- Handle Escape key to close chat ---
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      // Only trigger on Escape key and only if chat is active
      if (e.key === 'Escape' && activeView === 'chat') {
        e.preventDefault();
        setActiveView('home');
      }
    };
    
    // Only add listener when in chat view
    if (activeView === 'chat') {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [activeView]);

  // --- Handlers ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email })
      });
      const data = await response.json();
      if (response.ok) alert("Verification email sent!");
      else alert(data.error || "Failed");
    } catch (error) {
      alert("Error sending email");
    }
  };

  // --- Chat Helpers ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !selectedFile) return;

    const userMessage = chatInput.trim();
    let fileData = null;
    let fileName = null;

    if (selectedFile) {
      try {
        fileData = await convertToBase64(selectedFile);
        fileName = selectedFile.name;
      } catch (err) {
        console.error(err);
        return;
      }
    }

    setChatInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsTyping(true);

    const newUserMessage = { 
      role: 'user' as const,
      content: userMessage,
      attachment: fileData || undefined,
      fileName: fileName || undefined
    };

    setMessages(prev => [...prev, newUserMessage]);

    // Save user message to database
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/chat/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: userMessage, 
          role: 'user',
          attachment: fileData || null,
          fileName: fileName || null
        }),
      });
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, file: fileData, fileName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      const assistantMessage = { role: 'assistant' as const, content: data.reply };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to database
      try {
        await fetch('/api/chat/save', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: data.reply, role: 'assistant' }),
        });
      } catch (error) {
        console.error('Failed to save assistant message:', error);
      }
    } catch (error) {
      const errorMessage = { role: 'assistant' as const, content: "Error connecting to AI." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  // --- Components for each View ---

  const HomeView = () => (
    <div className="max-w-4xl mx-auto w-full animate-fade-in-up">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, {user.name}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          What would you like to do today?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chat Button Card */}
        <button
          onClick={() => setActiveView('chat')}
          className="group relative overflow-hidden rounded-3xl bg-white/40 dark:bg-white/5 p-8 text-left shadow-xl backdrop-blur-xl border border-white/20 hover:border-blue-500/50 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-32 h-32 text-blue-600 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">AI Chat</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ask questions, upload files, and get help from GPT-4o.</p>
          </div>
        </button>

        {/* Profile Button Card */}
        <button
          onClick={() => setActiveView('profile')}
          className="group relative overflow-hidden rounded-3xl bg-white/40 dark:bg-white/5 p-8 text-left shadow-xl backdrop-blur-xl border border-white/20 hover:border-purple-500/50 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-32 h-32 text-purple-600 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">My Profile</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account details and verification status.</p>
          </div>
        </button>
      </div>
    </div>
  );

  const ProfileView = () => (
    <div className="max-w-2xl mx-auto w-full animate-fade-in-up">
      <div className="group relative overflow-hidden rounded-3xl bg-white/40 dark:bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Details</h2>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${user.verified ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
            {user.verified ? 'Verified' : 'Unverified'}
          </div>
        </div>

        <div className="space-y-4">
           <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500 uppercase">Full Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
           </div>
           <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500 uppercase">Email Address</p>
              <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
           </div>
           <div className="p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500 uppercase">Joined</p>
              <p className="font-medium text-gray-900 dark:text-white">{new Date(user.created_at).toLocaleDateString()}</p>
           </div>
        </div>

        {!user.verified && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 flex items-center justify-between">
            <span className="text-sm text-amber-800 dark:text-amber-200">Verify your email to unlock features</span>
            <button onClick={handleResendVerification} className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg transition">Resend</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-950 selection:bg-blue-500/30 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[100px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-400/20 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 w-full border-b border-white/10 bg-white/30 dark:bg-black/20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <button 
            onClick={() => setActiveView('home')} 
            className="text-xl font-bold text-gray-900 dark:text-white hover:opacity-80 transition"
          >
            Dashboard
          </button>
          <div className="flex items-center gap-4">
            {activeView !== 'home' && (
              <button 
                onClick={() => setActiveView('home')}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-500 transition"
              >
                Back to Home
              </button>
            )}
            <button 
              onClick={handleLogout} 
              className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        {activeView === 'home' && <HomeView />}
        {activeView === 'profile' && <ProfileView />}
        {activeView === 'chat' && (
          <ChatView
            messages={messages}
            chatInput={chatInput}
            selectedFile={selectedFile}
            isTyping={isTyping}
            onChatInputChange={setChatInput}
            onSendMessage={handleSendMessage}
            onFileSelect={handleFileSelect}
            onRemoveFile={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value=''; }}
            onClose={() => setActiveView('home')}
            chatInputRef={chatInputRef}
            fileInputRef={fileInputRef}
            messagesEndRef={messagesEndRef}
          />
        )}
      </main>
    </div>
  );
}