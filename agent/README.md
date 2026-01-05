# Ultra ACE Autonomous Security Agent

Created by **ACE07X** @ **Soul Tech**

## Overview

Ultra ACE is an autonomous security agent that continuously monitors your codebase for vulnerabilities, tracks changes, and generates security responses.

## Features

- 🔍 **Codebase Scanner** - Scans all files, detects languages, categorizes by type
- 🛡️ **Security Analyzer** - Pattern matching for SQL injection, XSS, secrets, and more
- 👁️ **Real-time Watching** - Monitors file changes as you code
- 🔄 **Periodic Scans** - Full codebase scan every 5 minutes
- 📊 **Git Integration** - Tracks commits, branches, and diffs
- 📦 **Memory Store** - Stores incidents in Supabase for learning
- 🤖 **Autonomous Response** - Generates security recommendations

## Installation

```bash
cd agent
npm install
```

## Configuration

### Environment Variables

Create a `.env` file in the `agent` folder:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Supabase Table

Create the incidents table in Supabase:

```sql
CREATE TABLE ultra_ace_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    file TEXT NOT NULL,
    line INTEGER,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE ultra_ace_incidents ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_incidents_severity ON ultra_ace_incidents(severity);
CREATE INDEX idx_incidents_type ON ultra_ace_incidents(type);
```

## Usage

### Continuous Monitoring

```bash
npm run dev
```

This will:
1. Scan your entire codebase
2. Watch for file changes in real-time
3. Run periodic scans every 5 minutes
4. Store incidents in memory/Supabase
5. Generate security responses

### Single Scan

```bash
npm run scan
```

Runs a one-time scan and exits.

### Scan Specific Directory

```bash
npx tsx src/index.ts /path/to/your/project
```

## Security Patterns Detected

| Pattern | Severity | Description |
|---------|----------|-------------|
| SQL Injection | CRITICAL | String concatenation in SQL queries |
| Command Injection | CRITICAL | User input in shell commands |
| JWT None Algorithm | CRITICAL | JWT with "none" algorithm |
| Hardcoded Secrets | HIGH | API keys, passwords in code |
| Code Injection | HIGH | eval() or Function() usage |
| XSS Vulnerability | HIGH | innerHTML, dangerouslySetInnerHTML |
| Weak Crypto | MEDIUM | MD5/SHA1 usage |
| Insecure HTTP | MEDIUM | Non-HTTPS URLs |
| Debug Code | LOW | console.log, debugger statements |

## Example Output

```
══════════════════════════════════════════════════
🚀 ULTRA ACE AUTONOMOUS AGENT STARTING
══════════════════════════════════════════════════
📁 Watching: /your/project
⏱️  Scan interval: 300s
👁️  Real-time watch: ENABLED
══════════════════════════════════════════════════

🔍 Ultra ACE: Scanning /your/project...
✅ Ultra ACE: Scanned 247 files (1.2 MB) in 156ms
🔒 Ultra ACE: Analyzing 189 files for security issues...
⚠️  Ultra ACE: Found 3 security issues
   CRITICAL: 1 | HIGH: 1 | MEDIUM: 1 | LOW: 0

══════════════════════════════════════════════════
🛡️  ULTRA ACE SECURITY REPORT
══════════════════════════════════════════════════

🚨 CRITICAL ISSUES (1):
──────────────────────────────────
  📍 src/api/users.ts:45
     Type: sql-injection
     Potential SQL injection vulnerability
     Fix: Use parameterized queries

══════════════════════════════════════════════════
🛡️  ULTRA ACE AUTONOMOUS RESPONSE
══════════════════════════════════════════════════

🚨 SEVERITY: CRITICAL
   BLOCK ACTION: RECOMMENDED
   Critical security issues detected.
   Human security review is MANDATORY.

   VECTORS: sql-injection, hardcoded-secret

   RECOMMENDATIONS:
   • Block deployment until issues are resolved
   • Conduct immediate code review
   • Implement parameterized queries

══════════════════════════════════════════════════
```

## Architecture

```
agent/
├── src/
│   ├── index.ts           # Entry point
│   ├── codebaseScanner.ts # File system scanner
│   ├── codeAnalyzer.ts    # Security pattern matching
│   ├── autonomousLoop.ts  # Continuous monitoring
│   ├── gitIntegration.ts  # Git change detection
│   └── memoryStore.ts     # Supabase persistence
├── package.json
├── tsconfig.json
└── README.md
```

## License

Proprietary - Soul Tech
