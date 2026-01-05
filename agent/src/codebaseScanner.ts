import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface ScannedFile {
    path: string;
    relativePath: string;
    language: string;
    size: number;
    lastModified: Date;
    content?: string;
}

export interface ScanResult {
    files: ScannedFile[];
    totalFiles: number;
    totalSize: number;
    languages: Record<string, number>;
    scanTime: number;
}

const LANGUAGE_MAP: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript-react',
    '.js': 'javascript',
    '.jsx': 'javascript-react',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.sh': 'shell',
    '.ps1': 'powershell',
    '.env': 'env',
};

const IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/*.min.js',
    '**/*.map',
    '**/package-lock.json',
    '**/yarn.lock',
];

export class CodebaseScanner {
    private rootDir: string;

    constructor(rootDir: string) {
        this.rootDir = path.resolve(rootDir);
    }

    async scan(includeContent = false): Promise<ScanResult> {
        const startTime = Date.now();
        const files: ScannedFile[] = [];
        const languages: Record<string, number> = {};
        let totalSize = 0;

        console.log(`🔍 Ultra ACE: Scanning ${this.rootDir}...`);

        const filePaths = await glob('**/*', {
            cwd: this.rootDir,
            nodir: true,
            ignore: IGNORE_PATTERNS,
            absolute: true,
        });

        for (const filePath of filePaths) {
            try {
                const stats = fs.statSync(filePath);
                const ext = path.extname(filePath).toLowerCase();
                const language = LANGUAGE_MAP[ext] || 'unknown';
                const relativePath = path.relative(this.rootDir, filePath);

                const scannedFile: ScannedFile = {
                    path: filePath,
                    relativePath,
                    language,
                    size: stats.size,
                    lastModified: stats.mtime,
                };

                if (includeContent && stats.size < 100000) { // Only read files < 100KB
                    try {
                        scannedFile.content = fs.readFileSync(filePath, 'utf-8');
                    } catch {
                        // Binary file or read error
                    }
                }

                files.push(scannedFile);
                totalSize += stats.size;
                languages[language] = (languages[language] || 0) + 1;
            } catch {
                // Skip inaccessible files
            }
        }

        const scanTime = Date.now() - startTime;

        console.log(`✅ Ultra ACE: Scanned ${files.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB) in ${scanTime}ms`);

        return {
            files,
            totalFiles: files.length,
            totalSize,
            languages,
            scanTime,
        };
    }

    getFilesByLanguage(files: ScannedFile[], language: string): ScannedFile[] {
        return files.filter(f => f.language === language);
    }

    getSecurityRelevantFiles(files: ScannedFile[]): ScannedFile[] {
        const securityLanguages = ['typescript', 'typescript-react', 'javascript', 'javascript-react', 'python', 'java', 'php', 'sql'];
        return files.filter(f => securityLanguages.includes(f.language));
    }
}
