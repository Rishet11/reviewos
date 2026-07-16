# ReviewOS Security Policy

Last updated: 2026-07-17

Purpose: this document describes ReviewOS's access controls, encryption practices, environment separation, and incident response process.

## 1. Access control

ReviewOS is built and operated by a single developer; there is no team with shared access. Access to every system below is limited to that one operator account per system:

- GitHub (source code)
- Render (application hosting, environment variables)
- Neon (production database)
- Shopify Partner account and app configuration
- Cloudflare (R2 media storage)
- Resend (email delivery)
- Groq (AI summary API)

Every account listed above is protected by a strong, unique password and two-factor authentication (2FA). No shared credentials are used across systems.

## 2. Encryption

- **In transit:** all traffic between shoppers, the merchant's storefront, Shopify, and the ReviewOS application, and between the ReviewOS application and its sub-processors, uses HTTPS/TLS.
- **At rest:** the production database (Neon Postgres) and review media storage (Cloudflare R2) both encrypt data at rest as part of their managed services. Application environment variables and secrets stored in Render are encrypted by Render's platform.
- **Backups:** Neon's automated database backups are encrypted, consistent with the underlying database's at-rest encryption.

## 3. Test / production separation

Development uses a separate Shopify dev app and a local SQLite database. Production runs a distinct Shopify app configuration against the Neon Postgres database. Development data, credentials, and API keys are never shared with or copied into the production environment.

## 4. Incident response

This is the operator's working process if a security incident is suspected or confirmed.

**Detection.** Incidents may surface through hosting/database provider alerts, unexpected error rates or traffic patterns, a report from a merchant or shopper, or manual review of logs.

**Triage and severity.**
- *Sev 1 (critical):* confirmed unauthorized access to personal data (customer email, customer ID, review content) or to production credentials.
- *Sev 2 (high):* suspected but unconfirmed unauthorized access, or a vulnerability that could expose personal data if exploited.
- *Sev 3 (low):* issues with no plausible path to personal data exposure (e.g., a UI bug, a non-sensitive outage).

**Containment.** For Sev 1/2: rotate affected credentials immediately (Shopify app secrets, database credentials, API keys for Render/Neon/Cloudflare/Resend/Groq as relevant), revoke any compromised sessions or tokens, and, if the vulnerability is in ReviewOS's own code, disable the affected feature or deploy a fix before restoring full service.

**Notification.** For any confirmed Sev 1 incident involving personal data: notify Shopify and affected merchants within 72 hours of confirming the breach. The notification will describe what data was affected, the likely cause, containment steps taken, and what merchants should do (e.g., inform their own customers if required). Sev 2 incidents that are later confirmed as actual breaches follow the same 72-hour notification target from the point of confirmation.

**Remediation.** Apply the underlying fix (patch, configuration change, credential rotation), verify the fix closes the gap, and confirm no residual unauthorized access remains.

**Post-incident review.** After resolution, the operator documents what happened, root cause, what was done, and what changes (code, process, or monitoring) will prevent recurrence. This record is kept for future reference and to inform the roadmap items in Section 6.

## 5. Data minimization

ReviewOS reads only the personal data fields it needs from Shopify (customer email and customer ID from order webhooks) and requests no broader Shopify Admin API access than the reviews feature requires.

## 6. Known limitations / roadmap

The following controls are not yet in place. They are not claimed anywhere in ReviewOS documentation as implemented, and are noted here for transparency:

- **Per-access PII audit logging:** there is no automated log of every individual read/write access to personal data (e.g., customer email lookups) beyond standard application and platform logs. Planned as a future improvement.
- **Formal data-loss-prevention (DLP) tooling:** beyond managed, encrypted backups from Neon, there is no dedicated DLP scanning or exfiltration-detection tooling in place. Planned as a future improvement as the app scales.
- **Third-party security certifications:** ReviewOS does not currently hold SOC 2 or any other formal third-party security certification.
