# PromptLoader Usage Guide

## Overview

`PromptLoader` is a pure I/O layer that loads prompt text files from disk. It handles file reading, caching, and validation but does NOT compose or assemble prompts.

## Responsibilities

✅ **What PromptLoader Does:**
- Load prompt files from `/prompts/` directory
- Cache prompts in memory for performance
- Validate prompt content (non-empty, valid format)
- Support hot-reload in development mode
- Throw explicit errors for missing or invalid prompts

❌ **What PromptLoader Does NOT Do:**
- Compose or assemble prompts
- Inject persona logic
- Inject context or variables
- Call AI services
- Format responses

## Usage

### Basic Loading

```typescript
import { PromptLoader, PromptType } from './core/prompts/PromptLoader';
import { ConsoleLogger } from './utils/logger';

const loader = new PromptLoader({
  promptsDirectory: './prompts',
  enableHotReload: false,
  logger: new ConsoleLogger(),
});

// Load a specific prompt
const butlerPrompt = loader.load(PromptType.BUTLER_SYSTEM);
// Returns: "You are ACE Prime, the loyal personal butler..."

const supervisorPrompt = loader.load(PromptType.SUPERVISOR_SYSTEM);
// Returns: "You are ACE Prime, a senior software supervisor..."

const developerPrompt = loader.load(PromptType.DEVELOPER);
// Returns: "You reason step by step..."
```

### Preloading on Startup

```typescript
// Load and validate all prompts at startup
try {
  loader.preloadAll();
  console.log('All prompts validated successfully');
} catch (error) {
  console.error('Prompt validation failed:', error.message);
  process.exit(1);
}
```

### Hot-Reload in Development

```typescript
const loader = new PromptLoader({
  promptsDirectory: './prompts',
  enableHotReload: process.env.NODE_ENV === 'development',
  logger: new ConsoleLogger(),
});

// In development: loads from disk every time
// In production: uses cached version after first load
const prompt = loader.load(PromptType.BUTLER_SYSTEM);
```

### Cache Management

```typescript
// Check if prompt is cached
if (loader.isCached(PromptType.BUTLER_SYSTEM)) {
  console.log('Butler prompt is in cache');
}

// Get cache statistics
const stats = loader.getCacheStats();
console.log('Cache size:', stats.size);
console.log('Cached prompts:', stats.cachedPrompts);

// Clear cache (useful for testing)
loader.clearCache();
```

## Integration with PromptBuilder (Future)

When `PromptBuilder` is implemented, it will use `PromptLoader` like this:

```typescript
// PromptBuilder will use PromptLoader internally
class PromptBuilder {
  constructor(
    private promptLoader: PromptLoader,
    // other dependencies...
  ) {}

  public buildPrompt(persona: PersonaType, context: Context): string {
    // Step 1: Load appropriate persona prompt using PromptLoader
    const systemPrompt = persona === PersonaType.BUTLER
      ? this.promptLoader.load(PromptType.BUTLER_SYSTEM)
      : this.promptLoader.load(PromptType.SUPERVISOR_SYSTEM);

    // Step 2: Load developer prompt
    const developerPrompt = this.promptLoader.load(PromptType.DEVELOPER);

    // Step 3: Assemble with context (PromptBuilder's responsibility)
    return this.assemble(systemPrompt, developerPrompt, context);
  }
}
```

**Key Separation:**
- **PromptLoader**: Loads raw text from files
- **PromptBuilder**: Assembles loaded text into final prompts with context

## Error Handling

### File Not Found

```typescript
try {
  loader.load(PromptType.BUTLER_SYSTEM);
} catch (error) {
  // Error: Prompt file not found: butler.system.md
  // Expected at: /path/to/prompts/butler.system.md
}
```

### Validation Failures

```typescript
// Empty file
// Error: Prompt 'butler.system.md' validation failed: 
//        Prompt text is empty or whitespace-only

// Forbidden patterns
// Error: Prompt 'butler.system.md' validation failed: 
//        Contains forbidden pattern ${variable}
```

## Configuration

### Development Mode

```typescript
const loader = new PromptLoader({
  promptsDirectory: './prompts',
  enableHotReload: true,  // Always reload from disk
  logger: new ConsoleLogger(),
});
```

### Production Mode

```typescript
const loader = new PromptLoader({
  promptsDirectory: './prompts',
  enableHotReload: false,  // Cache after first load
  logger: new ProductionLogger(),
});

// Preload all prompts at startup for fail-fast validation
loader.preloadAll();
```

## File Structure

```
prompts/
├── butler.system.md      # Butler persona system prompt
├── supervisor.system.md  # Supervisor persona system prompt
└── developer.md          # Developer context prompt
```

## Validation Rules

Prompts must:
1. Be valid strings
2. Not be empty or whitespace-only
3. Not contain template placeholders (`${}`, `{{}}`)
4. Be at least 10 characters
5. Be no more than 10,000 characters

## Testing

```typescript
describe('PromptLoader', () => {
  it('should load butler prompt', () => {
    const prompt = loader.load(PromptType.BUTLER_SYSTEM);
    expect(prompt).toContain('ACE Prime');
    expect(prompt).toContain('butler');
  });

  it('should cache prompts', () => {
    loader.load(PromptType.BUTLER_SYSTEM);
    expect(loader.isCached(PromptType.BUTLER_SYSTEM)).toBe(true);
  });

  it('should throw on missing file', () => {
    // Remove file or use wrong directory
    expect(() => loader.load(PromptType.BUTLER_SYSTEM))
      .toThrow('Prompt file not found');
  });
});
```

## Performance Considerations

- **First load**: ~1-5ms (disk I/O)
- **Cached load**: <1ms (memory access)
- **Memory usage**: ~1KB per prompt (negligible)

**Recommendation**: Use `preloadAll()` at startup to:
1. Validate all prompts exist and are valid
2. Warm up cache for production performance
3. Fail fast if any prompts are missing

---

**PromptLoader is a pure I/O layer. All prompt composition logic belongs in PromptBuilder (next implementation step).**
