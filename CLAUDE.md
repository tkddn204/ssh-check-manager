# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SSH Check Manager is a Next.js 14 application for managing SSH server health checks and tunneling. It uses:
- **Frontend**: React 18 + TailwindCSS with Next.js App Router
- **Backend**: Next.js API Routes
- **Database**: MariaDB via Prisma ORM
- **SSH**: ssh2 library for client-side SSH connections and tunneling

All SSH connections are **client-side** - the Next.js server acts as an SSH client connecting to remote servers. There is no server-side agent implementation.

Ref. Developers prefer Korean.

## Development Commands

### Database Operations
```bash
# Generate Prisma Client (run after schema changes)
pnpm run prisma:generate

# Push schema to database (development)
pnpm run prisma:push

# Create migration (production)
pnpm run prisma:migrate

# Open Prisma Studio (database GUI)
pnpm run prisma:studio
```

### Development Server
```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start
```

### Docker (Optional)
```bash
# Start MariaDB and Adminer
docker-compose up -d

# Access Adminer at http://localhost:8080
```

## Architecture & Key Patterns

### SSH Execution Flow

**Standard Execution** (`lib/ssh.ts:executeSSHCommand`):
- Synchronous: waits for command completion
- Used by `/api/checks/batch` endpoint
- Returns complete result after execution

**Streaming Execution** (`lib/ssh.ts:executeSSHCommandStreaming`):
- Real-time output via callbacks: `onOutput(chunk)` and `onError(chunk)`
- Used by `/api/checks/batch-stream` endpoint with Server-Sent Events (SSE)
- Streams stdout/stderr chunks as they arrive
- Frontend receives events: `start`, `server_start`, `command_start`, `output`, `command_complete`, `server_complete`, `complete`, `error`

### Webpack Configuration

The `next.config.js` externalizes ssh2 native modules to prevent bundling errors:
```javascript
config.externals.push({
  'cpu-features': 'commonjs cpu-features',
  './crypto/build/Release/sshcrypto.node': 'commonjs ./crypto/build/Release/sshcrypto.node',
});
```

**Critical**: Do not remove these externals or the ssh2 module will fail.

### Database Schema Conventions

Prisma uses **camelCase** in TypeScript but maps to **snake_case** in MariaDB:
```prisma
model Server {
  executionLocation ExecutionLocation @map("execution_location")
  createdAt DateTime @map("created_at")
}
```

Frontend APIs expect **snake_case** field names. When returning Prisma results, map nested fields:
```typescript
// ❌ Wrong - returns camelCase
return { serverId: result.serverId }

// ✅ Correct - map to snake_case
return { server_id: result.serverId }
```

### SSH Command Error Detection

The system detects command failures beyond exit codes (`lib/ssh.ts`):
1. Non-zero exit code
2. stderr output exists
3. Error patterns in stdout/stderr: `not available`, `command not found`, `not installed`, `no such`, `error`, `failed`, `cannot`, `permission denied`

When adding new check commands, be aware that stderr output or these patterns will mark results as failed.

### Client Requirements System

Servers can specify prerequisites for SSH access via `clientType` and `clientConfig`:
- **VPN**: VPN executable path and config
- **Web Portal**: Portal URL and instructions
- **Custom App**: Application path and arguments
- **Bastion Host**: Jump host configuration with separate auth

The `clientConfig` field stores JSON. Parse it according to `ClientConfig` interface in `lib/types.ts`.

### API Response Patterns

**BigInt Serialization**: MariaDB aggregate functions (COUNT, SUM) return BigInt. Convert to Number before JSON serialization:
```typescript
// In /api/reports/daily and /api/reports/monthly
total_checks: Number(report.total_checks)
```

**Nested Relations**: When querying with Prisma `include`, flatten for frontend:
```typescript
const results = await prisma.checkResult.findMany({
  include: { server: true, command: true }
});

// Map to flat structure
return results.map(r => ({
  server_name: r.server.name,
  command_name: r.command.name,
  // ...other fields
}));
```

### SSH Tunneling

Three tunnel types implemented in `lib/ssh.ts:SSHTunnelManager`:
1. **Local (-L)**: Forward local port to remote destination
2. **Remote (-R)**: Forward remote port to local destination
3. **Dynamic (-D)**: SOCKS5 proxy on local port

Tunnels maintain persistent connections via the `activeTunnels` Map. The manager is a singleton (`tunnelManager`).

## Important Implementation Details

### Real-time Console Output

The checks page (`app/checks/page.tsx`) displays real-time SSH output:
- Opens automatically when execution starts
- Auto-scrolls to bottom using `consoleEndRef`
- Shows progress bar, current server/command, and terminal-style output
- SSE event stream from `/api/checks/batch-stream`

When modifying check execution, ensure both batch endpoints are updated:
- `/api/checks/batch` - standard synchronous execution
- `/api/checks/batch-stream` - SSE streaming for console output

### Execution Location Field

The `executionLocation` field exists in the database schema but is **always set to 'client'**:
```typescript
// In app/api/servers/route.ts
executionLocation: 'client', // All servers use client-side SSH connections
```

The UI does not expose this field. The enum exists for potential future server-side agent support, but currently only client-side SSH is implemented.

### Text Wrapping in Results

Long command output (e.g., process lists) uses CSS classes to prevent table overflow:
```tsx
<pre className="whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
```

Apply these classes when displaying SSH output to maintain formatting while preventing horizontal scroll.

### Dashboard Monthly Calendar

The dashboard (`app/page.tsx`) shows per-server monthly connection status:
- Fetches data from `/api/dashboard/monthly-status`
- Displays calendar grid with color-coded days (green=success, red=failed, gray=no checks)
- Uses date-fns for date manipulation
- Query uses DATE() function for day grouping

## File Naming Conventions

- API routes: `app/api/[resource]/route.ts` or `app/api/[resource]/[id]/route.ts`
- Pages: `app/[page]/page.tsx`
- Types: Centralized in `lib/types.ts` (re-exports Prisma types)
- Utilities: `lib/` directory (db.ts, ssh.ts, types.ts)

## Environment Variables

Required in `.env`:
```
DATABASE_URL="mysql://user:password@host:port/ssh_check_manager"
```

The application will not start without a valid database connection.
