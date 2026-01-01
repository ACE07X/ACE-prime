# Railway Root Directory Configuration

## ⚠️ CRITICAL: Configure Railway Root Directory

Railway is currently looking for `railway.json` but can't find it because the service needs to be configured with the correct **Root Directory**.

## Solution: Set Root Directory in Railway

### Step 1: Go to Railway Settings
1. Open your Railway dashboard
2. Select the **ACE-prime** service
3. Click on the **Settings** tab

### Step 2: Set Root Directory
1. Look for the **"Root Directory"** field (usually near the top of Settings)
2. Set it to: `ace-prime`
3. Click **Save** or **Update**

### Step 3: Verify Config File
- Railway will now look for `railway.json` in the `ace-prime` directory
- The file `ace-prime/railway.json` already exists with the correct configuration

## Why This Is Needed

Your repository structure is:
```
ace-prime-complete-spine/
├── railway.json (backup, for repo root)
└── ace-prime/
    ├── railway.json ✅ (This is the one Railway should use)
    ├── package.json
    └── src/
```

Railway needs to know to use `ace-prime` as the working directory, so it:
- Finds `ace-prime/railway.json`
- Runs commands from `ace-prime/` directory
- Uses `ace-prime/package.json`

## After Setting Root Directory

Once you set the Root Directory to `ace-prime`:
1. Railway will find `ace-prime/railway.json`
2. It will run `npm install` (no build step)
3. It will start with `npm start` → `tsx src/index.ts`
4. Deployment should succeed! ✅

## Alternative: If Root Directory Setting Doesn't Exist

If Railway doesn't have a Root Directory setting, you can:
1. Use the root `railway.json` (already committed)
2. It has commands: `cd ace-prime && npm install` and `cd ace-prime && npm start`
3. This will work from the repository root

## Current Configuration Files

### `ace-prime/railway.json` (Primary - Use this with Root Directory = ace-prime)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### `railway.json` (Root - Backup, works from repo root)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ace-prime && npm install"
  },
  "deploy": {
    "startCommand": "cd ace-prime && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

## Next Steps

1. ✅ Set Root Directory to `ace-prime` in Railway Settings
2. ✅ Railway will automatically detect the change
3. ✅ New deployment will use `ace-prime/railway.json`
4. ✅ Deployment should succeed!

