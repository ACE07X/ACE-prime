"use client";

import { useState, useEffect } from "react";
import { Project, getProjects, addProject, updateProject, deleteProject } from "@/lib/storage";

const statusColors: Record<string, string> = {
    active: "bg-green-500",
    planning: "bg-yellow-500",
    completed: "bg-blue-500",
    paused: "bg-gray-500",
};

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "planning" as "active" | "planning" | "completed" | "paused",
        progress: 0,
    });

    useEffect(() => {
        setProjects(getProjects());
    }, []);

    const openAddModal = () => {
        setEditingProject(null);
        setFormData({ name: "", description: "", status: "planning", progress: 0 });
        setShowModal(true);
    };

    const openEditModal = (project: Project) => {
        setEditingProject(project);
        setFormData({
            name: project.name,
            description: project.description,
            status: project.status,
            progress: project.progress,
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProject) {
            updateProject(editingProject.id, formData);
        } else {
            addProject({ ...formData, tasks: 0, members: 1 });
        }
        setProjects(getProjects());
        setShowModal(false);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this project?")) {
            deleteProject(id);
            setProjects(getProjects());
        }
    };

    return (
        <div className="h-full overflow-y-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Projects</h1>
                    <p className="text-[#71717a]">Manage your development projects</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg font-medium transition-colors"
                >
                    <span>➕</span>
                    New Project
                </button>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project, index) => (
                    <div
                        key={project.id}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#3a3a3a] transition-all animate-fadeIn group"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-xl">
                                📁
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
                                <span className="text-xs text-[#71717a] capitalize">{project.status}</span>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                        <p className="text-sm text-[#71717a] mb-4 line-clamp-2">{project.description}</p>

                        <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-[#71717a]">Progress</span>
                                <span className="font-medium">{project.progress}%</span>
                            </div>
                            <div className="h-2 bg-[#2a2a2a] rounded-full">
                                <div
                                    className="h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-full transition-all"
                                    style={{ width: `${project.progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-[#71717a]">
                            <span>✅ {project.tasks} tasks</span>
                            <span>👥 {project.members} members</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => openEditModal(project)}
                                className="flex-1 px-3 py-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors"
                            >
                                ✏️ Edit
                            </button>
                            <button
                                onClick={() => handleDelete(project.id)}
                                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm transition-colors"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md animate-fadeIn">
                        <h2 className="text-xl font-semibold mb-6">
                            {editingProject ? "Edit Project" : "New Project"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Project Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                    placeholder="My Awesome Project"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    rows={3}
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1] resize-none"
                                    placeholder="Brief description of the project..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Project["status"] })}
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                >
                                    <option value="planning">Planning</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="paused">Paused</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Progress: {formData.progress}%</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={formData.progress}
                                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                                    className="w-full accent-[#6366f1]"
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
                                    {editingProject ? "Save Changes" : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
