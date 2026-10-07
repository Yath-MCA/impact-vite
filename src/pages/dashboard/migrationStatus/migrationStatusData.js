// Hand-maintained snapshot of the IMPACT Session Service migration.
// Source of truth: .claude/PRPs/plans/session-service-master-plan.md (phase list)
// and .claude/PRPs/reports/session-service-master-plan-report.md (actual status).
// Update this file when a phase's real-world status changes — it is not fed by a live API.

export const MIGRATION_STATUS_UPDATED_AT = '2026-09-05';

export const STATUS = {
  NOT_STARTED: 'not_started',
  DRAFTED: 'drafted',
  BLOCKED: 'blocked',
  PARTIAL: 'partial',
  AUTHORITATIVE: 'authoritative'
};

export const STATUS_LABEL = {
  [STATUS.NOT_STARTED]: 'Not started',
  [STATUS.DRAFTED]: 'Drafted (unverified)',
  [STATUS.BLOCKED]: 'Blocked',
  [STATUS.PARTIAL]: 'Partial',
  [STATUS.AUTHORITATIVE]: 'Authoritative'
};

export const migrationPhases = [
  { phase: 1, name: 'Project Bootstrap', newServiceStatus: STATUS.DRAFTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'Spring Boot scaffold written; not compiled (no JDK/Maven in build sandbox).' },
  { phase: 2, name: 'MySQL Community Edition', newServiceStatus: STATUS.DRAFTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'Config written for MySQL; no live DB instance verified against yet.' },
  { phase: 3, name: 'Database Schema', newServiceStatus: STATUS.DRAFTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'DDL written (generated-column unique indexes); not run against a live DB.' },
  { phase: 4, name: 'Spring JDBC Foundation', newServiceStatus: STATUS.DRAFTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'Repository layer written, combined into one file for scaffold size.' },
  { phase: 5, name: 'Application Configuration', newServiceStatus: STATUS.DRAFTED, legacyStatus: STATUS.AUTHORITATIVE, note: '' },
  { phase: 6, name: 'REST Endpoints', newServiceStatus: STATUS.DRAFTED, legacyStatus: STATUS.AUTHORITATIVE, note: "/respond holder-identity resolution left as a TODO." },
  { phase: 7, name: 'IMPACT UI Integration', newServiceStatus: STATUS.DRAFTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'sessionServiceClient.js / sessionSocketClient.js added, additive to sessionGateway.js.' },
  { phase: 8, name: 'IMPACT Context', newServiceStatus: STATUS.NOT_STARTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'No caller wired yet — nothing consumes sessionServiceClient.js in the UI.' },
  { phase: 9, name: 'Session History Dashboard', newServiceStatus: STATUS.BLOCKED, legacyStatus: STATUS.AUTHORITATIVE, note: 'DocumentHistory.jsx is cross-document; new backend only serves per-document history. Needs a scope decision.' },
  { phase: 10, name: 'WebSocket', newServiceStatus: STATUS.DRAFTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'Raw TextWebSocketHandler written; commit-then-publish ordering noted as not yet strictly guaranteed.' },
  { phase: 11, name: 'WebSocket Routing', newServiceStatus: STATUS.DRAFTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'Path-based per-document channel grouping written.' },
  { phase: 12, name: 'Authentication', newServiceStatus: STATUS.PARTIAL, legacyStatus: STATUS.AUTHORITATIVE, note: 'Structural placeholder only — trusts client-supplied userId, not production-safe.' },
  { phase: 13, name: 'Build & Deployment', newServiceStatus: STATUS.NOT_STARTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'Written up as a manual runbook (RUNBOOK_PHASES_13-20.md), not executed.' },
  { phase: 14, name: 'Windows Service', newServiceStatus: STATUS.NOT_STARTED, legacyStatus: STATUS.AUTHORITATIVE, note: '' },
  { phase: 15, name: 'IIS Reverse Proxy', newServiceStatus: STATUS.NOT_STARTED, legacyStatus: STATUS.AUTHORITATIVE, note: '' },
  { phase: 16, name: 'SQL Backup', newServiceStatus: STATUS.NOT_STARTED, legacyStatus: STATUS.AUTHORITATIVE, note: '' },
  { phase: 17, name: 'Concurrency & Heartbeat Rules', newServiceStatus: STATUS.NOT_STARTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'Highest-value gap in the plan; not yet live anywhere.' },
  { phase: 18, name: 'Health Monitoring', newServiceStatus: STATUS.NOT_STARTED, legacyStatus: STATUS.AUTHORITATIVE, note: '' },
  { phase: 19, name: 'Logging', newServiceStatus: STATUS.NOT_STARTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'Remark-logging retention policy still an open question.' },
  { phase: 20, name: 'Migration & Cutover Strategy', newServiceStatus: STATUS.NOT_STARTED, legacyStatus: STATUS.AUTHORITATIVE, note: 'Additive rollout decided — sessionGateway.js remains authoritative for grant/deny.' }
];
