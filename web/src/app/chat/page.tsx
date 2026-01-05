"use client";

import { useState, useRef, useEffect } from "react";
import { getChatMessages, saveChatMessages, type ChatMessage } from "@/lib/storage";

interface Attachment {
    type: 'image' | 'file';
    name: string;
    url: string;
    data?: string; // base64 for images
}

interface ExtendedMessage extends ChatMessage {
    attachments?: Attachment[];
}

export default function ChatPage() {
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isInitialMount = useRef(true);

    // Load messages from localStorage on mount
    useEffect(() => {
        const savedMessages = getChatMessages();
        if (savedMessages.length > 0) {
            setMessages(savedMessages as ExtendedMessage[]);
        }
    }, []);

    // Save messages to localStorage when they change (but not on initial mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        saveChatMessages(messages);
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!isLoading) {
            inputRef.current?.focus();
        }
    }, [isLoading]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const isImage = file.type.startsWith('image/');
                const newAttachment: Attachment = {
                    type: isImage ? 'image' : 'file',
                    name: file.name,
                    url: URL.createObjectURL(file),
                    data: isImage ? event.target?.result as string : undefined
                };
                setAttachments(prev => [...prev, newAttachment]);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!input.trim() && attachments.length === 0) || isLoading) return;

        // Build message content with attachments info
        let messageContent = input.trim();
        if (attachments.length > 0) {
            const attachmentInfo = attachments.map(a =>
                a.type === 'image' ? `[Image: ${a.name}]` : `[File: ${a.name}]`
            ).join(' ');
            if (messageContent) {
                messageContent = `${messageContent}\n\n${attachmentInfo}`;
            } else {
                messageContent = attachmentInfo;
            }
        }

        const userMessage: ExtendedMessage = {
            id: Date.now().toString(),
            role: "user" as const,
            content: messageContent,
            attachments: attachments.length > 0 ? [...attachments] : undefined
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setAttachments([]);
        setIsLoading(true);

        // Create placeholder for AI response
        const aiMessageId = (Date.now() + 1).toString();
        const aiMessage: ExtendedMessage = {
            id: aiMessageId,
            role: "assistant" as const,
            content: "",
        };
        setMessages((prev) => [...prev, aiMessage]);

        try {
            // Prepare messages for API - include image data for vision
            const apiMessages = newMessages.map(m => {
                if (m.attachments?.some(a => a.type === 'image' && a.data)) {
                    const imageAttachments = m.attachments.filter(a => a.type === 'image' && a.data);
                    return {
                        role: m.role,
                        content: [
                            { type: 'text', text: m.content },
                            ...imageAttachments.map(img => ({
                                type: 'image_url',
                                image_url: { url: img.data }
                            }))
                        ]
                    };
                }
                return { role: m.role, content: m.content };
            });

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No reader available');

            let fullContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                fullContent += parsed.content;
                                setMessages((prev) =>
                                    prev.map(m =>
                                        m.id === aiMessageId
                                            ? { ...m, content: fullContent }
                                            : m
                                    )
                                );
                            }
                        } catch {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            if (!fullContent) {
                setMessages((prev) =>
                    prev.map(m =>
                        m.id === aiMessageId
                            ? { ...m, content: "I apologize, but I encountered an error processing your request." }
                            : m
                    )
                );
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages((prev) =>
                prev.map(m =>
                    m.id === aiMessageId
                        ? { ...m, content: "System Error: Unable to connect. Please try again." }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const examplePrompts = [
        "Generate a REST API for user authentication",
        "Explain how to implement WebSockets",
        "Debug this React component",
        "Create a database schema for e-commerce",
    ];

    return (
        <div className="flex flex-col h-full bg-[#09090b]">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 max-w-2xl mx-auto">
                        <div className="text-center mb-10">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-semibold text-white mb-3">How can I help you today?</h1>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                            {examplePrompts.map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => setInput(prompt)}
                                    className="text-left p-4 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a]/50 hover:border-[#3f3f46] transition-all duration-200"
                                >
                                    <span className="text-zinc-300 text-sm">{prompt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto p-4 py-8 space-y-8">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {message.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-white flex-shrink-0 mt-0.5">
                                        AI
                                    </div>
                                )}

                                <div className={`max-w-[85%] ${message.role === "user" ? "bg-[#3b82f6] text-white rounded-2xl rounded-tr-sm px-4 py-2.5" : "text-zinc-300 px-0 py-0.5"}`}>
                                    {/* Show attachments for user messages */}
                                    {message.attachments && message.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {message.attachments.map((att, idx) => (
                                                att.type === 'image' ? (
                                                    <img
                                                        key={idx}
                                                        src={att.data || att.url}
                                                        alt={att.name}
                                                        className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div key={idx} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 text-sm">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        {att.name}
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</div>
                                </div>

                                {message.role === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-xs text-[#3b82f6] flex-shrink-0 mt-0.5">
                                        US
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-white flex-shrink-0 mt-0.5">
                                    AI
                                </div>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-[#09090b]">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                    {/* Attachment Preview */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-[#18181b] border border-[#27272a] rounded-xl">
                            {attachments.map((att, idx) => (
                                <div key={idx} className="relative group">
                                    {att.type === 'image' ? (
                                        <img
                                            src={att.url}
                                            alt={att.name}
                                            className="w-16 h-16 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-zinc-800 flex flex-col items-center justify-center">
                                            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-[10px] text-zinc-500 mt-1 truncate max-w-[56px]">{att.name}</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(idx)}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative bg-[#18181b] border border-[#27272a] rounded-xl focus-within:border-[#3f3f46] focus-within:ring-1 focus-within:ring-[#3f3f46] transition-all shadow-sm">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.pdf,.txt,.md,.js,.ts,.py,.json,.html,.css"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Attachment button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute left-3 bottom-3 p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Attach files"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>

                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Soul Tech AI..."
                            rows={1}
                            className="w-full bg-transparent pl-12 pr-12 py-3.5 resize-none focus:outline-none max-h-48 text-[15px] text-zinc-200 placeholder:text-zinc-500"
                            style={{ minHeight: "52px" }}
                        />
                        <button
                            type="submit"
                            disabled={(!input.trim() && attachments.length === 0) || isLoading}
                            className="absolute right-2 bottom-2 p-1.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-0 disabled:pointer-events-none rounded-lg transition-all duration-200 shadow-sm"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-600 rounded-full animate-spin m-0.5" />
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <p className="text-center text-xs text-zinc-500 mt-3">
                        Soul Tech AI • For internal use only
                    </p>
                </form>
            </div>
        </div>
    );
}
