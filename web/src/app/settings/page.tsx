"use client";

import { useState } from "react";

interface SettingSection {
    id: string;
    title: string;
    icon: string;
}

const sections: SettingSection[] = [
    { id: "profile", title: "Profile", icon: "👤" },
    { id: "appearance", title: "Appearance", icon: "🎨" },
    { id: "notifications", title: "Notifications", icon: "🔔" },
    { id: "integrations", title: "Integrations", icon: "🔗" },
    { id: "security", title: "Security", icon: "🔒" },
    { id: "billing", title: "Billing", icon: "💳" },
];

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState("profile");
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        slack: false,
        discord: true,
    });

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-6xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Settings</h1>
                    <p className="text-[#71717a]">Manage your account and preferences</p>
                </div>

                <div className="flex gap-8">
                    {/* Sidebar Navigation */}
                    <div className="w-64 shrink-0">
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-2">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeSection === section.id
                                            ? "bg-[#6366f1] text-white"
                                            : "hover:bg-[#252525] text-[#a1a1aa]"
                                        }`}
                                >
                                    <span>{section.icon}</span>
                                    <span>{section.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Profile Section */}
                        {activeSection === "profile" && (
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-fadeIn">
                                <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>

                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-4xl">
                                        🚀
                                    </div>
                                    <div>
                                        <button className="px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg text-sm font-medium transition-colors">
                                            Change Avatar
                                        </button>
                                        <p className="text-sm text-[#71717a] mt-2">JPG, PNG or GIF. Max 2MB</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Display Name</label>
                                        <input
                                            type="text"
                                            defaultValue="ACE07X"
                                            className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Email</label>
                                        <input
                                            type="email"
                                            defaultValue="ace07x@ultraace.dev"
                                            className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Bio</label>
                                        <textarea
                                            rows={3}
                                            defaultValue="Full-stack developer building amazing things with AI."
                                            className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1] transition-colors resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-[#2a2a2a] flex justify-end">
                                    <button className="px-6 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg font-medium transition-colors">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Appearance Section */}
                        {activeSection === "appearance" && (
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-fadeIn">
                                <h2 className="text-xl font-semibold mb-6">Appearance</h2>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-[#252525] rounded-lg">
                                        <div>
                                            <h3 className="font-medium">Dark Mode</h3>
                                            <p className="text-sm text-[#71717a]">Use dark theme across the application</p>
                                        </div>
                                        <button
                                            onClick={() => setDarkMode(!darkMode)}
                                            className={`w-12 h-6 rounded-full transition-colors ${darkMode ? "bg-[#6366f1]" : "bg-[#3a3a3a]"}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${darkMode ? "translate-x-6" : "translate-x-0.5"}`} />
                                        </button>
                                    </div>

                                    <div>
                                        <h3 className="font-medium mb-4">Accent Color</h3>
                                        <div className="flex gap-3">
                                            {["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"].map((color) => (
                                                <button
                                                    key={color}
                                                    className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-white transition-colors"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-medium mb-4">Font Size</h3>
                                        <div className="flex gap-3">
                                            {["Small", "Medium", "Large"].map((size) => (
                                                <button
                                                    key={size}
                                                    className={`px-4 py-2 rounded-lg transition-colors ${size === "Medium" ? "bg-[#6366f1]" : "bg-[#252525] hover:bg-[#3a3a3a]"}`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifications Section */}
                        {activeSection === "notifications" && (
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-fadeIn">
                                <h2 className="text-xl font-semibold mb-6">Notifications</h2>

                                <div className="space-y-4">
                                    {Object.entries(notifications).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between p-4 bg-[#252525] rounded-lg">
                                            <div>
                                                <h3 className="font-medium capitalize">{key} Notifications</h3>
                                                <p className="text-sm text-[#71717a]">Receive notifications via {key}</p>
                                            </div>
                                            <button
                                                onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                                className={`w-12 h-6 rounded-full transition-colors ${value ? "bg-[#6366f1]" : "bg-[#3a3a3a]"}`}
                                            >
                                                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${value ? "translate-x-6" : "translate-x-0.5"}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Integrations Section */}
                        {activeSection === "integrations" && (
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-fadeIn">
                                <h2 className="text-xl font-semibold mb-6">Integrations</h2>

                                <div className="grid gap-4">
                                    {[
                                        { name: "Discord", icon: "🎮", connected: true, desc: "Connect your Discord for notifications" },
                                        { name: "GitHub", icon: "🐙", connected: true, desc: "Sync repositories and commits" },
                                        { name: "Slack", icon: "💬", connected: false, desc: "Get updates in your Slack workspace" },
                                        { name: "Notion", icon: "📝", connected: false, desc: "Sync tasks with Notion databases" },
                                    ].map((integration) => (
                                        <div key={integration.name} className="flex items-center justify-between p-4 bg-[#252525] rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl">{integration.icon}</span>
                                                <div>
                                                    <h3 className="font-medium">{integration.name}</h3>
                                                    <p className="text-sm text-[#71717a]">{integration.desc}</p>
                                                </div>
                                            </div>
                                            <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${integration.connected
                                                    ? "bg-[#252525] border border-[#3a3a3a] hover:bg-[#2a2a2a]"
                                                    : "bg-[#6366f1] hover:bg-[#4f46e5]"
                                                }`}>
                                                {integration.connected ? "Disconnect" : "Connect"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Security Section */}
                        {activeSection === "security" && (
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-fadeIn">
                                <h2 className="text-xl font-semibold mb-6">Security</h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Current Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">New Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-lg focus:outline-none focus:border-[#6366f1] transition-colors"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-[#252525] rounded-lg">
                                        <div>
                                            <h3 className="font-medium">Two-Factor Authentication</h3>
                                            <p className="text-sm text-[#71717a]">Add an extra layer of security</p>
                                        </div>
                                        <button className="px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg text-sm font-medium transition-colors">
                                            Enable 2FA
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-[#2a2a2a] flex justify-end">
                                    <button className="px-6 py-2 bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg font-medium transition-colors">
                                        Update Password
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Billing Section */}
                        {activeSection === "billing" && (
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-fadeIn">
                                <h2 className="text-xl font-semibold mb-6">Billing</h2>

                                <div className="p-6 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-xl mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium opacity-80">Current Plan</span>
                                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Pro</span>
                                    </div>
                                    <h3 className="text-3xl font-bold mb-2">$29<span className="text-lg font-normal opacity-80">/month</span></h3>
                                    <p className="opacity-80">Unlimited projects, priority support, advanced AI features</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-[#252525] rounded-lg">
                                        <div>
                                            <h3 className="font-medium">Payment Method</h3>
                                            <p className="text-sm text-[#71717a]">Visa ending in 4242</p>
                                        </div>
                                        <button className="text-[#6366f1] hover:underline text-sm">Update</button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-[#252525] rounded-lg">
                                        <div>
                                            <h3 className="font-medium">Next Billing Date</h3>
                                            <p className="text-sm text-[#71717a]">February 1, 2026</p>
                                        </div>
                                        <button className="text-[#71717a] hover:text-white text-sm">View History</button>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
                                    <button className="text-red-500 hover:underline text-sm">Cancel Subscription</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
