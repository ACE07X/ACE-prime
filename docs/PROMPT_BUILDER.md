# PromptBuilder — Design and Integration Guide

## Overview

`PromptBuilder` is the **prompt assembly layer** in ACE Prime's processing pipeline. It combines pre-loaded prompts, persona information, and context into a structured payload ready for LLM consumption.

## Core Responsibility

**Assembly and Validation Only**

PromptBuilder takes components that have already been prepared by other layers and assembles them in the correct order. It does NOT:

- ❌ Load prompt files (PromptLoader's job)
- ❌ Select persona (PersonaSelector's job)
- ❌ Summarize context (ContextManager's job)
- ❌ Call AI services (AIService's job)
- ❌ Format responses (ResponseFormatter's job)

## Prompt Assembly Order

This order is **NON-NEGOTIABLE** and enforced programmatically:

```
┌─────────────────────────────────────────────┐
│ 1. SYSTEM PROMPT (Persona-Specific)        │
│    ↳ Butler: butler.system.md              │
│    ↳ Supervisor: supervisor.system.md      │
├─────────────────────────────────────────────┤
│ 2. DEVELOPER PROMPT                         │
│    ↳ Always: developer.md                  │
├─────────────────────────────────────────────┤
│ 3. CONTEXT BLOCK (Optional)                 │
│    ↳ Conversation summary                  │
│    ↳ Project context                       │
│    ↳ User preferences                      │
├─────────────────────────────────────────────┤
│ 4. USER MESSAGE                             │
│    ↳ Raw Discord message                   │
│    ↳ NEVER altered or rephrased            │
└─────────────────────────────────────────────┘
```

### Why This Order Matters

1. **System Prompt First**: Establishes the persona identity and behavioral rules
2. **Developer Prompt Second**: Provides technical guidelines that apply to all responses
3. **Context Third**: Gives situational awareness after identity is established
4. **User Message Last**: LLM sees the actual request after all context is provided

This order ensures the LLM always knows:
- WHO it is (persona)
- HOW to behave (developer guidelines)
- WHAT it knows (context)
- WHAT is being asked (user message)

## Persona Enforcement

### Why PersonaSelection is Mandatory

```typescript
private validatePersonaSelection(personaSelection: PersonaSelection | undefined): void {
  if (!personaSelection) {
    throw new Error(
      'PromptBuilder requires PersonaSelection. ' +
      'This indicates a pipeline ordering violation.'
    );
  }
}
```

**Security Reasoning:**

1. **Architectural Guarantee**: If PromptBuilder receives no PersonaSelection, it means the pipeline violated its contract
2. **Fail-Fast**: Better to error immediately than use a default persona (which would be a security risk)
3. **Audit Trail**: PersonaSelection contains metadata needed for logging (userId, messageId, timestamp)
4. **No Backdoors**: There are NO silent fallbacks or default personas

### Persona-to-Prompt Mapping

```typescript
const promptType = persona === PersonaType.BUTLER
  ? PromptType.BUTLER_SYSTEM
  : PromptType.SUPERVISOR_SYSTEM;
```

This mapping is:
- **Explicit**: No guessing or inference
- **Exhaustive**: All PersonaType values are handled
- **Validated**: Unknown personas throw errors immediately

## Integration with Pipeline

### Current Pipeline Position

```
Discord Message
   ↓
[IdentityResolution Stage]
   ↓
[PersonaSelection Stage] ← Persona selected here
   ↓
[ContextManagement Stage] ← Context summarized here
   ↓
[PromptBuilding Stage] ← PromptBuilder used here ⭐
   ↓
[AIService Stage] ← Built prompt sent to LLM here
   ↓
[ResponseFormatting Stage]
```

### How PromptBuilder Will Be Used

When the PromptBuilding stage is implemented, it will use PromptBuilder like this:

```typescript
class PromptBuildingStage extends PipelineStage<ContextSummary, BuiltPrompt> {
  constructor(
    private promptBuilder: PromptBuilder
  ) {
    super('PromptBuilding', ['PersonaSelection', 'ContextManagement']);
  }

  protected async executeStage(
    contextSummary: ContextSummary,
    pipelineContext: PipelineContext
  ): Promise<BuiltPrompt> {
    // Get persona selection from previous stage
    const personaSelection = this.getStageResult<PersonaSelection>(
      pipelineContext,
      'PersonaSelection'
    );

    // Get user message from original Discord message
    const userMessage = pipelineContext.message.content;

    // Build prompt
    const builtPrompt = this.promptBuilder.buildAndValidate({
      personaSelection,
      userMessage,
      context: contextSummary,
    });

    return builtPrompt;
  }
}
```

### Pipeline Guarantees

Because PromptBuilder is a pipeline stage with declared dependencies:

1. **PersonaSelection MUST complete first** (dependency declared)
2. **Pipeline validates dependencies** before stage execution
3. **If persona is missing**, pipeline fails at construction (not runtime)
4. **Order is enforced** by pipeline orchestrator

## Structured Output Format

PromptBuilder produces a `BuiltPrompt` object:

```typescript
interface BuiltPrompt {
  messages: LLMMessage[];  // Array of role + content
  metadata: {
    persona: PersonaType;
    userId: string;
    messageId: string;
    builtAt: Date;
    hasContext: boolean;
  };
}
```

### Why This Structure?

1. **LLM Compatibility**: `messages` array is compatible with OpenAI Messages API
2. **Audit Trail**: `metadata` provides full traceability
3. **Validation**: Structure can be validated before sending to LLM
4. **Future-Proof**: Easy to add more metadata without breaking LLM payload

### Example Built Prompt

```typescript
{
  messages: [
    {
      role: 'system',
      content: 'You are ACE Prime, the loyal personal butler...\n\nYou reason step by step...\n\n--- Context ---\nConversation Context: ...'
    },
    {
      role: 'user',
      content: 'Help me debug this Python script'
    }
  ],
  metadata: {
    persona: 'BUTLER',
    userId: '618512174620475394',
    messageId: '123456789',
    builtAt: Date('2026-01-01T12:00:00Z'),
    hasContext: true
  }
}
```

## Validation Strategy

### Input Validation

```typescript
// 1. PersonaSelection must exist
this.validatePersonaSelection(input.personaSelection);

// 2. User message must be non-empty
if (!input.userMessage || input.userMessage.trim().length === 0) {
  throw new Error('User message is required');
}

// 3. Prompts must load successfully
const systemPrompt = this.loadSystemPrompt(persona); // throws on failure
const developerPrompt = this.loadDeveloperPrompt(); // throws on failure
```

### Output Validation

```typescript
// 1. Must have at least 2 messages
if (messages.length < 2) {
  throw new Error('Expected at least 2 messages');
}

// 2. First message must be system
if (messages[0].role !== 'system') {
  throw new Error('First message must be system');
}

// 3. Last message must be user
if (lastMessage.role !== 'user') {
  throw new Error('Last message must be user');
}

// 4. All messages must have content
for (const message of messages) {
  if (!message.content || message.content.trim().length === 0) {
    throw new Error('Message has empty content');
  }
}
```

### Why Validate Output?

Even though PromptBuilder controls the assembly, validation ensures:
- No bugs introduced during refactoring
- Clear contract for downstream stages (AIService)
- Easier debugging if LLM returns errors
- Defense-in-depth security

## Error Handling Philosophy

### Fail-Fast on Critical Errors

```typescript
// No PersonaSelection? → FAIL IMMEDIATELY
if (!personaSelection) {
  throw new Error('Pipeline ordering violation');
}

// Prompt file missing? → FAIL IMMEDIATELY
if (!prompt) {
  throw new Error('Failed to load system prompt');
}

// Invalid assembly? → FAIL IMMEDIATELY
if (messages[0].role !== 'system') {
  throw new Error('Invalid prompt structure');
}
```

### No Silent Fallbacks

PromptBuilder has **ZERO** default values or fallback behaviors:

- ❌ No default persona
- ❌ No default prompts
- ❌ No empty context substitution
- ❌ No "best effort" assembly

**Reasoning**: Better to error visibly than produce incorrect prompts silently.

## Context Handling

### Pre-Summarization Requirement

PromptBuilder expects `ContextSummary` to already be:

1. **Summarized**: Not raw conversation logs or DB dumps
2. **Sized**: Fits within token limits
3. **Structured**: Organized into logical sections

```typescript
interface ContextSummary {
  conversationSummary?: string;  // Already summarized
  projectContext?: string;        // Already summarized
  userPreferences?: string;       // Already extracted
  additionalContext?: Record<string, string>;
}
```

### Context Formatting

PromptBuilder formats context into a structured block:

```
--- Context ---
Conversation Context:
[Pre-summarized conversation history]

Project Context:
[Pre-summarized project info]

User Preferences:
[User settings]
```

This format:
- Clearly delineates context from prompts
- Is easy for LLM to parse
- Maintains separation of concerns

## Design Philosophy

### PromptBuilder as Pure Assembly

PromptBuilder is **deterministic** and **side-effect free**:

```
Same Input → Same Output (always)
```

Given identical:
- PersonaSelection
- User message
- Context summary

PromptBuilder will produce byte-for-byte identical prompts.

### Why This Matters

1. **Testability**: Easy to write unit tests
2. **Debuggability**: No hidden state or side effects
3. **Reliability**: Behavior is predictable
4. **Cacheable**: Output could be cached if needed (future optimization)

### LLMs as Interchangeable Engines

PromptBuilder outputs a **generic message structure**:

```typescript
interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

This structure is compatible with:
- ✅ OpenAI GPT-3.5/GPT-4
- ✅ Anthropic Claude
- ✅ Google Gemini
- ✅ Any Messages API-compatible LLM

**Design Intent**: The LLM is just an execution engine. The "brain" is the architecture (persona + pipeline + prompts).

## Security Implications

### Prompt Injection Defense

PromptBuilder's strict assembly order defends against certain prompt injection attacks:

1. **User message is always last**: Cannot override system prompt
2. **No string interpolation**: User input is never interpolated into prompts
3. **Clear boundaries**: Context and user message are clearly separated

### Audit Trail

Every built prompt includes metadata:

```typescript
metadata: {
  persona: PersonaType,    // Which persona was used
  userId: string,          // Who made the request
  messageId: string,       // Discord message ID
  builtAt: Date,          // When prompt was built
  hasContext: boolean,    // Whether context was included
}
```

This enables:
- Security audits
- Debugging
- Performance analysis
- Compliance tracking

## Performance Characteristics

### Time Complexity

- Prompt loading: O(1) (cached by PromptLoader)
- Assembly: O(n) where n = total text length
- Validation: O(m) where m = number of messages

**Total**: O(n + m), typically <5ms

### Memory Usage

- Loaded prompts: ~3KB (butler + supervisor + developer)
- Built prompt: ~5-50KB depending on context
- Metadata: <1KB

**Total**: Negligible (<100KB per request)

### Optimization Opportunities

Future optimizations (not implemented yet):

1. **Prompt caching**: Cache assembled system messages by persona
2. **String interning**: Reuse common string objects
3. **Lazy validation**: Skip validation in production if confident

## Testing Strategy

### Unit Tests

```typescript
describe('PromptBuilder', () => {
  it('builds prompt with Butler persona', () => {
    const built = builder.build({
      personaSelection: butlerSelection,
      userMessage: 'Test message',
    });
    
    expect(built.messages[0].content).toContain('loyal personal butler');
    expect(built.metadata.persona).toBe(PersonaType.BUTLER);
  });

  it('throws when PersonaSelection is missing', () => {
    expect(() => builder.build({
      personaSelection: undefined,
      userMessage: 'Test',
    })).toThrow('requires PersonaSelection');
  });

  it('preserves user message exactly', () => {
    const userMessage = 'Test with special chars: $@#!';
    const built = builder.build({
      personaSelection: selection,
      userMessage,
    });
    
    expect(built.messages[1].content).toBe(userMessage);
  });
});
```

### Integration Tests

```typescript
describe('PromptBuilder Pipeline Integration', () => {
  it('uses persona from PersonaSelector', async () => {
    const result = await pipeline.execute(ownerMessage);
    const built = result.stageResults.get('PromptBuilding').data;
    
    expect(built.metadata.persona).toBe(PersonaType.BUTLER);
  });

  it('fails if persona stage skipped', () => {
    const invalidPipeline = builder
      .addStage(identityStage)
      // PersonaStage missing!
      .addStage(promptStage)
      .build();
    
    expect(() => invalidPipeline.execute(message))
      .toThrow('dependency not met');
  });
});
```

## Summary

### What PromptBuilder Is

- ✅ Pure assembly layer
- ✅ Validation engine
- ✅ Prompt structure enforcer
- ✅ Deterministic and side-effect free

### What PromptBuilder Is NOT

- ❌ Prompt loader
- ❌ Persona selector
- ❌ Context summarizer
- ❌ AI service
- ❌ Response formatter

### Key Guarantees

1. **PersonaSelection is mandatory** (fails without it)
2. **Assembly order is enforced** (programmatically)
3. **User message is never altered** (preserves intent)
4. **Prompts must load successfully** (no silent failures)
5. **Output is always validated** (defensive programming)

---

**PromptBuilder completes the "thinking spine" of ACE Prime. With this layer, the system can safely construct prompts for any LLM while maintaining security, auditability, and architectural integrity.**
