# ACE Prime — Architecture Documentation

## System Overview

ACE Prime is built on a **pipeline-based architecture** that enforces strict ordering and validation at every stage. The system is designed to be modular, testable, and secure.

## Core Architectural Principles

### 1. Pipeline-First Design

Every message flows through an explicit pipeline with defined stages:

```
Message → Identity → Persona → Context → Prompt → AI → Response
```

**Benefits**:
- Clear separation of concerns
- Enforced ordering of operations
- Easy to test individual stages
- Fail-fast validation
- Complete audit trail

### 2. Immutability

Critical data structures are frozen to prevent tampering:

- `SYSTEM_CONSTANTS`: Owner ID and system metadata
- `UserIdentity`: User information extracted from Discord
- `PersonaSelection`: Persona decision with audit data
- `StageResult`: Output from pipeline stages

### 3. Dependency Injection

Services are injected rather than instantiated internally:

```typescript
const personaSelector = new PersonaSelector(
  identityResolver,
  ownerValidator,
  personaLogger
);
```

**Benefits**:
- Easy to mock for testing
- Clear dependencies visible in constructor
- Flexible implementation swapping

### 4. Interface-Based Design

Core abstractions defined as interfaces:

- `Logger`: Logging abstraction
- `PipelineStage`: Base for all pipeline stages
- `AIService`: AI provider abstraction (future)
- `MemoryStore`: Memory persistence abstraction (future)

## Component Details

### Identity Resolution Layer

**Purpose**: Extract and validate user identity from Discord messages.

**Components**:
- `IdentityResolver`: Extracts user data from Discord message objects
- `OwnerValidator`: Performs exact ID comparison for owner status

**Security Guarantees**:
- Identity objects are immutable (`Object.freeze()`)
- Owner status determined solely by ID comparison
- No role or permission checks can override ID validation

**Flow**:
```
Discord Message
   ↓
IdentityResolver.resolveIdentity()
   ↓
UserIdentity (frozen)
   ↓
OwnerValidator.isOwner()
   ↓
boolean (is owner?)
```

### Persona Selection Layer

**Purpose**: Select appropriate persona based on user identity.

**Components**:
- `PersonaSelector`: Main selection logic
- `PersonaLogger`: Audit logging for selections
- `PersonaType`: Enum defining persona types

**Selection Logic**:
```typescript
if (ownerValidator.isOwner(identity)) {
  return PersonaType.BUTLER;
} else {
  return PersonaType.SUPERVISOR;
}
```

**Audit Trail**:
Every selection is logged with:
- Persona selected
- User ID and username
- Owner status
- Message ID and channel ID
- Timestamp

**Guarantees**:
- Persona selection is mandatory (pipeline fails without it)
- Selection is immutable once made
- All decisions are logged for security audit
- Cannot be spoofed or bypassed

### Pipeline Orchestration Layer

**Purpose**: Enforce correct stage ordering and manage execution flow.

**Components**:
- `Pipeline`: Orchestrates stage execution
- `PipelineStage`: Abstract base class for stages
- `PipelineBuilder`: Fluent API for constructing pipelines
- `PipelineContext`: Shared context passed through stages

**Stage Execution Flow**:

1. **Validation Phase** (at construction):
   - Check for duplicate stage names
   - Validate all dependencies exist
   - Verify dependencies come before dependents in ordering
   - Fail immediately if invalid

2. **Execution Phase** (per message):
   ```
   For each stage:
     - Validate dependencies completed
     - Execute stage logic
     - Store result in context
     - Pass output to next stage
     - Log execution time
   ```

3. **Error Handling**:
   - Critical stage failure → stop pipeline immediately
   - Non-critical stage failure → log and continue (if configured)
   - All errors stored in context for debugging

**Dependency System**:

Stages declare dependencies explicitly:

```typescript
class PromptStage extends PipelineStage {
  constructor() {
    super('PromptBuilding', ['PersonaSelection', 'ContextManagement']);
  }
}
```

If dependencies aren't met, stage execution fails with clear error message.

**Critical Stages**:

Stages marked as critical will stop pipeline on failure:

```typescript
.markCritical('PersonaSelection')
.markCritical('PromptBuilding')
```

### Persona Ordering Validation

**Special validation method for ACE Prime security requirements**:

```typescript
pipeline.validatePersonaOrdering('PersonaSelection', 'PromptBuilding');
```

Throws error if:
- Persona selection stage is missing
- Prompt building stage is missing
- Persona selection comes after prompt building

This ensures the core security requirement: **persona must be selected before prompts are constructed**.

## Data Flow

### Message Processing Flow

```
1. Discord message arrives
   ↓
2. Create pipeline context
   {
     message: Message,
     stageResults: Map,
     startedAt: Date,
     errors: []
   }
   ↓
3. Execute Identity Stage
   Input: Message
   Output: UserIdentity
   ↓
4. Execute Persona Stage
   Input: UserIdentity
   Output: PersonaSelection
   Dependencies: ['IdentityResolution']
   ↓
5. Execute Context Stage (future)
   Input: PersonaSelection
   Output: ContextSummary
   Dependencies: ['PersonaSelection']
   ↓
6. Execute Prompt Stage (future)
   Input: ContextSummary
   Output: FinalPrompt
   Dependencies: ['PersonaSelection', 'ContextManagement']
   ↓
7. Execute AI Stage (future)
   Input: FinalPrompt
   Output: AIResponse
   Dependencies: ['PromptBuilding']
   ↓
8. Execute Formatting Stage (future)
   Input: AIResponse
   Output: DiscordMessage
   Dependencies: ['AIService']
   ↓
9. Return pipeline result
   {
     output: DiscordMessage,
     stageResults: Map<string, StageResult>,
     executionTimeMs: number,
     success: boolean,
     errors: []
   }
```

