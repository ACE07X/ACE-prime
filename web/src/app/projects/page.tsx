import Link from "next/link";

const projects = [
    {
        id: "1",
        name: "Ultra ACE",
        description: "AI-powered Discord bot and web dashboard",
        status: "active",
        tasks: 12,
        members: 3,
        progress: 75
    },
    {
        id: "2",
        name: "Rawaj Real Estate",
        description: "Property listing platform with admin dashboard",
        status: "active",
        tasks: 24,
        members: 5,
        progress: 90
    },
    {
        id: "3",
        name: "Mobile App",
        description: "React Native mobile application",
        status: "planning",
        tasks: 8,
        members: 2,
        progress: 15
    },
    {
        id: "4",
        name: "API Gateway",
        description: "Microservices API gateway with authentication",
        status: "completed",
        tasks: 18,
        members: 4,
        progress: 100
    },
];

const statusColors: Record<string, string> = {
    active: "bg-green-500",
    planning: "bg-yellow-500",
    completed: "bg-blue-500",
    paused: "bg-gray-500",
};

export default function ProjectsPage() {
    return (
        <div className="h-full overflow-y-auto p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Projects</h1>
                    <p className="text-[#71717a]">Manage your development projects</p>
                </div>
                <Link
                    href="/projects/new"
                    className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg font-medium transition-colors"
                >
                    <span>➕</span>
                    New Project
                </Link>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project, index) => (
                    <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#3a3a3a] transition-all hover:translate-y-[-2px] animate-fadeIn"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-xl">
                                📁
                            </div>
                            <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
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
                    </Link>
                ))}
            </div>
        </div>
    );
}
