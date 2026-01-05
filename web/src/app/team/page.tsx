import Link from "next/link";

const teamMembers = [
    {
        id: "1",
        name: "ACE07X",
        role: "Project Lead & Developer",
        email: "ace07x@ultraace.dev",
        status: "online",
        avatar: "🚀",
        projects: 4,
        tasks: 12,
        gradient: "from-[#6366f1] to-[#8b5cf6]"
    },
    {
        id: "2",
        name: "Sarah Chen",
        role: "Frontend Developer",
        email: "sarah@ultraace.dev",
        status: "online",
        avatar: "👩‍💻",
        projects: 2,
        tasks: 8,
        gradient: "from-[#ec4899] to-[#f43f5e]"
    },
    {
        id: "3",
        name: "Marcus Williams",
        role: "Backend Developer",
        email: "marcus@ultraace.dev",
        status: "away",
        avatar: "👨‍💻",
        projects: 3,
        tasks: 15,
        gradient: "from-[#14b8a6] to-[#22c55e]"
    },
    {
        id: "4",
        name: "Aisha Rahman",
        role: "UI/UX Designer",
        email: "aisha@ultraace.dev",
        status: "offline",
        avatar: "🎨",
        projects: 2,
        tasks: 6,
        gradient: "from-[#f59e0b] to-[#ef4444]"
    },
    {
        id: "5",
        name: "James Cooper",
        role: "DevOps Engineer",
        email: "james@ultraace.dev",
        status: "online",
        avatar: "⚙️",
        projects: 4,
        tasks: 10,
        gradient: "from-[#3b82f6] to-[#6366f1]"
    },
    {
        id: "6",
        name: "Elena Volkov",
        role: "QA Engineer",
        email: "elena@ultraace.dev",
        status: "away",
        avatar: "🔍",
        projects: 3,
        tasks: 9,
        gradient: "from-[#8b5cf6] to-[#ec4899]"
    },
];

const statusColors: Record<string, { bg: string; text: string }> = {
    online: { bg: "bg-green-500", text: "Online" },
    away: { bg: "bg-yellow-500", text: "Away" },
    offline: { bg: "bg-gray-500", text: "Offline" },
};

export default function TeamPage() {
    const onlineCount = teamMembers.filter(m => m.status === "online").length;

    return (
        <div className="h-full overflow-y-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Team</h1>
                    <p className="text-[#71717a]">{teamMembers.length} members • {onlineCount} online</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg font-medium transition-colors">
                    <span>➕</span>
                    Invite Member
                </button>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamMembers.map((member, index) => (
                    <Link
                        key={member.id}
                        href={`/team/${member.id}`}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#3a3a3a] transition-all hover:translate-y-[-2px] animate-fadeIn"
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
                            <span className="flex items-center gap-1">
                                📁 {member.projects} projects
                            </span>
                            <span className="flex items-center gap-1">
                                ✅ {member.tasks} tasks
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Team Actions</h3>
                <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors">
                        📧 Send Team Email
                    </button>
                    <button className="px-4 py-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors">
                        📅 Schedule Standup
                    </button>
                    <button className="px-4 py-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors">
                        📊 View Performance
                    </button>
                    <button className="px-4 py-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors">
                        🔒 Manage Permissions
                    </button>
                </div>
            </div>
        </div>
    );
}
