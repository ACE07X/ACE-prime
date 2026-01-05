import * as chokidar from 'chokidar';
import * as path from 'path';
import { CodebaseScanner, ScannedFile } from './codebaseScanner.js';
import { CodeAnalyzer, AnalysisResult, SecurityIssue } from './codeAnalyzer.js';
import { GitIntegration } from './gitIntegration.js';
import { MemoryStore, Incident } from './memoryStore.js';

export interface LoopConfig {
    rootDir: string;
    scanIntervalMs: number;
    watchEnabled: boolean;
    autoBlock: boolean;
}

export class AutonomousLoop {
    private config: LoopConfig;
    private scanner: CodebaseScanner;
    private analyzer: CodeAnalyzer;
    private git: GitIntegration;
    private memory: MemoryStore;
    private watcher?: chokidar.FSWatcher;
    private isRunning = false;
    private lastScanResult?: AnalysisResult;

    constructor(config: LoopConfig) {
        this.config = config;
        this.scanner = new CodebaseScanner(config.rootDir);
        this.analyzer = new CodeAnalyzer();
        this.git = new GitIntegration(config.rootDir);
        this.memory = new MemoryStore();
    }

    async start(): Promise<void> {
        console.log('\n' + '═'.repeat(50));
        console.log('🚀 ULTRA ACE AUTONOMOUS AGENT STARTING');
        console.log('═'.repeat(50));
        console.log(`📁 Watching: ${this.config.rootDir}`);
        console.log(`⏱️  Scan interval: ${this.config.scanIntervalMs / 1000}s`);
        console.log(`👁️  Real-time watch: ${this.config.watchEnabled ? 'ENABLED' : 'DISABLED'}`);
        console.log('═'.repeat(50) + '\n');

        this.isRunning = true;

        // Initial full scan
        await this.runFullScan();

        // Start periodic scanning
        this.startPeriodicScanning();

        // Start file watcher if enabled
        if (this.config.watchEnabled) {
            this.startFileWatcher();
        }

        // Handle graceful shutdown
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

    async stop(): Promise<void> {
        console.log('\n🛑 Ultra ACE: Shutting down...');
        this.isRunning = false;

        if (this.watcher) {
            await this.watcher.close();
        }

        console.log('👋 Ultra ACE: Goodbye! Stay secure.');
        process.exit(0);
    }

    private async runFullScan(): Promise<void> {
        console.log('\n🔄 Ultra ACE: Starting full codebase scan...');

        // Scan files
        const scanResult = await this.scanner.scan(true);
        const securityFiles = this.scanner.getSecurityRelevantFiles(scanResult.files);

        // Analyze for security issues
        const analysisResult = await this.analyzer.analyze(securityFiles);
        this.lastScanResult = analysisResult;

        // Generate and display report
        const report = this.analyzer.generateReport(analysisResult);
        console.log(report);

        // Store incidents in memory
        if (analysisResult.issues.length > 0) {
            await this.storeIncidents(analysisResult.issues);
            await this.generateResponse(analysisResult);
        }

        // Check git status
        if (await this.git.isGitRepo()) {
            const branch = await this.git.getCurrentBranch();
            const uncommitted = await this.git.getUncommittedChanges();
            console.log(`📌 Git: On branch "${branch}" with ${uncommitted.length} uncommitted changes`);
        }
    }

    private startPeriodicScanning(): void {
        setInterval(async () => {
            if (!this.isRunning) return;
            await this.runFullScan();
        }, this.config.scanIntervalMs);
    }

    private startFileWatcher(): void {
        const watchPattern = path.join(this.config.rootDir, '**/*.{ts,tsx,js,jsx,py,java,php,sql}');

        this.watcher = chokidar.watch(watchPattern, {
            ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/.next/**',
            ],
            persistent: true,
            ignoreInitial: true,
        });

        this.watcher.on('change', async (filePath) => {
            console.log(`\n📝 Ultra ACE: File changed: ${path.relative(this.config.rootDir, filePath)}`);
            await this.analyzeFile(filePath);
        });

        this.watcher.on('add', async (filePath) => {
            console.log(`\n➕ Ultra ACE: New file: ${path.relative(this.config.rootDir, filePath)}`);
            await this.analyzeFile(filePath);
        });

        console.log('👁️  Ultra ACE: Real-time file watching active');
    }

    private async analyzeFile(filePath: string): Promise<void> {
        const fs = await import('fs');

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const ext = path.extname(filePath).toLowerCase();

            const file: ScannedFile = {
                path: filePath,
                relativePath: path.relative(this.config.rootDir, filePath),
                language: this.getLanguage(ext),
                size: content.length,
                lastModified: new Date(),
                content,
            };

            const result = await this.analyzer.analyze([file]);

            if (result.issues.length > 0) {
                console.log(`⚠️  Found ${result.issues.length} issues in changed file`);
                result.issues.forEach(issue => {
                    console.log(`   📍 Line ${issue.line}: ${issue.type} (${issue.severity})`);
                });
                await this.storeIncidents(result.issues);
            }
        } catch (error) {
            // File might be binary or inaccessible
        }
    }

    private getLanguage(ext: string): string {
        const map: Record<string, string> = {
            '.ts': 'typescript',
            '.tsx': 'typescript-react',
            '.js': 'javascript',
            '.jsx': 'javascript-react',
            '.py': 'python',
            '.java': 'java',
            '.php': 'php',
            '.sql': 'sql',
        };
        return map[ext] || 'unknown';
    }

    private async storeIncidents(issues: SecurityIssue[]): Promise<void> {
        for (const issue of issues) {
            if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') {
                const incident: Incident = {
                    type: issue.type,
                    severity: issue.severity,
                    file: issue.file,
                    line: issue.line,
                    description: issue.description,
                    recommendation: issue.recommendation,
                    detected_at: new Date().toISOString(),
                    resolved: false,
                };
                await this.memory.storeIncident(incident);
            }
        }
    }

    private async generateResponse(result: AnalysisResult): Promise<void> {
        const criticalCount = result.issuesBySeverity.CRITICAL || 0;
        const highCount = result.issuesBySeverity.HIGH || 0;

        if (criticalCount > 0 || highCount > 0) {
            console.log('\n' + '═'.repeat(50));
            console.log('🛡️  ULTRA ACE AUTONOMOUS RESPONSE');
            console.log('═'.repeat(50));

            if (criticalCount > 0) {
                console.log(`\n🚨 SEVERITY: CRITICAL`);
                console.log(`   BLOCK ACTION: ${this.config.autoBlock ? 'TRUE' : 'RECOMMENDED'}`);
                console.log(`   Critical security issues detected.`);
                console.log(`   Human security review is MANDATORY.`);
            } else {
                console.log(`\n⚠️  SEVERITY: HIGH`);
                console.log(`   BLOCK ACTION: RECOMMENDED`);
                console.log(`   Security issues require attention.`);
            }

            const types = [...new Set(result.issues.map(i => i.type))];
            console.log(`\n   VECTORS: ${types.join(', ')}`);

            console.log('\n   RECOMMENDATIONS:');
            if (criticalCount > 0) {
                console.log('   • Block deployment until issues are resolved');
                console.log('   • Conduct immediate code review');
            }
            if (result.issues.some(i => i.type === 'sql-injection')) {
                console.log('   • Implement parameterized queries');
            }
            if (result.issues.some(i => i.type === 'hardcoded-secret')) {
                console.log('   • Move secrets to environment variables');
                console.log('   • Rotate any exposed credentials immediately');
            }

            console.log('\n' + '═'.repeat(50));
        }
    }
}
