// Storage utilities for persisting data to localStorage

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    email: string;
    status: "online" | "away" | "offline";
    avatar: string;
    projects: number;
    tasks: number;
    gradient: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    status: "active" | "planning" | "completed" | "paused";
    tasks: number;
    members: number;
    progress: number;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: "todo" | "in-progress" | "review" | "done";
    priority: "low" | "medium" | "high";
    assignee: string;
    project: string;
}

export interface UserSettings {
    profile: {
        name: string;
        email: string;
        bio: string;
    };
    appearance: {
        darkMode: boolean;
        accentColor: string;
        fontSize: "small" | "medium" | "large";
    };
    notifications: {
        email: boolean;
        push: boolean;
        slack: boolean;
        discord: boolean;
    };
}

// Default data
const defaultTeamMembers: TeamMember[] = [
    { id: "1", name: "ACE07X", role: "Project Lead & Developer", email: "ace07x@soultech.dev", status: "online", avatar: "🚀", projects: 4, tasks: 12, gradient: "from-[#6366f1] to-[#8b5cf6]" },
    { id: "2", name: "Sarah Chen", role: "Frontend Developer", email: "sarah@soultech.dev", status: "online", avatar: "👩‍💻", projects: 2, tasks: 8, gradient: "from-[#ec4899] to-[#f43f5e]" },
    { id: "3", name: "Marcus Williams", role: "Backend Developer", email: "marcus@soultech.dev", status: "away", avatar: "👨‍💻", projects: 3, tasks: 15, gradient: "from-[#14b8a6] to-[#22c55e]" },
];

const defaultProjects: Project[] = [
    { id: "1", name: "Ultra ACE", description: "AI-powered Discord bot and web dashboard", status: "active", tasks: 12, members: 3, progress: 75 },
    { id: "2", name: "Rawaj Real Estate", description: "Property listing platform with admin dashboard", status: "active", tasks: 24, members: 5, progress: 90 },
    { id: "3", name: "Mobile App", description: "React Native mobile application", status: "planning", tasks: 8, members: 2, progress: 15 },
];

const defaultTasks: Task[] = [
    { id: "1", title: "Implement user authentication", description: "Add OAuth login with Discord", status: "done", priority: "high", assignee: "ACE07X", project: "Ultra ACE" },
    { id: "2", title: "Create dashboard layout", description: "Build responsive sidebar and main content area", status: "in-progress", priority: "high", assignee: "ACE07X", project: "Ultra ACE" },
    { id: "3", title: "Add AI chat interface", description: "ChatGPT-style messaging UI", status: "in-progress", priority: "high", assignee: "Sarah Chen", project: "Ultra ACE" },
    { id: "4", title: "Setup Supabase database", description: "Configure tables and RLS policies", status: "done", priority: "medium", assignee: "Marcus Williams", project: "Ultra ACE" },
    { id: "5", title: "Deploy to Railway", description: "Setup Dockerfile and deployment", status: "review", priority: "medium", assignee: "ACE07X", project: "Ultra ACE" },
    { id: "6", title: "Add real-time notifications", description: "WebSocket integration for live updates", status: "todo", priority: "low", assignee: "Marcus Williams", project: "Ultra ACE" },
];

const defaultSettings: UserSettings = {
    profile: { name: "ACE07X", email: "ace07x@soultech.dev", bio: "Full-stack developer building amazing things with AI." },
    appearance: { darkMode: true, accentColor: "#6366f1", fontSize: "medium" },
    notifications: { email: true, push: true, slack: false, discord: true },
};

// Storage keys
const KEYS = {
    TEAM: 'soultech_team',
    PROJECTS: 'soultech_projects',
    TASKS: 'soultech_tasks',
    SETTINGS: 'soultech_settings',
    CHATS_COUNT: 'soultech_chats_count',
};

// Check if we're in browser
const isBrowser = typeof window !== 'undefined';

