import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireOrgId } from './lib/auth'
import { api } from './_generated/api'

// Realistic demo issues for a payment processing system
const DEMO_ISSUES = [
  // DEV Environment
  {
    env: 'DEV',
    issues: [
      {
        title: 'Payment timeout after 30 seconds on high-load scenarios',
        description: `## Issue Summary
During load testing, we observed that payment requests timeout after exactly 30 seconds when the system is under heavy load (>500 concurrent transactions).

## Steps to Reproduce
1. Start load test with 500+ concurrent users
2. Each user initiates a payment transaction
3. Observe timeout errors in logs after 30 seconds

## Expected Behavior
Transactions should complete within 5 seconds or gracefully queue.

## Actual Behavior
HTTP 504 Gateway Timeout after 30 seconds.

## Logs
\`\`\`
2024-01-15 14:32:45 ERROR PaymentGateway - Transaction timeout: txn_abc123
2024-01-15 14:32:45 ERROR PaymentGateway - Connection pool exhausted
\`\`\`

## Environment
- Payment Gateway v3.2.1
- Database: PostgreSQL 14
- Load Balancer: nginx 1.24`,
        status: 'open' as const,
        priority: 'high' as const,
      },
      {
        title: 'Card tokenization failing for Amex cards',
        description: `## Issue Summary
American Express card tokenization fails with "Invalid card format" error, while Visa and Mastercard work correctly.

## Steps to Reproduce
1. Navigate to payment form
2. Enter valid Amex card: 3782 8224 6310 005
3. Submit for tokenization
4. Error: "Invalid card format"

## Root Cause Analysis
Suspect the regex validation pattern doesn't account for 15-digit Amex format.

## Code Reference
\`\`\`javascript
// Current regex (incorrect)
const cardPattern = /^[0-9]{16}$/;

// Should be
const cardPattern = /^[0-9]{15,16}$/;
\`\`\``,
        status: 'in_progress' as const,
        priority: 'medium' as const,
      },
      {
        title: 'Duplicate webhook notifications sent to merchants',
        description: `## Issue Summary
Merchants report receiving duplicate webhook notifications for the same transaction event. This causes issues with their reconciliation systems.

## Impact
- 15% of webhooks are duplicated
- Merchants' systems process same transaction twice
- Potential double-booking issues

## Technical Details
- Webhook retry logic not checking for idempotency
- Missing deduplication in message queue
- No unique constraint on notification_id`,
        status: 'open' as const,
        priority: 'critical' as const,
      },
    ],
  },
  // SIT Environment
  {
    env: 'SIT',
    issues: [
      {
        title: 'Integration test failures with Bank ABC API',
        description: `## Issue Summary
SIT integration tests for Bank ABC payment processing are failing intermittently with connection reset errors.

## Test Results
- 23/30 tests passing
- 7 tests failing with ECONNRESET
- Failures occur randomly, not consistently

## Investigation
1. Checked network connectivity - OK
2. Verified SSL certificates - Valid
3. Reviewed firewall rules - No blocks
4. Bank ABC confirmed no issues on their end

## Hypothesis
Possible connection pool exhaustion or SSL handshake timing issue.`,
        status: 'open' as const,
        priority: 'high' as const,
      },
      {
        title: 'Currency conversion rounding errors',
        description: `## Issue Summary
Currency conversion calculations have rounding errors when converting between EUR and GBP, causing 0.01 cent discrepancies.

## Example
- Original: €100.00
- Expected GBP: £86.45
- Actual GBP: £86.44 (or sometimes £86.46)

## Impact
- Reconciliation mismatches
- Audit compliance concerns
- Customer complaints about statement accuracy

## Recommended Fix
Use BigDecimal with HALF_EVEN rounding mode instead of floating point.`,
        status: 'resolved' as const,
        priority: 'medium' as const,
      },
    ],
  },
  // UAT Environment
  {
    env: 'UAT',
    issues: [
      {
        title: 'Refund processing stuck in pending state',
        description: `## Issue Summary
Multiple refund requests are stuck in "PENDING" state and not progressing to "COMPLETED" or "FAILED".

## Affected Transactions
- REF-001234 - Stuck for 48 hours
- REF-001235 - Stuck for 36 hours
- REF-001236 - Stuck for 24 hours

## Investigation Findings
1. Refund worker service logs show no errors
2. Database shows status = "PENDING"
3. No messages in dead letter queue
4. Scheduler appears to be running

## Suspect
Background job scheduler might have stopped picking up refund jobs.`,
        status: 'in_progress' as const,
        priority: 'critical' as const,
      },
      {
        title: 'User session expires during 3DS verification',
        description: `## Issue Summary
When users are redirected to 3D Secure verification and take more than 5 minutes, their session expires and payment fails.

## User Journey
1. User enters card details
2. Redirected to bank's 3DS page
3. User takes >5 minutes (reading instructions, finding password)
4. Returns to merchant site
5. Error: "Session expired, please try again"

## Impact
- 8% of 3DS transactions fail due to session timeout
- Negative user experience
- Lost revenue

## Proposed Solution
Extend session timeout during 3DS flow to 15 minutes.`,
        status: 'open' as const,
        priority: 'high' as const,
      },
    ],
  },
  // PRE-SIT Environment
  {
    env: 'PRE-SIT',
    issues: [
      {
        title: 'Database migration script fails on large tables',
        description: `## Issue Summary
The v3.5.0 migration script times out when migrating the transactions table (50M+ rows).

## Error
\`\`\`
ERROR: Lock wait timeout exceeded; try restarting transaction
Migration failed at step 15: ALTER TABLE transactions ADD COLUMN metadata JSON
\`\`\`

## Table Statistics
- transactions: 52,341,892 rows
- Table size: 128 GB
- Indexes: 8

## Attempted Solutions
1. Increased lock_wait_timeout - Still fails
2. Tried during off-peak hours - Same issue
3. Batch migration approach needed`,
        status: 'open' as const,
        priority: 'high' as const,
      },
    ],
  },
  // PROD Environment
  {
    env: 'PROD',
    issues: [
      {
        title: '[P1] Payment gateway returning 503 errors',
        description: `## INCIDENT REPORT

### Severity: P1 - Critical Production Issue

### Timeline
- 14:32 UTC - First 503 errors detected
- 14:35 UTC - Alert triggered, on-call engaged
- 14:40 UTC - Traffic shifted to backup gateway
- 14:55 UTC - Root cause identified
- 15:10 UTC - Primary gateway restored

### Impact
- Duration: 38 minutes
- Failed transactions: 1,247
- Estimated revenue impact: $89,400
- Customers affected: ~800

### Root Cause
Primary payment gateway's SSL certificate expired. Auto-renewal failed due to DNS propagation delay.

### Action Items
1. [DONE] Renewed SSL certificate manually
2. [TODO] Implement certificate expiry monitoring
3. [TODO] Add 30-day advance alerting
4. [TODO] Document runbook for certificate issues`,
        status: 'resolved' as const,
        priority: 'critical' as const,
      },
      {
        title: 'Suspicious transaction pattern detected - possible fraud',
        description: `## Alert: Potential Fraud Pattern Detected

### Pattern Description
Multiple rapid transactions from same IP address targeting different merchant accounts.

### Details
- IP Address: 185.xxx.xxx.xxx (Eastern Europe)
- Time window: 2 minutes
- Transaction count: 47
- Average amount: $2.99
- All transactions: Card testing pattern (ascending amounts)

### Actions Taken
1. IP blocked at WAF level
2. Affected cards flagged for review
3. Merchants notified
4. Enhanced monitoring enabled

### Recommendations
- Review velocity rules
- Consider implementing device fingerprinting
- Add captcha for rapid sequential transactions`,
        status: 'in_progress' as const,
        priority: 'critical' as const,
      },
    ],
  },
];

