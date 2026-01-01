# ACE Prime — AI Coding Assistant & Project Manager

**Production-grade Discord bot with dual-persona system and modular architecture.**

## 🚀 Quick Start

### ⚠️ **BOT CRASHING?** Read This First!

If your bot is crashing on Railway, it's because environment variables are missing.

**👉 [COMPLETE_SETUP.md](./COMPLETE_SETUP.md) - Full setup guide with step-by-step instructions**

**Quick Fix:**
1. Go to Railway → Your Service → **Variables** tab
2. Add these 3 variables:
   - `DISCORD_TOKEN` = Your bot token
   - `DISCORD_CLIENT_ID` = Your application ID
   - `NODE_ENV` = `production`
3. Railway will auto-redeploy
4. Check logs - you should see `✅ ACE Prime is ONLINE!`

**Need help?** See [COMPLETE_SETUP.md](./COMPLETE_SETUP.md) for detailed instructions.

---

## 🎯 Overview

ACE Prime is a sophisticated Discord bot designed as an AI coding assistant and project manager. It features a unique dual-persona system that adapts its behavior based on user identity.

### Key Features

- **Dual-Persona System**: Butler mode for owner, Supervisor mode for others
- **Modular Architecture**: Clean separation of concerns with service-oriented design
- **Pipeline-Based Processing**: Enforced stage ordering with fail-fast validation
- **Security-First Design**: Immutable owner identification, comprehensive audit logging
- **Production-Ready**: Full error handling, logging, and scalability considerations

## 🏗️ Architecture

### Core Principles

1. **Immutable Owner Identity**: Owner status determined solely by Discord user ID
2. **Enforced Persona Selection**: Persona must be selected before prompt construction
3. **Service Isolation**: Each module has clear responsibilities and interfaces
4. **Fail-Fast Validation**: Configuration errors detected at construction time
5. **Complete Audit Trail**: All persona selections and critical operations logged

### Pipeline Stages

```
Discord Message
   ↓
Identity Resolution    ← Extract user identity
   ↓
Persona Selection      ← CRITICAL: Butler vs Supervisor (MANDATORY)
   ↓
Context Management     ← Aggregate conversation/project context
   ↓
Prompt Building        ← Inject persona + context + user message
   ↓
AI Service             ← OpenAI API call
   ↓
Response Formatting    ← Format for Discord
```

## 🎭 Dual-Persona System

### Butler Mode (Owner Only)

**Identity**: ACE Prime — Personal Butler & Chief Technical Aide

**Activated When**: `message.author.id === "618512174620475394"`

**Behavior**:
- Loyal and discreet
- Execution-focused
- Assumes trust and authority
- Never condescending
- Proactively improves ideas

**Tone**: Respectful, slightly formal, minimal verbosity

### Supervisor Mode (All Others)

**Identity**: ACE Prime — Senior Supervisor & Technical Lead

**Activated When**: `message.author.id !== "618512174620475394"`

**Behavior**:
- Professional and structured
- Objective and instructional
- Enforces standards
- Explains reasoning clearly

**Tone**: Neutral, authoritative, no personalization

## 📂 Project Structure

```
ace-prime/
├── src/
│   ├── config/
│   │   └── constants.ts           # Immutable system constants
│   ├── core/
│   │   ├── identity/
│   │   │   ├── IdentityResolver.ts
│   │   │   └── OwnerValidator.ts
│   │   ├── persona/
│   │   │   ├── PersonaSelector.ts
│   │   │   └── PersonaLogger.ts
│   │   └── pipeline/
│   │       ├── Pipeline.ts        # Pipeline orchestrator
│   │       ├── PipelineStage.ts   # Stage interface
│   │       └── PipelineBuilder.ts # Fluent builder
│   ├── types/
│   │   └── persona.types.ts       # TypeScript definitions
│   └── utils/
│       └── logger.ts              # Logging utilities
└── docs/
    ├── README.md                  # This file
    ├── ARCHITECTURE.md            # Detailed architecture
    └── SECURITY.md                # Security model
```

