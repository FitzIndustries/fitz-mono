# Repository agent skills

These skills are available to coding agents working in this repository.

## Vendored upstream skills

| Local skill | Upstream source | Pinned commit |
|---|---|---|
| `react-start`, `start-core` and nested skills | `TanStack/router` | `da2adec76dbe6c0da6d6a0d5640f7b9388217f45` |
| `hono` | `honojs/skills` | `e54ce51f6effaeb574ebd2629e89e086e14a2db3` |
| `better-auth-best-practices`, `better-auth-security-best-practices` | `better-auth/skills` | `20c9e88a5c007461a703f1c213572b073196113e` |

Review upstream changes before updating vendored skills. Do not replace a pinned skill blindly because framework APIs may be newer than the versions installed in this repository.

## Project skill

`fitz-zero-sync` documents this repository's Zero architecture, tenancy context, schema workflow, local ports, and upgrade guardrails.