export const run = mutation({
  args: {
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });
    
    // Idempotent: reuse if already present by name
    const clientName = 'Demo Bank Corp'
    const projectName = 'Payment Gateway'

    let client = await ctx.db
      .query('clients')
      .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId))
      .filter((q) => q.eq(q.field('name'), clientName))
      .first()

    if (!client) {
      const clientId = await ctx.db.insert('clients', { 
        tenantId,
        name: clientName,
      })
      client = (await ctx.db.get(clientId))!
    }

    let project = await ctx.db
      .query('projects')
      .withIndex('by_client', (q) => q.eq('client_id', client._id))
      .filter((q) => q.eq(q.field('name'), projectName))
      .first()

    if (!project) {
      const projectId = await ctx.db.insert('projects', {
        tenantId,
        client_id: client._id,
        name: projectName,
      })
      project = (await ctx.db.get(projectId))!
    }

    const envNames = ['DEV', 'SIT', 'UAT', 'PRE-SIT', 'PROD'] as const
    const envMap = new Map<string, import('./_generated/dataModel').Id<'environments'>>()

    for (const name of envNames) {
      let env = await ctx.db
        .query('environments')
        .withIndex('by_project', (q) => q.eq('project_id', project._id))
        .filter((q) => q.eq(q.field('name'), name))
        .first()
      if (!env) {
        const envId = await ctx.db.insert('environments', {
          tenantId,
          project_id: project._id,
          name,
        })
        env = (await ctx.db.get(envId))!
      }
      envMap.set(name, env._id)
    }

    const now = Date.now()
    const createdIssueIds: string[] = []

    for (const envData of DEMO_ISSUES) {
      const envId = envMap.get(envData.env)
      if (!envId) continue

      // Check if issues already exist for this environment
      const existing = await ctx.db
        .query('issues')
        .withIndex('by_env', (q) => q.eq('environment_id', envId))
        .first()
      if (existing) continue

      for (const [idx, issue] of envData.issues.entries()) {
        const issueId = await ctx.db.insert('issues', {
          tenantId,
          environment_id: envId,
          title: issue.title,
          description: issue.description,
          descriptionHtml: `<div class="prose">${issue.description.replace(/\n/g, '<br>')}</div>`,
          status: issue.status,
          priority: issue.priority,
          created_at: now - idx * 3600_000, // Stagger creation times
        })
        createdIssueIds.push(issueId)
        
        // Create thread for each issue
        await ctx.db.insert('threads', {
          tenantId,
          issue_id: issueId,
        })
      }
    }

    return {
      client: client._id,
      project: project._id,
      seededIssues: createdIssueIds.length,
    }
  },
})
