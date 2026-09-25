> Historical pre-refactor audit. The Prisma multi-tenant refactor supersedes the fixed-owner findings below. Current interfaces and limitations are in [server-contract.md](server-contract.md). The Supabase/editor alternative is preserved on the app repository's `codex/archive-supabase-editor-20260925` branch; Prisma/NextAuth is canonical.

# Architecture study: multi-user memory lanes without per-user domains

Reviewed 2026-09-25 against the local `kindhuman-main` working tree. It contains uncommitted server changes; this is a code-level study, not proof of the deployed production state. No database, DNS, hosting subscription or production app was changed by this library release.

## Recommendation

Keep the current Next.js application and PostgreSQL/Prisma foundation for the first multi-user release. Use one application domain, account-derived authorization and path-based public lanes. Move domains out of onboarding's critical path.

Proposed routes, not existing endpoints:

| Route | Responsibility |
|---|---|
| `/app` | Authenticated private home and setup |
| `/app/moments/:id` | Private Moment, authorized by session |
| `/app/snapshots/:id` | Private Snapshot |
| `/u/:handle` | Explicitly published lane only |
| `/u/:handle/moments/:id` | Published projection, never the private record |
| `/api/v1/me` | Agent's authenticated account |
| `/api/v1/moments` | Reviewed private writes and owner-scoped reads |

One account can initially be the tenant. If family/shared spaces are a near-term requirement, model Workspace + Membership before collaboration; do not add shared-owner behavior implicitly. Handles and domains locate a public lane, never grant access to private records.

## Findings in the current code

| Area | Evidence | Implication |
|---|---|---|
| General accounts | `lib/auth.ts` uses NextAuth with GitHub/Google and the Prisma adapter | Reuse the existing user identity; do not create a second unrelated agent identity store. |
| Legacy tenant sites | `prisma/schema.prisma` has User, Site and Post relations; `lib/actions.ts:createSite` writes a user's Site | Some multi-user infrastructure already exists. Creating an ordinary site does not itself purchase or register a domain. |
| Custom domains | `lib/actions.ts:updateSite` invokes `lib/domains.ts:addDomainToVercel` for custom-domain changes | Domain registration plumbing is separable from account creation and memory storage. Make it optional. |
| Memory persistence | MemoryRecord, MemoryAsset and MemoryPublication each have owner relations | Keep these relations, but test every query for tenant isolation. A column alone does not guarantee it. |
| User 0 gate | `lib/kindhuman/server.ts` exports a fixed OWNER_ID and owner() rejects other users | New users cannot use the memory API as written. Replace fixed-owner entrypoints with authenticated context. |
| Reusable services | `lib/kindhuman/service.ts` accepts owner IDs for many operations and uses revision checks | Retain the service boundary; centralize account context and audit global-ID lookups and nested references. |
| Website-only mutations | `mutation(req)` expects matching Origin; owner() expects a website session | Introduce a separate scoped agent-authenticated API. Do not remove existing CSRF protection or share browser cookies with the CLI. |
| Routing | `middleware.ts` special-cases a User 0 hostname, restricts registry access, rewrites other hosts to `[domain]` | Add explicit private and `/u/` routes before generic rewrites. Test query strings, root-host redirect behavior and preview hosts. |
| Public registry | Registry page calls a fixed-owner publicRecords(); registry layout has User 0 metadata | Resolve handle -> owner for public projections and generate tenant-specific metadata. |
| Session cookies | `lib/auth.ts` derives secure/domain cookie settings from Vercel deployment variables | A hosting move needs explicit canonical URL and HTTPS cookie configuration. Single-host private auth simplifies the boundary. |
| Media | MemoryAsset stores bytes in PostgreSQL; service has per-asset/archive limits | Keep current limits for the initial slice. For larger media, introduce owner-scoped object storage after upload review, with quotas and private delivery. |
| Storage model | Moment JSON separates original words, reflections, interpretations, connections and Snapshot versions | Preserve this distinction. Add explicit provenance, reviewed payload hash and ingestion identity rather than flattening everything into a summary. |

## Do we need to buy Vercel domains for users?

No. A tenant is an authenticated data boundary; a domain is a routing/branding choice. Paths such as `kindhuman.app/u/alex` all use the same registered domain and deployment. Users do not need to buy domains or configure DNS.

If desired later, `alex.kindhuman.app` can use a wildcard domain under the one root domain. Vercel supports wildcard configuration and currently documents nameserver or delegated certificate-validation approaches. It does not require buying an independently registered domain for every user. Hosting plan, usage and applicable limits still matter. See [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain) and [multi-tenant hosting](https://vercel.com/kb/guide/nextjs-multi-tenant-application).

Buying or renewing a root domain is separate from hosting. A domain can stay at an external registrar and point at the deployment. Domain customization should never block a user's first reviewed Moment.

## Hosting options

| Option | Benefits for this codebase | Cost/engineering implications |
|---|---|---|
| Existing Vercel app + one domain + paths | Smallest migration; retains Next.js deployment and existing integrations | Avoids per-user domain provisioning, but not hosting/database/media costs. Budget a commercial-appropriate plan; Hobby is for personal non-commercial use. |
| Existing Vercel + wildcard subdomains | Branded user URLs with one root domain and deployment | Additional DNS/certificate and routing work; keep private auth on a canonical host and treat public hosts as locators only. |
| Node/Docker hosting + managed Postgres | Preserves the native Next.js runtime; portable to a VPS or managed container host | Operator owns deployment, TLS, backups, scaling and monitoring. Existing Vercel domain API and Blob dependencies need replacement/abstraction. Not automatically cheaper after operations. |
| Cloudflare Workers + supported Next.js deployment path | Alternative hosting and object-storage ecosystem | A migration project: verify runtime, Prisma/database transport, cookies, image handling, cache and server-action compatibility. Current documentation recommends vinext and retains OpenNext for existing compatibility needs. Do not assume a drop-in move. |

Sources: [Vercel Hobby scope](https://vercel.com/docs/plans/hobby), [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/). No live account invoice or plan was inspected; this report does not assert current charges or quote a total monthly bill.

The fastest path is to remove the per-user domain requirement, retain the current host initially, and measure real usage before changing infrastructure. Source reliability and per-user upload authentication are more immediate launch dependencies than DNS.

## Refactor sequence

1. Add explicit private and public path routes while preserving existing User 0 URLs as compatible routes. Keep public projections separate from private storage.
2. Introduce an authenticated account context shared by memory, media, export, connection and Snapshot services. A missing account fails closed, never falls back to User 0.
3. Add per-device agent authorization tied to an existing account, scoped/revocable tokens and `/me` verification. Store token secrets securely and only hashes server-side where appropriate.
4. Add reviewed, idempotent ingestion with provenance and payload hash. Reject cross-owner assets, connections and Snapshot members. Read back after upload.
5. Connect the skills CLI to that supported API; bind local approval to payload version and destination account. Preserve a local queue during failures.
6. Complete first-session UI: review -> upload -> open private Moment -> verify lane. Only then optionally publish.
7. Add source-specific connector adapters and durable scheduler lifecycle integration across all three hosts. Test in the actual agent execution environment.

Acceptance must include two real test users. User A must not read, export, mutate, connect, snapshot, publish or fetch unpublished media from user B, even with a guessed valid ID. Test expired/revoked agent credentials, idempotent retries, concurrent revisions, public-cache isolation, unpublishing and account-switch review invalidation.
