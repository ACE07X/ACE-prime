"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatPage() {
    const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

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

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = {
            id: Date.now().toString(),
            role: "user" as const,
            content: input.trim(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content }))
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch response');

            const data = await response.json();

            const aiMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant" as const,
                content: data.content || "I apologize, but I encountered an error processing your request.",
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant" as const,
                content: "System Error: Unable to connect to neural network. Please check your connection and try again.",
            };
            setMessages((prev) => [...prev, errorMessage]);
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
                    <div className="relative bg-[#18181b] border border-[#27272a] rounded-xl focus-within:border-[#3f3f46] focus-within:ring-1 focus-within:ring-[#3f3f46] transition-all shadow-sm">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Soul Tech AI..."
                            rows={1}
                            className="w-full bg-transparent px-4 py-3.5 pr-12 resize-none focus:outline-none max-h-48 text-[15px] text-zinc-200 placeholder:text-zinc-500"
                            style={{ minHeight: "52px" }}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
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
