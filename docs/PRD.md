# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# SFOSS FURY 2.0 — SASTRA FREE & OPEN SOURCE SOFTWARE
## University-Level Technical Quiz Platform

**Document Version:** 2.0.0  
**Status:** Approved / Implementation-Ready  
**Date:** September 11, 2026  
**Target Event Date:** September 23, 2026 (1:00 PM – 3:00 PM)  
**Host Institution:** SASTRA Deemed to be University, Srinivasa Ramanujan Centre (SRC), Kumbakonam  
**Venue:** Computer Lab 1  
**Organization:** SASTRA Free & Open Source Software (SFOSS)  
**Authors:** Senior Product Manager, UX Architect & Lead Software Architect  

---

## 1. Executive Summary

### 1.1 Overview
**SFOSS FURY 2.0** is an offline-first, high-performance, university-level technical quiz platform purpose-built for the annual coding and debugging competition hosted by the SASTRA Free & Open Source Software (SFOSS) club at SASTRA Srinivasa Ramanujan Centre, Kumbakonam. 

The platform operates **100% offline** over a dedicated local Wi-Fi/LAN network deployed inside Computer Lab 1. It serves up to 40 teams (80 participants maximum) with zero reliance on cloud services, external APIs, or public internet infrastructure.

### 1.2 Core Competition Profile
* **Event Name:** SFOSS FURY 2.0
* **Organizing Body:** SASTRA Free & Open Source Software (SFOSS)
* **Institution:** SASTRA Deemed to be University, Srinivasa Ramanujan Centre, Kumbakonam
* **Event Date & Time:** 23rd September | 1:00 PM – 3:00 PM IST
* **Venue:** Computer Lab 1
* **Entry Fee:** FREE
* **Team Structure:** Exactly 2 members per team
* **Capacity Limit:** Maximum 40 teams (80 participants total)
* **Registration Model:** Pre-event online registration via official QR code. Strictly **NO on-spot registration**.
* **Rewards:** Winner / Runner Prizes & Official Certificates of Merit/Participation.

### 1.3 Key Stakeholders & Key Contacts
* **Faculty Coordinators:**
  * **Dr. Umamaheswari P** | AP III / CSE
  * **Dr. Sumathi A** | AP III / CSE
  * **Dr. Rubidha Devi D** | AP II / CSE
* **Student Event Coordinators (Queries):**
  * **K. Thejesh** — +91 9866339686
  * **K.P. Mohith** — +91 6300624918

---

## 2. Technical Stack
* **Frontend:** React 18 / Next.js 14, TypeScript, Vanilla CSS / Tailwind CSS, Lucide Icons (Bundled locally)
* **Backend:** Node.js 20 LTS, Express / Fastify, TypeScript, Prisma ORM, Socket.io
* **Database:** PostgreSQL 16 (Local venue server)
* **Network:** Local LAN / Wi-Fi Router (`192.168.1.100` / `http://sfoss.local`)
