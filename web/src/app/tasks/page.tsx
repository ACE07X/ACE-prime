"use client";

import { useState, useEffect } from "react";
import { Task, getTasks, addTask, updateTask, deleteTask, getProjects } from "@/lib/storage";

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
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "todo" as Task["status"],
        priority: "medium" as Task["priority"],
        assignee: "",
        project: "",
    });

    useEffect(() => {
        setTasks(getTasks());
        setProjects(getProjects().map(p => p.name));
    }, []);

    const getTasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

    const openAddModal = () => {
        setEditingTask(null);
        setFormData({ title: "", description: "", status: "todo", priority: "medium", assignee: "", project: projects[0] || "" });
        setShowModal(true);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
            project: task.project,
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTask) {
            updateTask(editingTask.id, formData);
        } else {
            addTask(formData);
        }
        setTasks(getTasks());
        setShowModal(false);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this task?")) {
            deleteTask(id);
            setTasks(getTasks());
        }
    };

    const handleDragStart = (task: Task) => {
        setDraggedTask(task);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (newStatus: Task["status"]) => {
        if (draggedTask && draggedTask.status !== newStatus) {
            updateTask(draggedTask.id, { status: newStatus });
            setTasks(getTasks());
        }
        setDraggedTask(null);
    };

    return (
        <div className="h-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Tasks</h1>
                        <p className="text-[#71717a]">Drag and drop tasks between columns</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg font-medium transition-colors"
                    >
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
                            className={`w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex flex-col ${draggedTask ? "ring-2 ring-[#6366f1]/30" : ""
                                }`}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(column.id as Task["status"])}
                        >
                            <div className={`p-4 border-b border-[#2a2a2a] border-l-4 ${column.color}`}>
                                <h3 className="font-semibold">{column.title}</h3>
                                <p className="text-sm text-[#71717a]">{getTasksByStatus(column.id).length} tasks</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {getTasksByStatus(column.id).map((task) => (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={() => handleDragStart(task)}
                                        className={`bg-[#252525] border border-[#3a3a3a] rounded-lg p-4 hover:border-[#4a4a4a] cursor-grab active:cursor-grabbing transition-all group ${draggedTask?.id === task.id ? "opacity-50" : ""
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority]} mt-1.5`} />
                                            <span className="text-xs text-[#71717a]">{task.project}</span>
                                        </div>
                                        <h4 className="font-medium mb-1">{task.title}</h4>
                                        <p className="text-sm text-[#71717a] mb-3 line-clamp-2">{task.description}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-xs font-bold">
                                                {task.assignee[0] || "?"}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                                    className="px-2 py-1 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded text-xs"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                                    className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded text-xs"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md animate-fadeIn">
                        <h2 className="text-xl font-semibold mb-6">
                            {editingTask ? "Edit Task" : "New Task"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1] resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Task["status"] })}
                                        className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                    >
                                        {columns.map(col => (
                                            <option key={col.id} value={col.id}>{col.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Priority</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task["priority"] })}
                                        className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Project</label>
                                <select
                                    value={formData.project}
                                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                >
                                    {projects.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Assignee</label>
                                <input
                                    type="text"
                                    value={formData.assignee}
                                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                    placeholder="Team member name"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg transition-colors"
                                >
                                    {editingTask ? "Save Changes" : "Create Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