// Team Members
export function getTeamMembers(): TeamMember[] {
    if (!isBrowser) return defaultTeamMembers;
    const stored = localStorage.getItem(KEYS.TEAM);
    if (!stored) {
        localStorage.setItem(KEYS.TEAM, JSON.stringify(defaultTeamMembers));
        return defaultTeamMembers;
    }
    return JSON.parse(stored);
}

export function saveTeamMembers(members: TeamMember[]): void {
    if (isBrowser) localStorage.setItem(KEYS.TEAM, JSON.stringify(members));
}

export function addTeamMember(member: Omit<TeamMember, 'id'>): TeamMember {
    const members = getTeamMembers();
    const newMember = { ...member, id: Date.now().toString() };
    members.push(newMember);
    saveTeamMembers(members);
    return newMember;
}

export function updateTeamMember(id: string, updates: Partial<TeamMember>): void {
    const members = getTeamMembers();
    const index = members.findIndex(m => m.id === id);
    if (index !== -1) {
        members[index] = { ...members[index], ...updates };
        saveTeamMembers(members);
    }
}

export function deleteTeamMember(id: string): void {
    const members = getTeamMembers().filter(m => m.id !== id);
    saveTeamMembers(members);
}

// Projects
export function getProjects(): Project[] {
    if (!isBrowser) return defaultProjects;
    const stored = localStorage.getItem(KEYS.PROJECTS);
    if (!stored) {
        localStorage.setItem(KEYS.PROJECTS, JSON.stringify(defaultProjects));
        return defaultProjects;
    }
    return JSON.parse(stored);
}

export function saveProjects(projects: Project[]): void {
    if (isBrowser) localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
}

export function addProject(project: Omit<Project, 'id'>): Project {
    const projects = getProjects();
    const newProject = { ...project, id: Date.now().toString() };
    projects.push(newProject);
    saveProjects(projects);
    return newProject;
}

export function updateProject(id: string, updates: Partial<Project>): void {
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index !== -1) {
        projects[index] = { ...projects[index], ...updates };
        saveProjects(projects);
    }
}

export function deleteProject(id: string): void {
    const projects = getProjects().filter(p => p.id !== id);
    saveProjects(projects);
}

// Tasks
export function getTasks(): Task[] {
    if (!isBrowser) return defaultTasks;
    const stored = localStorage.getItem(KEYS.TASKS);
    if (!stored) {
        localStorage.setItem(KEYS.TASKS, JSON.stringify(defaultTasks));
        return defaultTasks;
    }
    return JSON.parse(stored);
}

export function saveTasks(tasks: Task[]): void {
    if (isBrowser) localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
}

export function addTask(task: Omit<Task, 'id'>): Task {
    const tasks = getTasks();
    const newTask = { ...task, id: Date.now().toString() };
    tasks.push(newTask);
    saveTasks(tasks);
    return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): void {
    const tasks = getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updates };
        saveTasks(tasks);
    }
}

export function deleteTask(id: string): void {
    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
}

// Settings
export function getSettings(): UserSettings {
    if (!isBrowser) return defaultSettings;
    const stored = localStorage.getItem(KEYS.SETTINGS);
    if (!stored) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(defaultSettings));
        return defaultSettings;
    }
    return JSON.parse(stored);
}

export function saveSettings(settings: UserSettings): void {
    if (isBrowser) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// Stats helper
export function getStats() {
    return {
        projects: getProjects().filter(p => p.status === 'active').length,
        tasks: getTasks().filter(t => t.status !== 'done').length,
        team: getTeamMembers().length,
        chats: isBrowser ? parseInt(localStorage.getItem(KEYS.CHATS_COUNT) || '0') : 0,
    };
}

export function incrementChatsCount(): void {
    if (isBrowser) {
        const current = parseInt(localStorage.getItem(KEYS.CHATS_COUNT) || '0');
        localStorage.setItem(KEYS.CHATS_COUNT, (current + 1).toString());
    }
}
