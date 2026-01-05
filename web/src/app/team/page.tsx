"use client";

import { useState, useEffect } from "react";
import { TeamMember, getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember } from "@/lib/storage";

const statusColors: Record<string, { bg: string; text: string }> = {
    online: { bg: "bg-green-500", text: "Online" },
    away: { bg: "bg-yellow-500", text: "Away" },
    offline: { bg: "bg-gray-500", text: "Offline" },
};

const gradientOptions = [
    "from-[#6366f1] to-[#8b5cf6]",
    "from-[#ec4899] to-[#f43f5e]",
    "from-[#14b8a6] to-[#22c55e]",
    "from-[#f59e0b] to-[#ef4444]",
    "from-[#3b82f6] to-[#6366f1]",
    "from-[#8b5cf6] to-[#ec4899]",
];

const avatarOptions = ["🚀", "👩‍💻", "👨‍💻", "🎨", "⚙️", "🔍", "💡", "🛠️", "📊", "🔥"];

export default function TeamPage() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        role: "",
        email: "",
        status: "online" as "online" | "away" | "offline",
        avatar: "🚀",
        gradient: gradientOptions[0],
    });

    useEffect(() => {
        setMembers(getTeamMembers());
    }, []);

    const onlineCount = members.filter(m => m.status === "online").length;

    const openAddModal = () => {
        setEditingMember(null);
        setFormData({ name: "", role: "", email: "", status: "online", avatar: "🚀", gradient: gradientOptions[0] });
        setShowModal(true);
    };

    const openEditModal = (member: TeamMember) => {
        setEditingMember(member);
        setFormData({
            name: member.name,
            role: member.role,
            email: member.email,
            status: member.status,
            avatar: member.avatar,
            gradient: member.gradient,
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingMember) {
            updateTeamMember(editingMember.id, formData);
        } else {
            addTeamMember({ ...formData, projects: 0, tasks: 0 });
        }
        setMembers(getTeamMembers());
        setShowModal(false);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to remove this team member?")) {
            deleteTeamMember(id);
            setMembers(getTeamMembers());
        }
    };

    return (
        <div className="h-full overflow-y-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Team</h1>
                    <p className="text-[#71717a]">{members.length} members • {onlineCount} online</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg font-medium transition-colors"
                >
                    <span>➕</span>
                    Add Member
                </button>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map((member, index) => (
                    <div
                        key={member.id}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#3a3a3a] transition-all animate-fadeIn group"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Avatar & Status */}
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-2xl`}>
                                {member.avatar}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${statusColors[member.status].bg}`} />
                                <span className="text-xs text-[#71717a]">{statusColors[member.status].text}</span>
                            </div>
                        </div>

                        {/* Info */}
                        <h3 className="text-lg font-semibold mb-1">{member.name}</h3>
                        <p className="text-sm text-[#6366f1] mb-2">{member.role}</p>
                        <p className="text-sm text-[#71717a] mb-4">{member.email}</p>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-[#71717a] pt-4 border-t border-[#2a2a2a]">
                            <span className="flex items-center gap-1">📁 {member.projects} projects</span>
                            <span className="flex items-center gap-1">✅ {member.tasks} tasks</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => openEditModal(member)}
                                className="flex-1 px-3 py-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors"
                            >
                                ✏️ Edit
                            </button>
                            <button
                                onClick={() => handleDelete(member.id)}
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
                            {editingMember ? "Edit Team Member" : "Add Team Member"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Role</label>
                                <input
                                    type="text"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as "online" | "away" | "offline" })}
                                    className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1]"
                                >
                                    <option value="online">Online</option>
                                    <option value="away">Away</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Avatar</label>
                                <div className="flex gap-2 flex-wrap">
                                    {avatarOptions.map((avatar) => (
                                        <button
                                            key={avatar}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, avatar })}
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-colors ${formData.avatar === avatar ? "bg-[#6366f1]" : "bg-[#252525] hover:bg-[#2a2a2a]"
                                                }`}
                                        >
                                            {avatar}
                                        </button>
                                    ))}
                                </div>
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
                                    {editingMember ? "Save Changes" : "Add Member"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
