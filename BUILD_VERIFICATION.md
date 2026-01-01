# Build and Runtime Verification

## ✅ Build-Time Safety

The project is configured to build successfully **without any environment variables**.

### Verification

```bash
# This should succeed with zero environment variables
npm run build
```

**Result:** ✅ Build succeeds - no environment variables required at build time.

## ✅ Runtime Guards

### DISCORD_TOKEN Guard

Located in `src/index.ts` within the `main()` function (runtime only, not build time):

```typescript
const discordToken = process.env['DISCORD_TOKEN'];
if (!discordToken || discordToken.trim().length === 0) {
  console.error('DISCORD_TOKEN is not set. Bot cannot start.');
  process.exit(1);
}
```

**Behavior:**
- ✅ Checks token at runtime only (when `main()` executes)
- ✅ Uses bracket notation: `process.env['DISCORD_TOKEN']`
- ✅ Logs exact error: "DISCORD_TOKEN is not set. Bot cannot start."
- ✅ Exits with non-zero code: `process.exit(1)`

## ✅ Environment Variable Access

All environment variables are accessed using bracket notation:

- `process.env['DISCORD_TOKEN']` - Required, checked at runtime
- `process.env['OPENAI_API_KEY']` - Optional, checked at runtime
- `process.env['OPENAI_MODEL']` - Optional, defaults to 'gpt-4'
- `process.env['NODE_ENV']` - Optional, used for development mode

**No dot notation used anywhere** (`process.env.VAR_NAME` is not used).

## ✅ Safe dotenv Configuration

```typescript
dotenv.config();
```

- ✅ Does not throw if `.env` file is missing
- ✅ Works locally (loads from `.env` if present)
- ✅ Works on Railway (environment variables injected automatically)
- ✅ Called at module level (safe, doesn't require env vars)

## ✅ Runtime-Only Checks

All environment variable checks happen at runtime:

1. **DISCORD_TOKEN** - Checked in `main()` function (runtime)
2. **OPENAI_API_KEY** - Checked in `OpenAIWrapper` constructor (runtime, when instantiated)
3. **NODE_ENV** - Checked in methods/constructors (runtime)

**No environment variables are accessed at:**
- ❌ Module top-level (except safe `dotenv.config()`)
- ❌ Config files evaluated during build
- ❌ Type definitions or type-only code

## ✅ Local Development

1. User creates `.env` file manually:
   ```env
   DISCORD_TOKEN=your_token_here
   ```

2. Run the bot:
   ```bash
   npm run dev
   ```

3. If `DISCORD_TOKEN` is missing:
   - ✅ Logs: "DISCORD_TOKEN is not set. Bot cannot start."
   - ✅ Exits cleanly with error code 1

## ✅ Railway Deployment

1. Railway injects environment variables automatically
2. No `.env` file required
3. Build succeeds: `npm run build` (no env vars needed)
4. Runtime check: If `DISCORD_TOKEN` missing, logs error and exits

## ✅ Security

- ✅ No secrets hardcoded
- ✅ `.env` file is gitignored
- ✅ `.env.example` contains only placeholders
- ✅ All env access uses safe bracket notation
- ✅ No auto-generation of `.env` files

## Test Commands

```bash
# Test build without env vars
npm run build
# Expected: ✅ Success

# Test runtime without DISCORD_TOKEN
npm start
# Expected: ❌ Error: "DISCORD_TOKEN is not set. Bot cannot start."

# Test runtime with DISCORD_TOKEN
DISCORD_TOKEN=test npm start
# Expected: ✅ Starts (will fail at Discord login, but guard passes)
```