## 🔐 Security Model

### Owner Identification

- **Single Source of Truth**: `OwnerValidator` class
- **Immutable Constant**: Owner ID stored in `SYSTEM_CONSTANTS`
- **Cannot Be Spoofed Through**:
  - Discord roles or permissions
  - Server admin privileges
  - Nicknames or display names
  - Commands or configuration changes

### Persona Selection

- **Mandatory Stage**: Pipeline fails if persona selection is missing
- **Ordering Enforced**: Persona selection must occur before prompt building
- **Audit Logging**: Every persona selection logged with full context
- **Immutable Decision**: Once selected for a message, cannot be changed

## 🚀 Current Implementation Status

### ✅ Completed

- [x] Project structure and architecture design
- [x] Immutable constants and configuration
- [x] Identity resolution system
- [x] Owner validation (security-critical)
- [x] Persona selection logic
- [x] Persona audit logging
- [x] Pipeline orchestrator with stage enforcement
- [x] Pipeline builder (fluent API)
- [x] TypeScript type definitions
- [x] Logging infrastructure

### 🚧 In Progress

- [ ] Prompt loader system
- [ ] Context management
- [ ] Prompt builder
- [ ] Message handler (Discord integration)

### 📋 Planned

- [ ] AI service wrapper (OpenAI)
- [ ] Command router
- [ ] Coding assistant module
- [ ] Project manager module
- [ ] Memory store
- [ ] Response formatter
- [ ] Rate limiting
- [ ] Unit and integration tests

## 🧪 Testing Strategy

### Test Coverage Requirements

1. **Owner Validation**: Must verify exact ID matching, reject spoofing attempts
2. **Persona Selection**: Must select correct persona, log all decisions
3. **Pipeline Ordering**: Must enforce stage order, detect misconfigurations
4. **Dependency Validation**: Must validate stage dependencies at construction

### Test Scenarios

| Scenario | Expected Persona | Validation |
|----------|-----------------|------------|
| Owner sends command | Butler | ID match |
| Owner replies in thread | Butler | ID match per message |
| Non-owner user | Supervisor | ID mismatch |
| Bot user | Error | Bot validation |

## 📖 Usage Examples

### Creating a Pipeline

```typescript
import { PipelineBuilder } from './core/pipeline/PipelineBuilder';
import { ConsoleLogger } from './utils/logger';

const pipeline = new PipelineBuilder()
  .withLogger(new ConsoleLogger())
  .withTimeout(30000)
  .continueOnError(false)
  .addStage(identityStage)
  .addStage(personaStage)
  .addStage(contextStage)
  .addStage(promptStage)
  .markCritical('PersonaSelection')
  .markCritical('PromptBuilding')
  .build();

// Validate persona ordering
pipeline.validatePersonaOrdering('PersonaSelection', 'PromptBuilding');
```

### Executing the Pipeline

```typescript
const result = await pipeline.execute(discordMessage);

if (result.success) {
  console.log('Pipeline completed successfully');
  console.log('Output:', result.output);
} else {
  console.error('Pipeline failed:', result.errors);
}
```

## 🛠️ Development Guidelines

### Code Standards

- **TypeScript**: Strict mode enabled, full type coverage
- **Immutability**: Use `Object.freeze()` for critical data structures
- **Error Handling**: Fail-fast validation, comprehensive error messages
- **Logging**: Structured logging with context for all critical operations
- **Comments**: Document architectural decisions and security implications

### Adding a Pipeline Stage

1. Extend `PipelineStage<TInput, TOutput>`
2. Define dependencies in constructor
3. Implement `executeStage()` method
4. Use `getStageResult()` to access previous stage data
5. Add comprehensive error handling

## 📄 License

[Specify license here]

## 🤝 Contributing

[Contributing guidelines if applicable]

## 📞 Support

For questions or issues, contact [specify contact method].

---

**Built with security, modularity, and production-readiness in mind.**
