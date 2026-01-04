"use client";

import { useState } from "react";

interface Task {
    id: string;
    title: string;
    description: string;
    status: "todo" | "in-progress" | "review" | "done";
    priority: "low" | "medium" | "high";
    assignee: string;
    project: string;
}

const initialTasks: Task[] = [
    { id: "1", title: "Implement user authentication", description: "Add OAuth login with Discord", status: "done", priority: "high", assignee: "ACE", project: "Ultra ACE" },
    { id: "2", title: "Create dashboard layout", description: "Build responsive sidebar and main content area", status: "in-progress", priority: "high", assignee: "ACE", project: "Ultra ACE" },
    { id: "3", title: "Add AI chat interface", description: "ChatGPT-style messaging UI", status: "in-progress", priority: "high", assignee: "ACE", project: "Ultra ACE" },
    { id: "4", title: "Setup Supabase database", description: "Configure tables and RLS policies", status: "done", priority: "medium", assignee: "Dev", project: "Ultra ACE" },
    { id: "5", title: "Deploy to Railway", description: "Setup Dockerfile and deployment", status: "review", priority: "medium", assignee: "ACE", project: "Ultra ACE" },
    { id: "6", title: "Add real-time notifications", description: "WebSocket integration for live updates", status: "todo", priority: "low", assignee: "Dev", project: "Ultra ACE" },
    { id: "7", title: "Write API documentation", description: "Generate OpenAPI docs", status: "todo", priority: "low", assignee: "ACE", project: "Ultra ACE" },
];

const columns = [
    { id: "todo", title: "To Do", color: "border-gray-500" },
    { id: "in-progress", title: "In Progress", color: "border-yellow-500" },
    { id: "review", title: "Review", color: "border-purple-500" },
    { id: "done", title: "Done", color: "border-green-500" },
];

const priorityColors = {
    low: "bg-gray-500",
    medium: "bg-yellow-500",
    high: "bg-red-500",
};

export default function TasksPage() {
    const [tasks] = useState<Task[]>(initialTasks);

    const getTasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

    return (
        <div className="h-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Tasks</h1>
                        <p className="text-[#71717a]">Kanban board for task management</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg font-medium transition-colors">
                        <span>➕</span>
                        New Task
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto px-8 pb-8">
                <div className="flex gap-4 min-w-max h-full">
                    {columns.map((column) => (
                        <div
                            key={column.id}
                            className={`w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col`}
                        >
                            <div className={`p-4 border-b border-[#2a2a2a] border-l-4 ${column.color}`}>
                                <h3 className="font-semibold">{column.title}</h3>
                                <p className="text-sm text-[#71717a]">{getTasksByStatus(column.id).length} tasks</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {getTasksByStatus(column.id).map((task) => (
                                    <div
                                        key={task.id}
                                        className="bg-[#252525] border border-[#3a3a3a] rounded-lg p-4 hover:border-[#4a4a4a] cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority]} mt-1.5`} />
                                            <span className="text-xs text-[#71717a]">{task.project}</span>
                                        </div>
                                        <h4 className="font-medium mb-1">{task.title}</h4>
                                        <p className="text-sm text-[#71717a] mb-3 line-clamp-2">{task.description}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-xs font-bold">
                                                {task.assignee[0]}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
