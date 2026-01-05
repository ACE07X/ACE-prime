import { ScannedFile } from './codebaseScanner.js';

export interface SecurityIssue {
    file: string;
    line?: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type: string;
    description: string;
    code?: string;
    recommendation: string;
}

export interface AnalysisResult {
    issues: SecurityIssue[];
    filesAnalyzed: number;
    issuesBySeverity: Record<string, number>;
    analysisTime: number;
}

interface SecurityPattern {
    name: string;
    pattern: RegExp;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    recommendation: string;
    languages: string[];
}

const SECURITY_PATTERNS: SecurityPattern[] = [
    // SQL Injection
    {
        name: 'sql-injection',
        pattern: /(\$\{.*\}|['"]?\s*\+\s*\w+\s*\+\s*['"]?).*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/gi,
        severity: 'CRITICAL',
        description: 'Potential SQL injection vulnerability - string concatenation in SQL query',
        recommendation: 'Use parameterized queries or prepared statements',
        languages: ['typescript', 'javascript', 'python', 'java', 'php'],
    },
    // Hardcoded Secrets
    {
        name: 'hardcoded-secret',
        pattern: /(?:password|secret|api[_-]?key|token|auth)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
        severity: 'HIGH',
        description: 'Hardcoded secret or API key detected',
        recommendation: 'Use environment variables for sensitive data',
        languages: ['typescript', 'javascript', 'python', 'java', 'php', 'json'],
    },
    // Eval Usage
    {
        name: 'code-injection',
        pattern: /\beval\s*\(|\bnew\s+Function\s*\(/g,
        severity: 'HIGH',
        description: 'Use of eval() or Function() constructor - potential code injection',
        recommendation: 'Avoid eval() and use safer alternatives',
        languages: ['typescript', 'javascript', 'typescript-react', 'javascript-react'],
    },
    // Command Injection
    {
        name: 'command-injection',
        pattern: /(?:exec|spawn|system|shell_exec|popen)\s*\([^)]*\$|(?:exec|spawn|system|shell_exec|popen)\s*\([^)]*\+/gi,
        severity: 'CRITICAL',
        description: 'Potential command injection - user input in shell command',
        recommendation: 'Sanitize inputs and use safe APIs',
        languages: ['typescript', 'javascript', 'python', 'php'],
    },
    // Insecure Crypto
    {
        name: 'weak-crypto',
        pattern: /(?:md5|sha1)\s*\(/gi,
        severity: 'MEDIUM',
        description: 'Weak cryptographic algorithm (MD5/SHA1)',
        recommendation: 'Use SHA-256 or stronger algorithms',
        languages: ['typescript', 'javascript', 'python', 'java', 'php'],
    },
    // XSS Vulnerabilities
    {
        name: 'xss-vulnerability',
        pattern: /innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\(/g,
        severity: 'HIGH',
        description: 'Potential XSS vulnerability - unsafe HTML insertion',
        recommendation: 'Sanitize user input before inserting into DOM',
        languages: ['typescript', 'javascript', 'typescript-react', 'javascript-react'],
    },
    // Insecure HTTP
    {
        name: 'insecure-http',
        pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/g,
        severity: 'MEDIUM',
        description: 'Insecure HTTP URL detected',
        recommendation: 'Use HTTPS for all external URLs',
        languages: ['typescript', 'javascript', 'python', 'java', 'php', 'json', 'yaml'],
    },
    // Exposed .env
    {
        name: 'exposed-env',
        pattern: /process\.env\.\w+/g,
        severity: 'LOW',
        description: 'Environment variable usage detected - ensure not exposed to client',
        recommendation: 'Verify env vars are server-side only',
        languages: ['typescript', 'javascript', 'typescript-react', 'javascript-react'],
    },
    // Debug/Console
    {
        name: 'debug-code',
        pattern: /console\.(log|debug|info)\s*\(|debugger;/g,
        severity: 'LOW',
        description: 'Debug code detected',
        recommendation: 'Remove console.log and debugger statements in production',
        languages: ['typescript', 'javascript', 'typescript-react', 'javascript-react'],
    },
    // JWT Issues
    {
        name: 'jwt-none-algorithm',
        pattern: /algorithm\s*[:=]\s*['"]none['"]/gi,
        severity: 'CRITICAL',
        description: 'JWT with "none" algorithm - extremely insecure',
        recommendation: 'Always use a secure algorithm like HS256 or RS256',
        languages: ['typescript', 'javascript', 'json'],
    },
];

export class CodeAnalyzer {
    async analyze(files: ScannedFile[]): Promise<AnalysisResult> {
        const startTime = Date.now();
        const issues: SecurityIssue[] = [];
        let filesAnalyzed = 0;

        console.log(`🔒 Ultra ACE: Analyzing ${files.length} files for security issues...`);

        for (const file of files) {
            if (!file.content) continue;
            filesAnalyzed++;

            const lines = file.content.split('\n');

            for (const pattern of SECURITY_PATTERNS) {
                if (!pattern.languages.includes(file.language)) continue;

                lines.forEach((line, index) => {
                    const matches = line.match(pattern.pattern);
                    if (matches) {
                        issues.push({
                            file: file.relativePath,
                            line: index + 1,
                            severity: pattern.severity,
                            type: pattern.name,
                            description: pattern.description,
                            code: line.trim().substring(0, 100),
                            recommendation: pattern.recommendation,
                        });
                    }
                });
            }
        }

        const issuesBySeverity: Record<string, number> = {
            CRITICAL: 0,
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
        };

        issues.forEach(issue => {
            issuesBySeverity[issue.severity]++;
        });

        const analysisTime = Date.now() - startTime;

        if (issues.length > 0) {
            console.log(`⚠️  Ultra ACE: Found ${issues.length} security issues`);
            console.log(`   CRITICAL: ${issuesBySeverity.CRITICAL} | HIGH: ${issuesBySeverity.HIGH} | MEDIUM: ${issuesBySeverity.MEDIUM} | LOW: ${issuesBySeverity.LOW}`);
        } else {
            console.log(`✅ Ultra ACE: No security issues found`);
        }

        return {
            issues,
            filesAnalyzed,
            issuesBySeverity,
            analysisTime,
        };
    }

    generateReport(result: AnalysisResult): string {
        if (result.issues.length === 0) {
            return '✅ No security issues detected. Codebase looks clean!';
        }

        let report = `\n${'='.repeat(50)}\n`;
        report += `🛡️  ULTRA ACE SECURITY REPORT\n`;
        report += `${'='.repeat(50)}\n\n`;
        report += `Files analyzed: ${result.filesAnalyzed}\n`;
        report += `Issues found: ${result.issues.length}\n`;
        report += `Analysis time: ${result.analysisTime}ms\n\n`;

        // Group by severity
        const criticalIssues = result.issues.filter(i => i.severity === 'CRITICAL');
        const highIssues = result.issues.filter(i => i.severity === 'HIGH');

        if (criticalIssues.length > 0) {
            report += `🚨 CRITICAL ISSUES (${criticalIssues.length}):\n`;
            report += `${'─'.repeat(30)}\n`;
            criticalIssues.forEach(issue => {
                report += `  📍 ${issue.file}:${issue.line}\n`;
                report += `     Type: ${issue.type}\n`;
                report += `     ${issue.description}\n`;
                report += `     Fix: ${issue.recommendation}\n\n`;
            });
        }

        if (highIssues.length > 0) {
            report += `⚠️  HIGH SEVERITY (${highIssues.length}):\n`;
            report += `${'─'.repeat(30)}\n`;
            highIssues.slice(0, 5).forEach(issue => {
                report += `  📍 ${issue.file}:${issue.line}\n`;
                report += `     Type: ${issue.type}\n`;
                report += `     ${issue.description}\n\n`;
            });
            if (highIssues.length > 5) {
                report += `  ... and ${highIssues.length - 5} more high severity issues\n\n`;
            }
        }

        return report;
    }
}