### Context Accumulation

As the pipeline executes, each stage adds its result to the context:

```typescript
context.stageResults.set('IdentityResolution', {
  data: userIdentity,
  stageName: 'IdentityResolution',
  completedAt: Date,
  metadata: { executionTime: 5 }
});

context.stageResults.set('PersonaSelection', {
  data: personaSelection,
  stageName: 'PersonaSelection',
  completedAt: Date,
  metadata: { executionTime: 2 }
});
```

Later stages can access previous results:

```typescript
const personaSelection = this.getStageResult<PersonaSelection>(
  context,
  'PersonaSelection'
);
```

## Error Handling Strategy

### Construction-Time Validation

Errors caught at construction:
- Missing required configuration (e.g., logger)
- Duplicate stage names
- Missing stage dependencies
- Invalid dependency ordering
- Circular dependencies

**Philosophy**: Fail fast — catch configuration errors before any messages are processed.

### Runtime Validation

Errors caught during execution:
- Stage dependency not met
- Stage execution failure
- Timeout exceeded (future)

**Philosophy**: Clear error messages with full context for debugging.

### Error Recovery

- **Critical stages**: Stop pipeline immediately, return error
- **Non-critical stages**: Log error, continue to next stage (if `continueOnError: true`)
- **All errors**: Stored in context for post-mortem analysis

## Logging Strategy

### Structured Logging

All logs include relevant context:

```typescript
logger.info('Pipeline execution started', {
  messageId: message.id,
  channelId: message.channelId,
  userId: message.author.id,
  stageCount: this.stages.length,
});
```

### Log Levels

- **DEBUG**: Stage-level execution details
- **INFO**: Pipeline lifecycle events, persona selections
- **WARN**: Recoverable errors, non-critical failures
- **ERROR**: Critical failures, pipeline termination

### Audit Logging

Critical operations are always logged:
- Every persona selection
- Pipeline start/completion
- Stage failures
- Security violations (future)

## Security Architecture

### Owner Identification Security

**Threat Model**:
- Attacker with server admin permissions
- Attacker who can modify roles
- Attacker who can change nicknames
- Attacker who can modify bot configuration

**Defense**:
- Owner ID stored as immutable constant
- Validation uses exact string comparison only
- No role or permission checks
- OwnerValidator is the single source of truth

### Persona Selection Security

**Threat Model**:
- Bypass persona selection stage
- Spoof persona in prompt
- Modify persona after selection

**Defense**:
- Pipeline construction fails if persona stage missing
- Persona selection must occur before prompt building (validated)
- PersonaSelection object is frozen (immutable)
- All selections logged for audit

### Future Security Enhancements

- Rate limiting per user
- Input sanitization
- Command authorization
- Audit log encryption
- Anomaly detection

## Scalability Considerations

### Current Design

The architecture supports future scalability through:

1. **Stateless stages**: Each stage is independent
2. **Interface-based services**: Easy to swap implementations
3. **Modular design**: Components can be distributed
4. **Pipeline parallelization**: Independent pipelines can run concurrently

### Future Enhancements

- **Caching layer**: Cache context and prompts
- **Queue-based processing**: Decouple message receipt from processing
- **Distributed stages**: Run stages on separate services
- **Load balancing**: Multiple bot instances

## Testing Strategy

### Unit Testing

Each component should have unit tests:

- `OwnerValidator`: Test exact ID matching
- `PersonaSelector`: Test persona selection logic
- `Pipeline`: Test stage ordering, dependency validation
- `PipelineStage`: Test dependency checking, result passing

### Integration Testing

Test complete flows:

- Owner message → Butler persona selected
- Non-owner message → Supervisor persona selected
- Invalid pipeline construction → Error thrown
- Missing dependency → Error thrown

### Security Testing

Specific security scenarios:

- Attempt to bypass owner validation with roles
- Attempt to skip persona selection stage
- Attempt to reorder stages incorrectly
- Attempt to modify persona after selection

## Performance Considerations

### Optimization Points

1. **Stage execution**: Each stage should be fast (<100ms)
2. **Context size**: Limit context data to prevent memory issues
3. **Logging overhead**: Use async logging for non-critical logs
4. **Validation**: Cache validation results where possible

### Monitoring

Track these metrics:

- Pipeline execution time per stage
- Total pipeline execution time
- Error rate per stage
- Persona selection distribution (Butler vs Supervisor)

## Future Architecture Additions

### Planned Components

1. **Context Manager**: Aggregate conversation and project context
2. **Prompt Loader**: Load persona prompts from config files
3. **Prompt Builder**: Construct final prompts with persona + context
4. **AI Service**: Wrapper for OpenAI API
5. **Memory Store**: Persist conversation and project data
6. **Command Router**: Route commands to appropriate handlers
7. **Response Formatter**: Format AI responses for Discord

### Integration Points

Each component will integrate via:
- Pipeline stages for processing flow
- Service interfaces for external dependencies
- Event system for cross-component communication (future)

---

**This architecture is designed for production use with security, maintainability, and scalability as primary concerns.**
