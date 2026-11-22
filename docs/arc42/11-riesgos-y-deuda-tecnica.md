# Risks and Technical Debts {#section-technical-risks}

**Review: 2026-11-22.** Historical instructor observations retain their original wording; the status column distinguishes subsequent changes. The deployment already exists at [tiendautb.iscoutb.dev](https://tiendautb.iscoutb.dev/), as confirmed by the team. Current execution evidence is tracked in the [closure report](../cierre-proyecto.md).

Section 11 of arc42 for the Tienda Virtual UTB. It collects the known risks and
technical debts, what the peer review pointed out and what the instructor's
follow-up flagged, each with its status: **fixed**, **assumed** or **pending**.
Distinguishing what is known and assumed from what is unknown is part of what
this section is for, so items are listed even when the team does not plan to
fix them.

## 11.1 Risks and technical debts

| Risk or debt | Impact | Current mitigation |
| --- | --- | --- |
| Module boundaries are a convention, not enforced by the network | Unwanted coupling between modules | ADR rules plus an AST import test; mapped-column ownership is tested separately because static imports cannot prove data ownership |
| `create_all` instead of migrations | Schema changes over populated databases will be manual | **Resolved:** Alembic migrations (ADR 0013), verified in CI |
| Deployment target not chosen | Cannot be demonstrated outside a local machine | **Resolved:** Dokploy consumes `deploy/compose.lab.yaml`; see ADR 0007 |
| Mocked data only | Behavior is not validated against real cafeteria data | Explicit scope constraint; the seed data models realistic products |
| Next.js dependency vulnerabilities | Public SSR increases exposure | Keep the lockfile patched and verify `pnpm audit` during upgrades |
| Single Dokploy server hosts every runtime component | A host or disk failure affects the whole system | Named database volume implemented; external scheduled backups and a restore drill still require operational evidence |
| Public repository increases the impact of a leaked secret | A committed credential would be scraped within minutes | The Compose requires `POSTGRES_PASSWORD` from Dokploy Environment; `.env` files remain ignored |
| Failure modes have mixed implementation status | Unimplemented controls leave availability and abuse risks open | F-01 cancellation/expiry code, F-03 stock concurrency and F-04 idempotency are implemented and have tests. Verify expiry scheduling. F-02 cache/retries, F-05 messaging, F-06 rate limiting and F-07 replicas/failover remain unimplemented; see [status table](../modos-fallo-s11.md). |

## 11.2 What the peer review pointed out {#_peer_review}

The architectural peer review is an individual activity: each student reviewed
two other teams (see [revision-pares.md](../revision-pares.md)). What the other
teams said **about this project** is collected here.

| Source | Observation | Status |
| --- | --- | --- |
| Peer review by the other teams | No comments received yet | **Pending**: to be added with its status (fixed, assumed or pending) when the comments arrive |

## 11.3 What the instructor's follow-up flagged

Source: `revisiones/2026-2/AS_202620_TIENDA-VIRTUAL-UTB/feedback.md` in
`ISCOUTB/AS_202620_feedback`, follow-up of 2026-11-05. These are the instructor's
observations, not peers', and are listed here because they are open risks.

| Observation | Impact | Status |
| --- | --- | --- |
| The gaps between the privacy promises and the code (consent, deletion, rectification, retention) are not fixed in code or tests; removing the gap table from `docs/seguridad-amenazas-privacidad.md` does not close them | Personal data is processed without the rights channel working end to end | **Pending**: each correction must be proven in code and tests |
| The SonarCloud job reports success but its checkout, coverage and analysis steps were skipped on the latest run | No evidence of a new analysis or Quality Gate | **Updated 2026-11-22:** [PR #19 has a Sonar Quality Gate comment](https://github.com/ISCOUTB/AS_202620_TIENDA-VIRTUAL-UTB/pull/19#issuecomment-7040896955). Final-commit analysis and coverage still require evidence; the workflow skips analysis steps without SONAR_TOKEN |
| Dependency audit (`pip-audit`, `pnpm audit`) is documented as a local run, not as a blocking step in the pipeline | A vulnerable dependency can reach `main` unnoticed | **Pending**: reproducible, blocking audit in `.github/workflows/tests.yml` |
| README does not document an institutional domain for the frontend (external `sslip.io` URL) | The deployed system cannot be reached through the course domain | **Resolved**: `https://tiendautb.iscoutb.dev` with a Let's Encrypt certificate |
| Backup/restore and the functional order flow are not verified in the deployment | A host or disk failure may be unrecoverable; ordering may not work end to end | **Pending**: restore drill and order walkthrough |

## 11.4 Limits of the scenario 4 measurement (team's own assessment)

The measurement in [medicion-escenario-4.md](../medicion-escenario-4.md) meets
the threshold, but the team recognises what it does not prove. These are the
team's own findings, not a peer review.

| Limit | Impact | Status |
| --- | --- | --- |
| Client and server ran on the same machine over loopback, with a single Uvicorn process and an ephemeral database container | The ≈ 42 ms worst case is an optimistic floor, not what a user of the Dokploy deployment would see | **Assumed**: the report states the limit; repeat against the deployed URL |
| The threshold fixes 5 users but no latency bound; one load level cannot reveal a bottleneck | A pass at 5 users says nothing about the margin before failure | **Pending**: ramp 5 → 20 → 50 users (`--users` already allows it) and add a latency limit to the scenario |
| The measurer prints `servidor_sigue_saludable: true` as a constant, checks `/health` once after the load and compares ID sets, not quantities | A failure during the load or a wrong quantity would go unnoticed | **Pending**: make the field reflect the real health response and poll during the load |
| The scenario is titled availability but measures concurrency tolerance; one PostgreSQL instance on one Dokploy host remains, and scenario 3 (stock visible in under 2 s) has no measurement | A database or host failure is not covered by any measured scenario | **Pending**: add a fault case and measure scenario 3 |
