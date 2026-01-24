'use client';

import { useEffect, useState, useRef, memo, useCallback } from 'react';
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

interface NutritionEntry {
  id: string;
  product_name: string;
  health_score: number;
  image_data?: string;
  nutrition_info?: {
    macronutrients: Record<string, string>;
    summary: string;
    alternativeSuggestion?: {
      productName: string;
      reason: string;
      healthScore: number;
      ingredients: Array<{
        name: string;
        healthRating: 'excellent' | 'good' | 'moderate' | 'poor' | 'avoid';
        reason: string;
      }>;
      macronutrients: Record<string, string>;
      summary: string;
    };
  };
  ingredients_breakdown?: Array<{
    name: string;
    healthRating: 'excellent' | 'good' | 'moderate' | 'poor' | 'avoid';
    reason: string;
  }>;
  created_at: string;
}

type ViewState = 'home' | 'chat' | 'profile' | 'nutrition';

// --- Separate ChatView Component (Memoized) ---
interface ChatViewProps {
  messages: Message[];
  chatInput: string;
  selectedFile: File | null;
  isTyping: boolean;
  chatLoading: boolean;
  onChatInputChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onClose: () => void;
  chatInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

// --- Fullscreen Image Modal Component ---
const ImageModal = ({ src, onClose }: { src: string; onClose: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt="fullscreen view"
          className="w-full h-full object-contain rounded-lg"
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 w-10 h-10 flex items-center justify-center transition"
          title="Close (or press Esc)"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

const ChatView = memo(function ChatViewComponent({
  messages,
  chatInput,
  selectedFile,
  isTyping,
  chatLoading,
  onChatInputChange,
  onSendMessage,
  onFileSelect,
  onRemoveFile,
  onClose,
  chatInputRef,
  fileInputRef,
  messagesEndRef,
}: ChatViewProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

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
          {chatLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading chat...</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.attachment && (
                      <div className="p-2 bg-white/10 rounded-lg border border-white/20">
                        {msg.attachment.startsWith('data:image') ? 
                          <img 
                            src={msg.attachment} 
                            className="max-h-40 rounded cursor-pointer hover:opacity-80 transition" 
                            alt="upload"
                            onClick={() => setFullscreenImage(msg.attachment || null)}
                          /> :
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
            </>
          )}
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

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <ImageModal src={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      )}
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
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // --- Nutrition State ---
  const [nutritionHistory, setNutritionHistory] = useState<NutritionEntry[]>([]);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [nutritionFile, setNutritionFile] = useState<File | null>(null);
  const [nutritionProductName, setNutritionProductName] = useState('');
  const [nutritionProductUrl, setNutritionProductUrl] = useState('');
  const [nutritionAnalyzing, setNutritionAnalyzing] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<NutritionEntry | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const nutritionFileInputRef = useRef<HTMLInputElement>(null);

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
        setChatLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/chat/load', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          
          console.log('Loaded chat data:', data);
          
          if (response.ok && data.messages && data.messages.length > 0) {
            const mappedMessages = data.messages.map((msg: any) => {
              const mapped = {
                role: msg.role,
                content: msg.message,
                attachment: msg.attachment || undefined,
                fileName: msg.file_name || undefined,
              };
              console.log('Mapped message:', { hasAttachment: !!mapped.attachment, fileName: mapped.fileName });
              return mapped;
            });
            console.log('Setting messages, count:', mappedMessages.length);
            setMessages(mappedMessages);
          } else {
            // No previous messages, show greeting
            setMessages([
              { role: 'assistant', content: 'Hello! I am your AI assistant. Ready to help.' }
            ]);
          }
        } catch (error) {
          console.error('Failed to load messages:', error);
          setMessages([
            { role: 'assistant', content: 'Hello! I am your AI assistant. Ready to help.' }
          ]);
        } finally {
          setChatLoading(false);
        }
      };
      
      loadMessages();
    }
  }, [activeView]);

  // --- Load nutrition history when opening nutrition view ---
  useEffect(() => {
    if (activeView === 'nutrition') {
      const loadNutrition = async () => {
        setNutritionLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/nutrition/load', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          
          if (response.ok && data.entries) {
            setNutritionHistory(data.entries);
          }
        } catch (error) {
          console.error('Failed to load nutrition history:', error);
        } finally {
          setNutritionLoading(false);
        }
      };
      
      loadNutrition();
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const maxSizeMB = 10;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      
      if (file.size > maxSizeBytes) {
        alert(`File too large. Maximum size is ${maxSizeMB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }
      
      setSelectedFile(file);
      console.log('[FILE SELECT]:', { name: file.name, size: file.size, type: file.type });
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        console.log('[convertToBase64] Success:', {
          fileName: file.name,
          fileSize: file.size,
          base64Length: result.length,
          prefix: result.substring(0, 50),
        });
        resolve(result);
      };
      reader.onerror = error => {
        console.error('[convertToBase64] Error:', error);
        reject(error);
      };
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
        console.log('File converted to base64, size:', fileData.length, 'File:', fileName);
      } catch (err) {
        console.error('Error converting file:', err);
        return;
      }
    }

    setChatInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsTyping(true);

    const newUserMessage = { 
      role: 'user' as const,
      content: userMessage || '(Image/File attachment)',
      attachment: fileData || undefined,
      fileName: fileName || undefined
    };

    setMessages(prev => [...prev, newUserMessage]);

    // Save user message to database
    const token = localStorage.getItem('token');
    try {
      const savePayload = {
        message: userMessage || '(Image/File attachment)', 
        role: 'user',
        attachment: fileData || null,
        fileName: fileName || null
      };
      console.log('[SAVE PAYLOAD] Sending:', { 
        hasAttachment: !!fileData, 
        fileName, 
        messageLength: userMessage.length,
        attachmentSize: fileData?.length,
        payloadSize: JSON.stringify(savePayload).length
      });
      
      const saveResponse = await fetch('/api/chat/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(savePayload),
      });
      
      console.log('[SAVE RESPONSE] Status:', saveResponse.status);
      
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('[SAVE ERROR] Failed with status', saveResponse.status, ':', errorText);
      } else {
        const savedData = await saveResponse.json();
        console.log('[SAVE SUCCESS] Message saved:', {
          hasAttachmentInResponse: !!savedData.data?.[0]?.attachment,
          attachmentSizeInResponse: savedData.data?.[0]?.attachment?.length,
          fileName: savedData.data?.[0]?.file_name,
        });
      }
    } catch (error) {
      console.error('[SAVE EXCEPTION] Failed to save user message:', error);
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

  // --- Nutrition Handlers ---
  const handleNutritionFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const maxSizeMB = 10;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      
      if (file.size > maxSizeBytes) {
        alert(`File too large. Maximum size is ${maxSizeMB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      setNutritionFile(file);
    }
  }, []);

  const handleNutritionProductNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNutritionProductName(e.target.value);
  }, []);

  const handleNutritionProductUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNutritionProductUrl(e.target.value);
  }, []);

  const handleHistorySearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHistorySearchQuery(e.target.value);
  }, []);

  const convertNutritionFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyzeProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nutritionFile && !nutritionProductName.trim() && !nutritionProductUrl.trim()) {
      alert('Please upload a product image, enter a product name, or paste a product URL');
      return;
    }

    setNutritionAnalyzing(true);
    setCurrentAnalysis(null);

    try {
      let imageData = null;
      if (nutritionFile) {
        imageData = await convertNutritionFileToBase64(nutritionFile);
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/nutrition/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productImage: imageData,
          productName: nutritionProductName || null,
          productUrl: nutritionProductUrl || null
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setCurrentAnalysis(data.analysis);
      
      // Refresh nutrition history
      const historyResponse = await fetch('/api/nutrition/load', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const historyData = await historyResponse.json();
      if (historyData.entries) {
        setNutritionHistory(historyData.entries);
      }

      // Clear form
      setNutritionFile(null);
      setNutritionProductName('');
      setNutritionProductUrl('');
      if (nutritionFileInputRef.current) {
        nutritionFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Nutrition analysis error:', error);
      alert(error instanceof Error ? error.message : 'Error analyzing product');
    } finally {
      setNutritionAnalyzing(false);
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

        {/* Nutrition Button Card */}
        <button
          onClick={() => setActiveView('nutrition')}
          className="group relative overflow-hidden rounded-3xl bg-white/40 dark:bg-white/5 p-8 text-left shadow-xl backdrop-blur-xl border border-white/20 hover:border-green-500/50 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-32 h-32 text-green-600 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Nutrition Analysis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Analyze products and get a health rating out of 100.</p>
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

  // --- History Detail Modal ---
  const HistoryDetailModal = ({ entry, onClose }: { entry: NutritionEntry; onClose: () => void }) => {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
      <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-black/95 rounded-2xl p-8" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            ✕
          </button>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{entry.product_name}</h2>
          
          {/* Health Score */}
          <div className="mb-6 p-4 rounded-lg bg-white/50 dark:bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Health Score</span>
              <span className="text-3xl font-bold" style={{
                color: entry.health_score >= 70 ? '#22c55e' : entry.health_score >= 50 ? '#eab308' : '#ef4444'
              }}>
                {entry.health_score}/100
              </span>
            </div>
            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full" 
                style={{
                  width: `${entry.health_score}%`,
                  backgroundColor: entry.health_score >= 70 ? '#22c55e' : entry.health_score >= 50 ? '#eab308' : '#ef4444'
                }}
              />
            </div>
          </div>

          {/* Product Image */}
          {entry.image_data && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Product Image</h4>
              <img src={entry.image_data} alt={entry.product_name} className="w-full max-h-64 rounded-lg object-contain bg-gray-100 dark:bg-gray-900 p-4" />
            </div>
          )}

          {/* Summary */}
          {entry.nutrition_info?.summary && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Summary</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{entry.nutrition_info.summary}</p>
            </div>
          )}

          {/* Macronutrients */}
          {entry.nutrition_info?.macronutrients && Object.keys(entry.nutrition_info.macronutrients).length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Nutritional Info</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(entry.nutrition_info.macronutrients).map(([key, value]: [string, any]) => (
                  <div key={key} className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{key}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{value || 'Unknown'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {entry.ingredients_breakdown && entry.ingredients_breakdown.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Ingredients Analysis</h4>
              <div className="space-y-2">
                {entry.ingredients_breakdown.map((ing: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{ing.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{ing.reason}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ml-2 ${
                        ing.healthRating === 'excellent' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        ing.healthRating === 'good' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        ing.healthRating === 'moderate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        ing.healthRating === 'poor' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {ing.healthRating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternative Suggestion */}
          {entry.nutrition_info?.alternativeSuggestion && (
            <div className="mb-6 pt-6 border-t border-white/20">
              <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/50">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                  <span className="text-xl">💡</span> Healthier Alternative
                </h3>
                
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{entry.nutrition_info.alternativeSuggestion.productName}</h4>
                
                {/* Why it's better */}
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{entry.nutrition_info.alternativeSuggestion.reason}</p>
                
                {/* Alternative Health Score */}
                <div className="mb-4 p-4 rounded-lg bg-white/60 dark:bg-black/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Health Score</span>
                    <span className="text-2xl font-bold" style={{
                      color: entry.nutrition_info.alternativeSuggestion.healthScore >= 70 ? '#22c55e' : entry.nutrition_info.alternativeSuggestion.healthScore >= 50 ? '#eab308' : '#ef4444'
                    }}>
                      {entry.nutrition_info.alternativeSuggestion.healthScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all" 
                      style={{
                        width: `${entry.nutrition_info.alternativeSuggestion.healthScore}%`,
                        backgroundColor: entry.nutrition_info.alternativeSuggestion.healthScore >= 70 ? '#22c55e' : entry.nutrition_info.alternativeSuggestion.healthScore >= 50 ? '#eab308' : '#ef4444'
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    +{entry.nutrition_info.alternativeSuggestion.healthScore - entry.health_score} points better
                  </div>
                </div>

                {/* Alternative Macronutrients */}
                {entry.nutrition_info.alternativeSuggestion.macronutrients && Object.keys(entry.nutrition_info.alternativeSuggestion.macronutrients).length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Nutritional Info</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(entry.nutrition_info.alternativeSuggestion.macronutrients).map(([key, value]: [string, any]) => (
                        <div key={key} className="p-2 rounded bg-white/40 dark:bg-black/20">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{key}</p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{value || 'Unknown'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative Ingredients */}
                {entry.nutrition_info.alternativeSuggestion.ingredients && entry.nutrition_info.alternativeSuggestion.ingredients.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Key Ingredients</h5>
                    <div className="space-y-1">
                      {entry.nutrition_info.alternativeSuggestion.ingredients.slice(0, 5).map((ing: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-white/40 dark:bg-black/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-900 dark:text-white">{ing.name}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ml-1 ${
                              ing.healthRating === 'excellent' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              ing.healthRating === 'good' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              ing.healthRating === 'moderate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                              ing.healthRating === 'poor' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {ing.healthRating}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative Summary */}
                {entry.nutrition_info.alternativeSuggestion.summary && (
                  <div className="p-3 rounded bg-white/40 dark:bg-black/20">
                    <p className="text-xs text-gray-700 dark:text-gray-300">{entry.nutrition_info.alternativeSuggestion.summary}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analyzed Date */}
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-white/20">
            Analyzed on {new Date(entry.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    );
  };

  const NutritionView = () => (
    <div className="max-w-4xl mx-auto w-full animate-fade-in-up space-y-6">
      {/* Analysis Form */}
      <div className="group relative overflow-hidden rounded-3xl bg-white/40 dark:bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Product Nutrition Analysis</h2>
        
        <form onSubmit={handleAnalyzeProduct} className="space-y-4">
          {/* Product Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name</label>
            <input 
              type="text"
              value={nutritionProductName}
              onChange={handleNutritionProductNameChange}
              placeholder="Enter product name (e.g., Coca Cola, Organic Apple)"
              className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-black/20 border border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex-1 h-px bg-white/20" />
            <span>OR</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Product URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product URL</label>
            <input 
              type="url"
              value={nutritionProductUrl}
              onChange={handleNutritionProductUrlChange}
              placeholder="https://example.com/product/... (Amazon, Walmart, etc.)"
              className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-black/20 border border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex-1 h-px bg-white/20" />
            <span>OR</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Product Image</label>
            <input 
              ref={nutritionFileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleNutritionFileSelect} 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => nutritionFileInputRef.current?.click()}
              className="w-full px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition"
            >
              {nutritionFile ? `📷 ${nutritionFile.name}` : '📷 Choose Image'}
            </button>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={nutritionAnalyzing || (!nutritionProductName.trim() && !nutritionFile && !nutritionProductUrl.trim())}
            className="w-full px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold transition"
          >
            {nutritionAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              'Analyze Product'
            )}
          </button>
        </form>
      </div>

      {/* Current Analysis Results */}
      {currentAnalysis && (
        <div className="group relative overflow-hidden rounded-3xl bg-white/40 dark:bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{currentAnalysis.productName}</h3>
          
          {/* Health Score Gauge */}
          <div className="mb-6 p-6 rounded-xl bg-white/50 dark:bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Health Score</span>
              <span className="text-3xl font-bold" style={{
                color: currentAnalysis.healthScore >= 70 ? '#22c55e' : currentAnalysis.healthScore >= 50 ? '#eab308' : '#ef4444'
              }}>
                {currentAnalysis.healthScore}/100
              </span>
            </div>
            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all" 
                style={{
                  width: `${currentAnalysis.healthScore}%`,
                  backgroundColor: currentAnalysis.healthScore >= 70 ? '#22c55e' : currentAnalysis.healthScore >= 50 ? '#eab308' : '#ef4444'
                }}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Summary</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{currentAnalysis.summary}</p>
          </div>

          {/* Macronutrients */}
          {currentAnalysis.macronutrients && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Nutritional Info</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(currentAnalysis.macronutrients).map(([key, value]: [string, any]) => (
                  <div key={key} className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{key}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{value || 'Unknown'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {currentAnalysis.ingredients && currentAnalysis.ingredients.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Ingredients Analysis</h4>
              <div className="space-y-2">
                {currentAnalysis.ingredients.map((ing: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{ing.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{ing.reason}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ml-2 ${
                        ing.healthRating === 'excellent' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        ing.healthRating === 'good' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        ing.healthRating === 'moderate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        ing.healthRating === 'poor' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {ing.healthRating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {currentAnalysis.recommendations && currentAnalysis.recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {currentAnalysis.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternative Suggestion */}
          {currentAnalysis.alternativeSuggestion && (
            <div className="pt-6 border-t border-white/20">
              <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/50">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                  <span className="text-xl">💡</span> Healthier Alternative
                </h3>
                
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{currentAnalysis.alternativeSuggestion.productName}</h4>
                
                {/* Why it's better */}
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{currentAnalysis.alternativeSuggestion.reason}</p>
                
                {/* Alternative Health Score */}
                <div className="mb-4 p-4 rounded-lg bg-white/60 dark:bg-black/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Health Score</span>
                    <span className="text-2xl font-bold" style={{
                      color: currentAnalysis.alternativeSuggestion.healthScore >= 70 ? '#22c55e' : currentAnalysis.alternativeSuggestion.healthScore >= 50 ? '#eab308' : '#ef4444'
                    }}>
                      {currentAnalysis.alternativeSuggestion.healthScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all" 
                      style={{
                        width: `${currentAnalysis.alternativeSuggestion.healthScore}%`,
                        backgroundColor: currentAnalysis.alternativeSuggestion.healthScore >= 70 ? '#22c55e' : currentAnalysis.alternativeSuggestion.healthScore >= 50 ? '#eab308' : '#ef4444'
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    +{currentAnalysis.alternativeSuggestion.healthScore - currentAnalysis.healthScore} points better
                  </div>
                </div>

                {/* Alternative Macronutrients */}
                {currentAnalysis.alternativeSuggestion.macronutrients && (
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Nutritional Info</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(currentAnalysis.alternativeSuggestion.macronutrients).map(([key, value]: [string, any]) => (
                        <div key={key} className="p-2 rounded bg-white/40 dark:bg-black/20">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{key}</p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{value || 'Unknown'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative Ingredients */}
                {currentAnalysis.alternativeSuggestion.ingredients && currentAnalysis.alternativeSuggestion.ingredients.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Key Ingredients</h5>
                    <div className="space-y-1">
                      {currentAnalysis.alternativeSuggestion.ingredients.slice(0, 5).map((ing: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-white/40 dark:bg-black/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-900 dark:text-white">{ing.name}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ml-1 ${
                              ing.healthRating === 'excellent' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              ing.healthRating === 'good' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              ing.healthRating === 'moderate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                              ing.healthRating === 'poor' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {ing.healthRating}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative Summary */}
                {currentAnalysis.alternativeSuggestion.summary && (
                  <div className="p-3 rounded bg-white/40 dark:bg-black/20">
                    <p className="text-xs text-gray-700 dark:text-gray-300">{currentAnalysis.alternativeSuggestion.summary}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {nutritionHistory.length > 0 && (
        <div className="group relative overflow-hidden rounded-3xl bg-white/40 dark:bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Analysis History ({nutritionHistory.length})</h3>
          
          {/* Search */}
          <div className="mb-6">
            <input 
              type="text"
              placeholder="Search by product name..."
              value={historySearchQuery}
              onChange={handleHistorySearchChange}
              className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-black/20 border border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          {nutritionLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {nutritionHistory
                .filter(entry => entry.product_name.toLowerCase().includes(historySearchQuery.toLowerCase()))
                .length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">No products found matching "{historySearchQuery}"</p>
                ) : (
                  nutritionHistory
                    .filter(entry => entry.product_name.toLowerCase().includes(historySearchQuery.toLowerCase()))
                    .map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedHistoryEntry(entry)}
                        className="w-full p-4 rounded-lg bg-white/50 dark:bg-black/20 border border-white/10 hover:border-green-500/50 hover:bg-white/70 dark:hover:bg-black/40 transition text-left"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{entry.product_name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold" style={{
                              color: entry.health_score >= 70 ? '#22c55e' : entry.health_score >= 50 ? '#eab308' : '#ef4444'
                            }}>
                              {entry.health_score}
                            </span>
                            <span className="text-xs text-gray-400">→</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {entry.image_data && (
                            <span className="text-xs text-green-600 dark:text-green-400">📷 Image</span>
                          )}
                        </div>
                      </button>
                    ))
                )}
            </div>
          )}
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistoryEntry && (
        <HistoryDetailModal 
          entry={selectedHistoryEntry} 
          onClose={() => setSelectedHistoryEntry(null)} 
        />
      )}
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
        {activeView === 'nutrition' && <NutritionView />}
        {activeView === 'chat' && (
          <ChatView
            messages={messages}
            chatInput={chatInput}
            selectedFile={selectedFile}
            isTyping={isTyping}
            chatLoading={chatLoading}
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