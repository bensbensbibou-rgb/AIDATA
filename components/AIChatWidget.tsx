import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { ChatBubble, ChatInput } from './Widgets';
import { VoiceRecognition, TextToSpeech } from '../utils/voice';

interface AIChatWidgetProps {
    onSendMessage: (text: string) => Promise<{ text: string, predictions?: any[] }>;
}

const AIChatWidget: React.FC<AIChatWidgetProps> = ({ onSendMessage }) => {
    const STORAGE_KEY = 'ai_chat_history';

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) }));
            }
        } catch (e) { console.error('Error loading chat history:', e); }
        return [{ id: '1', role: 'assistant', text: "Hello! I am connected to your dashboard data. Ask me to analyze charts or predict equipment failures.", timestamp: new Date() }];
    });

    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const voiceRecognitionRef = useRef<VoiceRecognition | null>(null);
    const ttsRef = useRef<TextToSpeech>(new TextToSpeech());

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); }
        catch (e) { console.error('Error saving chat history:', e); }
    }, [messages]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;
        const userMsg = { id: Date.now().toString(), role: 'user' as const, text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        try {
            const response = await onSendMessage(text);
            const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant', text: response.text, timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);
            if (autoSpeak && response.text) {
                ttsRef.current.speak(response.text, {
                    lang: 'fr-FR',
                    onStart: () => setIsSpeaking(true),
                    onEnd: () => setIsSpeaking(false)
                });
            }
        } catch (error) {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: "Sorry, I encountered an error analyzing the data.", timestamp: new Date() }]);
            console.error(error);
        } finally {
            setIsTyping(false);
        }
    };

    const startVoiceRecognition = () => {
        if (!VoiceRecognition.isSupported()) {
            alert('Votre navigateur ne supporte pas la reconnaissance vocale');
            return;
        }
        voiceRecognitionRef.current = new VoiceRecognition({
            lang: 'fr-FR',
            onStart: () => setIsRecording(true),
            onResult: (transcript) => { handleSend(transcript); },
            onError: (error) => { console.error('Voice recognition error:', error); setIsRecording(false); },
            onEnd: () => setIsRecording(false)
        });
        voiceRecognitionRef.current.start();
    };

    const stopVoiceRecognition = () => {
        if (voiceRecognitionRef.current) { voiceRecognitionRef.current.stop(); }
    };

    const handleClearHistory = () => {
        if (window.confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
            const welcomeMsg = { id: '1', role: 'assistant' as const, text: "Hello! I am connected to your dashboard data. Ask me to analyze charts or predict equipment failures.", timestamp: new Date() };
            setMessages([welcomeMsg]);
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-black/20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {messages.length - 1} message{messages.length - 1 !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { if (isSpeaking) { ttsRef.current.stop(); setIsSpeaking(false); } setAutoSpeak(!autoSpeak); }}
                        className={`p-2 rounded-lg transition-colors ${autoSpeak ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                        title={autoSpeak ? "Désactiver lecture auto" : "Activer lecture auto"}
                    >
                        {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>
                    <button
                        onClick={handleClearHistory}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Effacer l'historique"
                    >
                        <Trash2 size={16} />Effacer
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
                {isTyping && <ChatBubble message={{ role: 'assistant', text: '', id: 'typing', timestamp: new Date() }} isTyping={true} />}
                <div ref={chatEndRef} />
            </div>
            <div className="p-2 flex items-center gap-2">
                <button
                    type="button"
                    onMouseDown={startVoiceRecognition}
                    onMouseUp={stopVoiceRecognition}
                    onMouseLeave={stopVoiceRecognition}
                    onTouchStart={(e) => { e.preventDefault(); startVoiceRecognition(); }}
                    onTouchEnd={(e) => { e.preventDefault(); stopVoiceRecognition(); }}
                    disabled={isTyping}
                    className={`p-3 rounded-full transition-all flex-shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20'} disabled:opacity-50 disabled:cursor-not-allowed select-none`}
                    title="Maintenir pour parler"
                >
                    {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <div className="flex-1">
                    <ChatInput onSend={handleSend} disabled={isTyping || isRecording} />
                </div>
            </div>
        </div>
    );
};

export default AIChatWidget;
