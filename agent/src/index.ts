import { AutonomousLoop } from './autonomousLoop.js';
import * as path from 'path';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██╗   ██╗██╗  ████████╗██████╗  █████╗                  ║
║   ██║   ██║██║  ╚══██╔══╝██╔══██╗██╔══██╗                 ║
║   ██║   ██║██║     ██║   ██████╔╝███████║                 ║
║   ██║   ██║██║     ██║   ██╔══██╗██╔══██║                 ║
║   ╚██████╔╝███████╗██║   ██║  ██║██║  ██║                 ║
║    ╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝                 ║
║                                                           ║
║    █████╗  ██████╗███████╗                                ║
║   ██╔══██╗██╔════╝██╔════╝                                ║
║   ███████║██║     █████╗                                  ║
║   ██╔══██║██║     ██╔══╝                                  ║
║   ██║  ██║╚██████╗███████╗                                ║
║   ╚═╝  ╚═╝ ╚═════╝╚══════╝                                ║
║                                                           ║
║   AUTONOMOUS SECURITY AGENT                               ║
║   Created by ACE07X @ Soul Tech                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

// Parse command line arguments
const args = process.argv.slice(2);
const scanOnly = args.includes('--scan-only');
const targetDir = args.find(a => !a.startsWith('--')) || path.resolve(__dirname, '../..');

// Configuration
const config = {
    rootDir: targetDir,
    scanIntervalMs: 5 * 60 * 1000, // 5 minutes
    watchEnabled: !scanOnly,
    autoBlock: false, // Set to true to auto-block deployments on critical issues
};

// Start the autonomous loop
const agent = new AutonomousLoop(config);

if (scanOnly) {
    console.log('🔍 Running single scan...\n');
    // For scan-only mode, we just run once
    agent.start().then(() => {
        setTimeout(() => process.exit(0), 2000);
    });
} else {
    agent.start();
}
