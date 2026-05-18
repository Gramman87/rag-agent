export interface Document {
  id: string;
  title: string;
  content: string;
  source: string;
}

export const DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    title: "Product Onboarding Guide",
    source: "Internal Wiki",
    content: `Welcome to Acme Platform. This guide covers the initial setup and onboarding process for new enterprise customers.

Getting Started: After signing your contract, your Customer Success Manager will schedule a kickoff call within 48 hours. During this call you will receive your admin credentials, SSO configuration details, and a tailored onboarding checklist.

User Provisioning: Admins can provision users via the Settings > Team Members panel or via SCIM provisioning through your identity provider (Okta, Azure AD, or Google Workspace are supported). Bulk imports are available via CSV upload.

Data Migration: Acme supports data migration from Salesforce, HubSpot, and CSV exports. Our migration tool is available under Settings > Data Import. Typical migration for under 100k records completes in under 2 hours.

Integrations: Native integrations are available for Slack, Jira, GitHub, and Zendesk. API access requires an Enterprise plan. API keys are generated under Settings > API.

Training: Live training sessions are available Tuesdays and Thursdays at 10am PT. Recorded sessions are available in the Help Center under Learning Paths.`,
  },
  {
    id: "doc-2",
    title: "API Reference",
    source: "Developer Docs",
    content: `Acme Platform REST API v2 Reference.

Authentication: All API requests require a Bearer token passed in the Authorization header. Tokens are generated in Settings > API > Generate Key. Tokens do not expire but can be revoked at any time.

Rate Limits: The default rate limit is 1,000 requests per minute. Enterprise plans can request increased limits through their account manager. Rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset) are included in all responses.

Endpoints:
GET /api/v2/users — Returns paginated list of users. Supports filtering by role, status, and team.
POST /api/v2/users — Creates a new user. Required fields: email, role. Optional: name, team_id.
GET /api/v2/metrics — Returns usage metrics for the authenticated account. Supports date range filtering via ?start= and ?end= query params.
POST /api/v2/webhooks — Registers a new webhook endpoint. Supported events: user.created, user.deactivated, record.updated.

Error Codes: 401 Unauthorized — invalid or missing token. 429 Too Many Requests — rate limit exceeded. 422 Unprocessable Entity — validation error, check the errors field in the response body.`,
  },
  {
    id: "doc-3",
    title: "Security & Compliance",
    source: "Trust Center",
    content: `Acme Platform Security Overview.

Data Encryption: All data is encrypted at rest using AES-256 and in transit using TLS 1.2 or higher. Encryption keys are managed through AWS KMS with automatic annual rotation.

Access Controls: Role-based access control (RBAC) is enforced at the API and application layer. Supported roles: Owner, Admin, Member, Viewer. Custom roles are available on Enterprise plans.

Compliance Certifications: Acme is SOC 2 Type II certified (renewed annually), GDPR compliant, and HIPAA eligible on Enterprise plans. Our most recent audit report is available under NDA upon request.

Data Residency: Customer data is stored in US-East by default. EU data residency is available on Enterprise plans, storing all data within AWS eu-west-1.

Incident Response: Our SLA guarantees notification within 72 hours of a confirmed breach affecting customer data. Customers receive a detailed post-incident report within 30 days.

Penetration Testing: Acme conducts annual third-party penetration tests. Customers on Enterprise plans may request the most recent report summary under NDA.`,
  },
  {
    id: "doc-4",
    title: "Pricing & Plans",
    source: "Sales Docs",
    content: `Acme Platform Pricing Overview.

Starter Plan — $49/month: Up to 5 users, 10k records, email support, core integrations (Slack, Jira). No API access. Billed monthly or annually (20% discount).

Growth Plan — $199/month: Up to 25 users, 100k records, priority support, all integrations, API access (1k req/min). SSO via Google/GitHub. Billed monthly or annually.

Enterprise Plan — Custom pricing: Unlimited users, unlimited records, dedicated Customer Success Manager, 24/7 phone support, SCIM provisioning, custom roles, HIPAA eligibility, EU data residency, SLA guarantees, custom rate limits. Typically starts at $2,000/month for mid-market.

Add-ons: Additional API capacity ($50/month per 1k req/min), advanced analytics module ($99/month), white-label option (Enterprise only, custom pricing).

Discounts: Annual billing saves 20%. Nonprofit organizations qualify for a 30% discount. Startups with under $1M ARR qualify for the Startup Program at 50% off Growth for 12 months.`,
  },
  {
    id: "doc-5",
    title: "Troubleshooting Guide",
    source: "Support Docs",
    content: `Common issues and resolutions for Acme Platform.

Login Issues: If users cannot log in, first verify their account status under Settings > Team Members. Ensure SSO is correctly configured if using an identity provider. Clear browser cache and cookies. If the issue persists, reset the user's password via the admin panel.

Slow Performance: Performance issues are usually caused by large data exports or heavy API usage. Check the Metrics dashboard for unusual activity. If running bulk exports, schedule them during off-peak hours (2am–6am PT). Contact support if latency exceeds 2 seconds consistently.

Webhook Failures: Webhooks that fail 5 consecutive times are automatically disabled. Re-enable them under Settings > Webhooks and check that your endpoint returns a 200 response within 5 seconds. Webhook payloads are signed using HMAC-SHA256 — verify signatures to prevent replay attacks.

Data Sync Delays: Real-time sync typically completes within 30 seconds. If data is not syncing after 5 minutes, check the Sync Status page. Common causes: API token revoked, network firewall blocking outbound webhooks, or a downstream service outage.

API Errors: For 429 errors, implement exponential backoff. For 422 errors, check the errors array in the response body for field-level validation messages. For persistent 500 errors, check the Acme Status Page at status.acme.io.`,
  },
];
