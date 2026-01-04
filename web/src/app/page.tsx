"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState([
    { label: "Active Projects", value: "-", icon: "📁", color: "from-blue-500 to-indigo-500" },
    { label: "Open Tasks", value: "-", icon: "✅", color: "from-emerald-500 to-teal-500" },
    { label: "Team Members", value: "-", icon: "👥", color: "from-orange-500 to-red-500" },
    { label: "AI Chats Today", value: "-", icon: "💬", color: "from-violet-500 to-purple-500" },
  ]);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats([
          { label: "Active Projects", value: data.projects?.toString() || "0", icon: "📁", color: "from-blue-500 to-indigo-500" },
          { label: "Open Tasks", value: data.tasks?.toString() || "0", icon: "✅", color: "from-emerald-500 to-teal-500" },
          { label: "Team Members", value: data.team?.toString() || "0", icon: "👥", color: "from-orange-500 to-red-500" },
          { label: "AI Chats Today", value: data.chats?.toString() || "0", icon: "💬", color: "from-violet-500 to-purple-500" },
        ]);
      })
      .catch(err => console.error(err));
  }, []);

  const quickActions = [
    { label: "New Project", icon: "📁", href: "/projects/new", color: "bg-blue-500" },
    { label: "Create Task", icon: "✅", href: "/tasks/new", color: "bg-emerald-500" },
    { label: "New Chat", icon: "✨", href: "/chat", color: "bg-indigo-500" },
    { label: "Team Standup", icon: "🎯", href: "/team/standup", color: "bg-orange-500" },
  ];

  const recentChats = [
    { title: "Debug authentication flow", time: "5 min ago" },
    { title: "Generate API documentation", time: "1 hour ago" },
    { title: "Review pull request #42", time: "2 hours ago" },
    { title: "Optimize database queries", time: "Yesterday" },
  ];

  return (
    <div className="h-full overflow-y-auto p-8 bg-[#09090b]">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Dashboard</h1>
          <p className="text-zinc-400 text-sm">Welcome back, ACE07X. Here's your workspace overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="bg-[#18181b] border border-[#27272a] rounded-lg p-5 hover:border-[#3f3f46] transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-zinc-400">{stat.icon}</span>
                <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">+12%</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-white tracking-tight">{stat.value}</p>
                <p className="text-xs text-zinc-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-medium text-zinc-200">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex gap-4 p-4 bg-[#18181b] border border-[#27272a] rounded-lg hover:border-[#3f3f46] transition-all"
                >
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center text-lg bg-[#27272a] text-zinc-300 group-hover:bg-[#3b82f6]/10 group-hover:text-[#3b82f6] transition-colors`}>
                    {action.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white mb-1">{action.label}</h3>
                    <p className="text-xs text-zinc-500">Create new item</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Chats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-200">Recent Activity</h2>
              <Link href="/chat" className="text-xs text-[#3b82f6] hover:underline">View All</Link>
            </div>
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg overflow-hidden">
              <div className="divide-y divide-[#27272a]">
                {recentChats.map((chat) => (
                  <Link
                    key={chat.title}
                    href="/chat"
                    className="block p-4 hover:bg-[#27272a]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-300 truncate mb-0.5">{chat.title}</p>
                        <p className="text-xs text-zinc-500">{chat.time}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
