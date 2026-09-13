# FOSSFURY 26 — SFOSS Technical Quiz Platform
## SASTRA Free & Open Source Software (SFOSS)

**Event Date:** 23rd September | 1:00 PM – 3:00 PM IST  
**Venue:** Computer Lab 1, SASTRA Srinivasa Ramanujan Centre (SRC), Kumbakonam  
**Target Scale:** 40 Teams | 80 Participants | 100% Offline Execution  

---

## Overview
FOSSFURY 26 is an offline-first technical quiz platform engineered for the annual coding competition hosted by SFOSS. The platform serves Round 1 (**SYNTRACE**) and Round 2 (**DEBUGNOVA**) over a private local Wi-Fi/LAN network without reliance on public internet or cloud APIs.

## Key Features
* **100% Offline Operations:** Zero internet connectivity required during competition execution.
* **Server-Authoritative Timer & Scoring:** Master time reference and score calculation reside on the local server.
* **Independent Per-Team Shuffling:** Unique deterministic question and option orders generated per team via `HMAC-SHA256`.
* **Real-time Anti-Cheat Suite:** Monitors browser tab visibility, focus, context menus, and keyboard traps.

## Repository Structure
```text
sfoss-fury-2.0/
├── apps/
│   ├── web/            # Participant & Admin React / Next.js Web Client
│   └── server/         # Node.js TypeScript API & Quiz Engine Server
├── packages/
│   ├── shared/         # Shared Types, Constants & DTOs
│   └── config/         # Shared Configuration (ESLint, Prettier, TS)
├── prisma/
│   └── schema.prisma   # Local PostgreSQL Schema & ORM Definitions
├── tests/
│   ├── unit/           # Engine Unit Tests
│   ├── api/            # API Endpoint Integration Tests
│   └── e2e/            # Playwright End-to-End Tests
├── docs/
│   ├── PRD.md          # Authoritative Product Requirements Document
│   └── CHECKLIST.md    # Actionable Implementation Checklist
├── .env.example        # Environment variable configuration template
├── package.json        # Root monorepo npm workspace setup
└── README.md           # Project Documentation Overview
```

## Documentation
* [PRD Document](docs/PRD.md)
* [Implementation Checklist](docs/CHECKLIST.md)
