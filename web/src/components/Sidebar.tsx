"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
    { label: "Dashboard", href: "/", icon: "📊" },
    { label: "AI Chat", href: "/chat", icon: "💬" },
    { label: "Projects", href: "/projects", icon: "📁" },
    { label: "Tasks", href: "/tasks", icon: "✅" },
    { label: "Team", href: "/team", icon: "👥" },
    { label: "Settings", href: "/settings", icon: "⚙️" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-[#09090b] border-r border-[#27272a] flex flex-col h-full font-sans">
            {/* Logo */}
            <div className="p-5 border-b border-[#27272a]">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                    </div>
                    <span className="text-sm font-semibold tracking-tight text-white">Ultra ACE</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
                <div className="mb-2 px-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    Platform
                </div>
                <ul className="space-y-0.5">
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-200 ${pathname === item.href
                                        ? "bg-[#27272a] text-white font-medium shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a]/50"
                                    }`}
                            >
                                <span className={`text-base ${pathname === item.href ? "text-indigo-400" : "opacity-70"}`}>{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="mt-8 mb-2 px-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    Shortcuts
                </div>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a]/50 rounded-md transition-colors text-left">
                    <span className="text-base opacity-70">⚡</span>
                    <span>New Chat</span>
                    <span className="ml-auto text-[10px] bg-[#27272a] px-1.5 py-0.5 rounded text-zinc-500 border border-[#3f3f46]">K</span>
                </button>
            </nav>

            {/* User */}
            <div className="p-3 border-t border-[#27272a]">
                <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#27272a] cursor-pointer transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300 ring-1 ring-[#27272a]">
                        AC
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">ACE07X</p>
                        <p className="text-xs text-zinc-500 truncate">Pro Workspace</p>
                    </div>
                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>
            </div>
        </aside>
    );
}
