# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# SFOSS FURY 2.0 — SASTRA FREE & OPEN SOURCE SOFTWARE
## University-Level Technical Quiz Platform

**Document Version:** 2.0.0  
**Status:** Approved / Implementation-Ready  
**Date:** September 11, 2026  
**Target Event Date:** September 23, 2026 (1:00 PM – 3:00 PM IST)  
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
* **Institution:** SASTRA Deemed to be University
* **Centre:** Srinivasa Ramanujan Centre, Kumbakonam
* **Event Date:** 23rd September 2026
* **Event Time:** 1:00 PM – 3:00 PM IST
* **Venue:** Computer Lab 1
* **Entry Fee:** FREE
* **Team Structure:** Exactly 2 members per team
* **Maximum Team Capacity:** 40 teams
* **Maximum Participants:** 80 participants
* **Registration Model:** Online/pre-event registration strictly through the official registration QR code. **NO on-spot registration**.
* **Rewards:** Winner / Runner Prizes & Official Certificates of Merit/Participation.

### 1.3 Key Stakeholders & Key Contacts
* **Faculty Coordinators:**
  * **Dr. Umamaheswari P** | AP III / CSE
  * **Dr. Sumathi A** | AP III / CSE
  * **Dr. Rubidha Devi D** | AP II / CSE
* **Student Event Coordinators (Event Queries):**
  * **K. Thejesh** — +91 9866339686
  * **K.P. Mohith** — +91 6300624918

### 1.4 Competition Structure
The competition is structured into **TWO DISTINCT ROUNDS**:
1. **ROUND 1: SYNTRACE**
   * **Focus Area:** Syntax recognition, code tracing, and understanding program execution & output prediction.
2. **ROUND 2: DEBUGNOVA**
   * **Focus Area:** Debugging skills, identifying compilation/runtime errors, and discovering code solutions.

The system natively supports configurable quiz levels/rounds so the administrator can configure the exact duration, question set, scoring rules (+1/-1/0), and behavior for each round.

### 1.5 Value Proposition & Key Highlights
1. **100% Offline Integrity:** Entire backend API, quiz engine, database, and client UI run on a venue-hosted local server without internet connectivity.
2. **Server-Authoritative Synchronization:** Quiz state, countdown timer, answer evaluation, and scoring are strictly server-enforced to prevent client-side tampering.
3. **Independent Per-Team Shuffling:** Every team receives identical official question sets, but question order and option order are independently randomized per team server-side.
4. **Browser Anti-Cheat Suite:** Detects window blur, tab switching, context menu access, restricted key combinations, and fullscreen exits, flagging real-time alerts on the Admin Dashboard.
5. **Poster-Inspired UI Identity:** A visually stunning visual identity matching the official SFOSS FURY 2.0 event poster using deep indigo (`#30308F`), primary orange (`#F47B20`), warm cream (`#FFF1DC`), soft lavender (`#E7E6F5`), and teal (`#176B5B`) accents.

---

## 2. Product Vision

### 2.1 Mission Statement
To deliver a flawless, high-octane, zero-latency competition experience that showcases the technical acumen of SASTRA students in syntax tracing and debugging, while demonstrating the power, reliability, and security of modern open-source software architectures built for offline environments.

### 2.2 Core Design Principles
* **Zero External Dependencies:** No CDN calls, no remote fonts, no external JS libraries, no cloud database calls during event execution.
* **Server as the Absolute Source of Truth:** The client browser is an untrusted rendering node; all business logic, timers, option shuffling, and scoring reside on the local server.
* **Bulletproof Fault Tolerance:** Resilient against client power-offs, browser refreshes, accidental reloads, and temporary Wi-Fi blips.
* **Visual Excellence:** High-contrast, energetic, code-centric aesthetics derived from the SFOSS FURY 2.0 official event poster.

---

## 3. Problem Statement

Standard commercial web quiz platforms (e.g., Kahoot, Google Forms, HackerRank, Quizizz) present severe vulnerabilities and operational constraints when deployed for competitive university hackathons and timed quizzes:

1. **Internet Vulnerability:** Local network congestion or ISP dropouts lead to missing answer submissions or timer desynchronization.
2. **Client-Side Answer Exposure:** Web-based platforms frequently send answer keys to the browser, enabling tech-savvy students to inspect DOM/Network payloads.
3. **Cheating & Window Switching:** Generic platforms lack customizable, real-time local monitoring for tab switching, window blurring, or keyboard shortcuts.
4. **Fixed Question Ordering:** Static question numbers enable adjacent teams to glance at neighbors' screens to copy answers.
5. **Rigid Configuration:** Difficulty configuring distinct rounds like code tracing (**SYNTRACE**) and error debugging (**DEBUGNOVA**) with instant official document parsing (PDF/DOCX).

**SFOSS FURY 2.0** solves all these challenges with a locally hosted, custom-engineered Node.js/PostgreSQL architecture running on a venue server.

---

## 4. Goals

* **G-1 (Offline Operational Guarantee):** Execute the full 2-hour event without requesting a single packet over the public internet.
* **G-2 (Low Latency):** Maintain sub-35ms round-trip latency for question delivery and answer logging across 80 concurrent connections.
* **G-3 (Zero Data Loss):** Ensure 0% data loss during unexpected browser reloads or client connection drops.
* **G-4 (Fair Competition):** Guarantee 100% unique question/option shuffle sequences per team while evaluating scores with 100% precision.
* **G-5 (Admin Control):** Provide event administrators with complete real-time monitoring and one-click controls for starting/ending rounds and releasing results.

---

## 5. Non-Goals

* **NG-1 (No Cloud Sync):** The platform will NOT synchronize data to cloud databases (Firebase, Supabase, AWS) during or after the competition.
* **NG-2 (No Native OS Lockdown):** The platform will NOT install low-level kernel drivers or native OS lock-down agents (e.g., Safe Exam Browser). Anti-cheat is strictly browser-level.
* **NG-3 (No AI Question Generation):** Questions are strictly parsed from administrator-uploaded PDF/DOCX files. No AI models will generate, select, or modify questions.
* **NG-4 (No Automated Code Sandbox Execution):** Questions are multiple-choice or structured short-answer based on code tracing/debugging snippets; arbitrary code compilation in sandboxed VMs is out of scope.

---

## 6. Target Users

```
+-----------------------------------------------------------------------------------+
|                                SFOSS FURY 2.0 USERS                               |
+------------------------------------------+----------------------------------------+
|             PARTICIPANT TEAMS            |          ADMINISTRATIVE TEAM           |
| (40 Teams / 80 Students in Lab 1)        | (Faculty Coordinators & Student Leads) |
+------------------------------------------+----------------------------------------+
```

### 6.1 Persona 1: Student Competitor (Team Member)
* **Background:** 2nd/3rd year CSE/IT student at SASTRA SRC Kumbakonam participating in a 2-member team.
* **Needs:** Simple room entry, dark/high-contrast readable code snippets, clear remaining time display, instant button feedback, zero lag when switching questions.
* **Frustrations:** Accidental tab closing losing work, timer resetting on reload, hard-to-read code formatting.

### 6.2 Persona 2: Faculty Coordinator (Admin)
* **Background:** Computer Science Department Faculty (Dr. Umamaheswari P, Dr. Sumathi A, Dr. Rubidha Devi D).
* **Needs:** Quick uploading of DOCX/PDF question sets, visual verification of parsed questions, real-time overview of active teams and cheating alerts, controlled publication of final scores.
* **Frustrations:** Complicated tech setups, software crashes mid-event, leaking answer sheets prematurely.

### 6.3 Persona 3: Student Tech Lead (System Admin / Network Manager)
* **Background:** SFOSS Core Member (K. Thejesh, K.P. Mohith).
* **Needs:** Fast local server deployment (Docker Compose / Node CLI), simple local IP setup (`192.168.1.100`), quick database backup, clear system status dashboard.

---

## 7. User Roles & Permission Matrix

| Functionality | SuperAdmin | EventOrganizer | ParticipantTeam | Guest / Spectator |
| :--- | :---: | :---: | :---: | :---: |
| **Room Access & Setup** | Full Control | Read / Write | Assigned Room Only | None |
| **Upload & Validate Questions** | Yes | Yes | No | No |
| **Approve Official Question Set** | Yes | Yes | No | No |
| **Start / Pause / End Round** | Yes | Yes | No | No |
| **View Live Submissions & Dashboard** | Yes | Yes | Own Status Only | No |
| **Anti-Cheat Monitoring Logs** | Full View | Full View | Local Warning Only | No |
| **Disqualify / Reset Team** | Yes | Yes | No | No |
| **Publish Final Results** | Yes | No | No | No |
| **Answer Questions & Submit** | No | No | Yes | No |
| **View Scores & Answer Sheet** | Post-Publish | Post-Publish | Post-Publish Only | Public Summary |

---

## 8. Functional Requirements

### 8.1 Room & Team Management (FR-RTM)
* **FR-RTM-1 (Room Creation):** Admin can create a Quiz Room with a unique 6-character alphanumeric Room Code (e.g., `FURY20`).
* **FR-RTM-2 (Pre-Registered Team Ingestion):** Admin can import or pre-configure the official 40 registered team list (Team ID, Team Name, Member 1 Name, Member 2 Name, Register Numbers).
* **FR-RTM-3 (Team Login/Binding):** Teams join by entering the Room Code, selecting their registered Team Name, and providing a secret passcode generated during pre-event registration.
* **FR-RTM-4 (Lobby Lock):** Admin can lock the room lobby to prevent new connections once all 40 teams are verified.

### 8.2 Round Configuration & Management (FR-RCM)
* **FR-RCM-1 (Multi-Round Support):** System natively supports two pre-configured competition rounds:
  * **Round 1: SYNTRACE** (Focus: Syntax, code tracing, execution flow, output prediction).
  * **Round 2: DEBUGNOVA** (Focus: Bug identification, runtime errors, logic fix selection).
* **FR-RCM-2 (Round Parameters):** Admin can configure per round:
  * Duration in minutes (e.g., 30 mins for R1, 45 mins for R2).
  * Marks per correct answer (+1 default).
  * Penalty per incorrect answer (-1 default).
  * Unanswered score (0 default).
  * Anti-cheat tolerance threshold.

### 8.3 Question Ingestion & Validation (FR-QIV)
* **FR-QIV-1 (Document Ingestion):** Admin can upload question files in `.docx` (Microsoft Word) or `.pdf` format.
* **FR-QIV-2 (Parser Engine):** System parses uploaded documents into structured JSON format extracting question text, code blocks, option lists (A, B, C, D), correct option markers, and explanations.
* **FR-QIV-3 (Validation Checklist):** System verifies option count, single correct option designation, and code snippet indentation preservation.
* **FR-QIV-4 (Upload Preview & Error Log):** Admin view shows total detected questions, syntax warnings, and invalid format lines prior to final approval.
* **FR-QIV-5 (Strict Official Set Guarantee):** **CRITICAL:** The platform ONLY uses the administrator-uploaded and approved question set. Random sampling from external banks or AI generation is strictly prohibited.

### 8.4 Shuffling Engine (FR-SFE)
* **FR-SFE-1 (Independent Question Shuffling):** Every team receives the exact same set of official questions, but the sequence of questions presented is independently randomized per team.
* **FR-SFE-2 (Independent Option Shuffling):** The order of options (A, B, C, D) for each question is independently randomized per team.
* **FR-SFE-3 (Server Mapping Integrity):** The server maintains a secret mapping table linking each team's rendered index to the absolute Question ID and absolute Option ID.

### 8.5 Server-Authoritative Timer (FR-SAT)
* **FR-SAT-1 (Server Time Source):** The quiz timer is anchored to the server's system clock (`server_start_time` and `server_end_time`).
* **FR-SAT-2 (Client Sync):** The client UI fetches `remaining_seconds` via periodic heartbeat (every 5 seconds) and counts down locally between syncs.
* **FR-SAT-3 (Reload Resilience):** If a client reloads or reconnects, the server returns the updated `remaining_seconds` based on `server_end_time - current_server_time`. Time elapsed while disconnected is strictly lost.
* **FR-SAT-4 (Hard Cutoff Auto-Submission):** When `current_server_time >= server_end_time`, the server marks the team's session as `SUBMITTED_EXPIRED` and rejects further answer changes.

### 8.6 Anti-Cheat System (FR-ACS)
* **FR-ACS-1 (Tab & Focus Detection):** System records events when the participant browser tab loses visibility (`visibilitychange`) or window focus (`blur`).
* **FR-ACS-2 (Fullscreen Enforcement):** Quiz interface requests browser fullscreen mode upon start. Exiting fullscreen triggers a high-severity warning log.
* **FR-ACS-3 (Shortcuts & Clipboard Suppression):** Intercepts and blocks `Ctrl+C`, `Ctrl+V`, `Ctrl+U`, `F12` (DevTools), `Alt+Tab`, and right-click context menus.
* **FR-ACS-4 (Real-time Admin Alerts):** Every violation transmits an immediate payload to the server containing `team_id`, `violation_type`, `timestamp`, and `count`.
* **FR-ACS-5 (Disqualification Workflow):** If a team exceeds the admin-configured violation threshold (e.g., 5 tab switches), the server auto-flags the team as `FLAGGED_SUSPICIOUS` or `DISQUALIFIED` (subject to admin confirmation).

### 8.7 Scoring & Results Management (FR-SRM)
* **FR-SRM-1 (Server-Side Evaluation):** Answers are scored exclusively server-side (+1 correct, -1 wrong, 0 unanswered).
* **FR-SRM-2 (Concealed State):** Scores and answer sheets remain 100% concealed from participants until the Admin explicitly triggers "Publish Results".
* **FR-SRM-3 (Leaderboard Generation):** Admin Dashboard displays live, auto-updating leaderboard sorted by total score, DEBUGNOVA score, completion time, and anti-cheat record.
* **FR-SRM-4 (Post-Publication Correct-Answer Sheet):** Upon result release, participant screens update to show score summary and question-by-question review with highlighted correct answers and explanations.

### 8.8 Requirements Traceability Matrix (MoSCoW)

| Requirement Code | Description | MoSCoW Priority | Technical Component |
| :--- | :--- | :---: | :--- |
| **FR-RTM-1..4** | Room Creation, Team Binding & Lobby Lock | **MUST HAVE** | Admin API / Database |
| **FR-RCM-1..2** | Multi-Round (Syntrace & Debugnova) Setup | **MUST HAVE** | Backend Engine / Admin UI |
| **FR-QIV-1..5** | DOCX/PDF Upload, Parser & Official Set Lock | **MUST HAVE** | Document Parser Engine |
| **FR-SFE-1..3** | Server-Side Question & Option Shuffling | **MUST HAVE** | Shuffling Engine |
| **FR-SAT-1..4** | Server-Authoritative Sync Timer | **MUST HAVE** | Timer Engine / Socket |
| **FR-ACS-1..5** | Browser Visibility, Focus & Key Suppression | **MUST HAVE** | Participant UI / Anti-Cheat |
| **FR-SRM-1..4** | Server Scoring, Concealed State & Publication | **MUST HAVE** | Scoring Engine |
| **FR-OFF-1..3** | 100% Offline Asset Delivery & Local Network IP | **MUST HAVE** | Local Venue Server |
| **FR-REC-1..4** | Automatic State Recovery on Reload / Reconnect | **MUST HAVE** | Client Storage / DB Session |
| **FR-UI-1..3** | SFOSS Poster-Inspired Color System & Fonts | **MUST HAVE** | Design System / CSS |
| **FR-EXP-1** | Export Results to CSV / PDF | **SHOULD HAVE** | Admin Dashboard |
| **FR-AUD-1** | Printable Individual Team Scorecards | **COULD HAVE** | Admin Dashboard |

---

## 9. Participant Workflow

```
+-----------------------------------------------------------------------------------+
|                               PARTICIPANT USER FLOW                               |
+-----------------------------------------------------------------------------------+

 [ 1. WELCOME SCREEN ] 
         |
         v
 [ 2. ENTER ROOM CODE ] ------(Invalid)-------> [ ERROR ALERT ]
         |
      (Valid)
         v
 [ 3. TEAM SELECT & PASSCODE ] 
         |
         v
 [ 4. WAITING LOBBY ] <--- (Connected to Local Server, waiting for Admin Start)
         |
   (Admin Starts)
         v
 [ 5. INSTRUCTIONS & FULLSCREEN PROMPT ]
         |
   (Click "Start")
         v
 [ 6. QUIZ INTERFACE (SYNTRACE / DEBUGNOVA) ]
    * Server Timer Counting Down
    * Question & Option Order Shuffled
    * Anti-Cheat Active (Tab Switch / Blur -> Logged)
    * Instant Auto-Save on Answer Select
         |
   +-----+--------------------------------------+
   |                                            |
(Manual Submit)                       (Timer Expires)
   |                                            |
   v                                            v
 [ 7. SUBMISSION CONFIRMATION ]       [ 8. TIME EXPIRED LOCK ]
   |                                            |
   +---------------------+----------------------+
                         |
                         v
            [ 9. WAITING FOR RESULTS ]
                         |
               (Admin Publishes Scores)
                         v
            [ 10. RESULT & ANSWER SHEET ]
```

### 9.1 Participant Screen States
1. **Welcome Screen:** Clean branded entry header with SFOSS FURY 2.0 visual badge.
2. **Room Code Entry Screen:** 6-character room code input with instant validation.
3. **Team Registration / Identification Screen:** Selection of pre-registered team name from dropdown and entry of 4-digit team passcode.
4. **Instructions Screen:** Comprehensive round guidelines (SYNTRACE syntax tracing or DEBUGNOVA error identification rules, time limit, scoring schema +1/-1/0).
5. **Ready / Waiting Screen:** Status indicator showing: *"Connected to Local Server. Standby for administrator to launch the round."*
6. **Quiz Interface:** 
   * **Top Bar:** Round Name Badge, Server-Synced Timer (flashing orange $<5$ mins), Team Name, Disconnect Warning Indicator.
   * **Main Area:** Question counter ($Q_i / N$), Question text, Syntax-highlighted code block (for SYNTRACE/DEBUGNOVA), 4 Option cards (A, B, C, D).
   * **Bottom Bar:** Previous, Next, Clear Selection, Mark for Review, Final Submit button.
7. **Question Navigation Matrix:** Interactive grid showing Answered (Teal), Unanswered (Cream), and Marked for Review (Purple) questions.
8. **Timer Warning State:** Visual pulse banner when remaining time falls below 5 minutes.
9. **Anti-Cheat Warning Modal:** Overlay pop-up on focus loss: *"WARNING: Window switch detected! Event coordinators have been notified. (Violation X)"*.
10. **Submission Confirmation Dialog:** Modal prompting user to confirm final submit before timer expiry.
11. **Time Expired Screen:** Automatic locked state view when server timer hits 00:00.
12. **Waiting for Results Screen:** Status card: *"Quiz Submitted Successfully! Standby for faculty coordinators to publish official scores."*
13. **Result Screen:** Detailed team performance summary including Total Score, Rank, Correct Count, Incorrect Count, Unanswered Count.
14. **Correct Answer Sheet:** Post-publication question review interface displaying selected option vs. correct option with explanations.

---

## 10. Admin Workflow

```
+-----------------------------------------------------------------------------------+
|                                 ADMIN WORKFLOW                                    |
+-----------------------------------------------------------------------------------+

 [ 1. ADMIN AUTHENTICATION ] (Secret Local Admin Credentials)
         |
         v
 [ 2. DASHBOARD OVERVIEW ]
         |
   +-----+-----------------------+-----------------------+
   |                             |                       |
   v                             v                       v
 [ 3. CREATE ROOM ]      [ 4. UPLOAD QUESTIONS ]   [ 5. TEAM MONITORING ]
 (Set Code: FURY20)      (Select .docx/.pdf)       (View 40 Registered Teams)
   |                             |                       |
   +-----------------------------+                       |
                                 |                       |
                                 v                       v
                      [ 6. VALIDATE & APPROVE ]    [ 7. LOCK LOBBY ]
                                 |                       |
                                 +-----------+-----------+
                                             |
                                             v
                                  [ 8. START ROUND 1 ]
                                             |
                                             v
                                  [ 9. LIVE MONITORING ]
                                   * Active Submissions
                                   * Anti-Cheat Alerts
                                   * Remaining Time
                                             |
                                             v
                                  [ 10. END ROUND / SCORE ]
                                             |
                                             v
                                  [ 11. PUBLISH RESULTS ]
```

### 10.1 Admin Screen Suite
1. **Admin Login Screen:** Secure local authentication for faculty/student leads.
2. **Main Dashboard:** Real-time metrics grid (Total Teams, Active Answering, Submitted, Disqualified, Server Health).
3. **Room Management Screen:** Room creation (`FURY20`), status toggles, lobby lock.
4. **Round Configuration Screen:** Configure SYNTRACE & DEBUGNOVA round timers, mark schemes (+1, -1, 0), and anti-cheat thresholds.
5. **Question Upload Screen:** Drag-and-drop zone for official `.docx` and `.pdf` question papers.
6. **Question Validation Screen:** Live parser status showing detected questions, valid/invalid tags, and code block formatting previews.
7. **Question Preview Modal:** Question-by-question inspector before final official set lock.
8. **Team Management Screen:** Roster view of 40 pre-registered teams, passcodes, and connection statuses.
9. **Participant Monitoring Screen:** Real-time participant IP addresses, browser status, and current question progress.
10. **Live Quiz Monitoring Panel:** Real-time synchronized master clock countdown and team activity stream.
11. **Anti-Cheat Monitoring Log:** Filterable log of tab-switch, blur, and fullscreen exit violations with manual "Disqualify Team" control.
12. **Submission Monitoring View:** Live table tracking submitted teams vs. in-progress teams.
13. **Score Management Screen:** Server-calculated score table sorted by tie-breaking logic.
14. **Result Review Screen:** Faculty coordinator verification interface before score release.
15. **Result Publication Control:** High-impact toggle switch to broadcast results to all participant devices.
16. **Correct Answer Sheet Management:** Toggle option to publish or withhold detailed answer keys.
17. **System / Server Status Screen:** CPU/RAM utilization, PostgreSQL connections, local network throughput.
18. **Backup / Recovery Panel:** One-click JSON/SQL snapshot export for instant emergency recovery.

---

## 11. Quiz Lifecycle

```
                      +-------------------+
                      |      CREATED      |
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |    LOBBY_OPEN     | <--- Teams Register & Join
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |   LOBBY_LOCKED    | <--- Admin Locks Registrations
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |   ROUND_ACTIVE    | <--- Timer Running, Answers Logged
                      +----+---------+----+
                           |         |
                 (Pause)   |         | (Timer Expiry / Admin End)
                           v         v
             +------------------+  +-------------------+
             |   ROUND_PAUSED   |  |    ROUND_ENDED    |
             +--------+---------+  +---------+---------+
                      |                      |
             (Resume) |                      v
                      +------------> +-------------------+
                                     | SCORING_COMPLETE  |
                                     +---------+---------+
                                               |
                                               v
                                     +-------------------+
                                     | RESULTS_PUBLISHED |
                                     +-------------------+
```

### 11.1 Full Quiz Execution Sequence
1. **Admin initializes room** (`FURY20`).
2. **Admin configures Round 1 (SYNTRACE)** duration and scoring scheme.
3. **Admin uploads official question paper** (`.docx` / `.pdf`).
4. **System parses & validates questions**.
5. **Admin approves question set** as official master.
6. **Participants connect to local Wi-Fi** (`SFOSS_QUIZ_5G`) and access `http://sfoss.local`.
7. **Teams join using Room Code and Team Passcode**.
8. **Admin locks lobby** once all 40 teams are connected.
9. **Admin clicks "Start Round"**.
10. **Server generates deterministic per-team question & option shuffle mappings**.
11. **Participants answer questions** over synchronized server countdown.
12. **Server logs answer updates idempotently**.
13. **Participant manually submits OR server timer hard-cutoff executes**.
14. **Server finalizes round session state** to `SUBMITTED`.
15. **Participant interface transitions to Waiting Screen**.
16. **Admin repeats steps 2–15 for Round 2 (DEBUGNOVA)**.
17. **Admin reviews combined scoring & leaderboard**.
18. **Admin clicks "Publish Results"**, pushing scorecards and answer sheets to participants.

---

## 12. Question Management

### 12.1 Official Document Ingestion Format
To allow faculty coordinators (Dr. Umamaheswari P, Dr. Sumathi A, Dr. Rubidha Devi D) to author questions in Microsoft Word or PDF, the parser enforces a structured tag format:

```text
[QUESTION]
Identify the output of the following C++ code snippet:

[CODE]
#include <iostream>
using namespace std;

int main() {
    int x = 5;
    cout << x++ + ++x;
    return 0;
}
[/CODE]

[OPTION_A] 10
[OPTION_B] 12
[OPTION_C] 11
[OPTION_D] Undefined behavior / Compiler dependent

[CORRECT] D
[EXPLANATION] Modifying a variable twice within the same sequence point yields undefined behavior in C++.
[END_QUESTION]
```

### 12.2 Parser & Validation Pipeline
1. **Upload Handler:** Accepts `.docx` via `mammoth.js` or `.pdf` via `pdf-parse`.
2. **Tokenization Stream:** Scans text stream for `[QUESTION]`, `[CODE]`, `[OPTION_X]`, `[CORRECT]`, and `[END_QUESTION]` delimiters.
3. **Validation Checklist:**
   * Verifies each question has 2 to 4 options.
   * Verifies exactly one correct option exists.
   * Verifies code snippet whitespace and indentation are preserved.
4. **Status Dashboard Display:** Reports total parsed questions, invalid lines, missing options, and duplicate question text warnings.
5. **CRITICAL RULE:** **The administrator-uploaded and approved question set is the ONLY question set used.** The platform NEVER selects random subsets from external question banks, generates questions via AI, or alters official question wording.

---

## 13. Question & Option Shuffling

### 13.1 Cryptographic Seeded Shuffling
To guarantee fairness, shuffling uses a deterministic Fisher-Yates algorithm seeded by a combination of `TeamID`, `RoundID`, and `ServerSecretSalt`:

$$\text{Seed} = \text{HMAC-SHA256}(\text{TeamID} + \text{RoundID}, \text{ServerSecretSalt})$$

### 13.2 Shuffling Execution Schema

```
OFFICIAL MASTER QUESTION SET (Server Master):
Q1 [A, B, C, D] (Correct: B)
Q2 [A, B, C, D] (Correct: A)
Q3 [A, B, C, D] (Correct: D)

TEAM 01 RENDERED MAP:                     TEAM 02 RENDERED MAP:
Rendered Q1 -> Master Q3 [C, A, D, B]     Rendered Q1 -> Master Q2 [B, D, A, C]
Rendered Q2 -> Master Q1 [B, D, A, C]     Rendered Q2 -> Master Q3 [A, C, B, D]
Rendered Q3 -> Master Q2 [D, B, C, A]     Rendered Q3 -> Master Q1 [C, A, D, B]
```

### 13.3 Server Answer Resolution
When Team 01 submits option index `2` for rendered question `1`:
1. Server translates Rendered Q1 $\rightarrow$ Master Question 3.
2. Server translates Team 01's Rendered Option index `2` $\rightarrow$ Master Option `D`.
3. Server compares Master Option `D` against Master Q3's correct answer (`D`).
4. Result: **CORRECT (+1 mark)**.
Participants never receive or control the answer mapping.

---

## 14. Timer System

### 14.1 Server-Authoritative Logic
The timer is strictly server-authoritative. Participant browsers display remaining time but do NOT control time duration.

When Admin launches a round of $D$ minutes at timestamp $T_{\text{start}}$:

$$T_{\text{start}} = \text{System.currentTimeMillis}()$$

$$T_{\text{end}} = T_{\text{start}} + (D \times 60 \times 1000)$$

$$\text{Remaining Time (ms)} = \max(0, T_{\text{end}} - \text{System.currentTimeMillis}())$$

### 14.2 Disconnect & Reload Resilience Matrix

| Event Scenario | Client UI State | Server Action | Outcome |
| :--- | :--- | :--- | :--- |
| **Normal Operation** | Local countdown synced via Socket/API | Updates timestamp | Smooth clock display |
| **Page Reload (F5)** | Re-fetches `/api/v1/quiz/state` | Returns $T_{\text{end}} - T_{\text{now}}$ | Clock picks up exact server time |
| **Wi-Fi Disconnect (30s)** | Displays reconnection overlay | Server clock continues ticking | On reconnect, 30s lost from clock |
| **Client Device Crash** | Offline | Server clock reaches $T_{\text{end}}$ | Session auto-submitted at $T_{\text{end}}$ |

---

## 15. Scoring System

### 15.1 Core Formula
Scoring is executed exclusively on the server:

$$\text{Total Score}_S = (\text{Correct Answers} \times 1) + (\text{Incorrect Answers} \times -1) + (\text{Unanswered} \times 0)$$

### 15.2 Official Competition Tie-Breaking Rules
In the event of equal total scores between top teams:
1. **Primary Criterion:** Highest total combined score (SYNTRACE + DEBUGNOVA).
2. **Tie-Breaker 1 (DEBUGNOVA Performance):** Highest score specifically achieved in Round 2 (DEBUGNOVA).
3. **Tie-Breaker 2 (Syntax Precision):** Fewest incorrect answers (lowest negative penalty points).
4. **Tie-Breaker 3 (Submission Timestamp):** Earliest server timestamp of final submission for Round 2.
5. **Tie-Breaker 4 (Anti-Cheat Record):** Fewest recorded anti-cheat violation warnings.

---

## 16. Anti-Cheat System

### 16.1 Browser Event Detection Suite

```
+-----------------------------------------------------------------------------------+
|                            BROWSER ANTI-CHEAT SUITE                               |
+-----------------------------------------------------------------------------------+

 1. Visibility API (document.hidden / visibilitychange)
    --> Triggers when participant switches browser tab.

 2. Window Blur Event (window.onblur)
    --> Triggers when participant clicks outside browser window or opens external app.

 3. Fullscreen API (document.fullscreenElement)
    --> Triggers when participant exits mandatory browser fullscreen mode.

 4. DOM Event Traps (contextmenu, copy, paste, selectstart)
    --> Blocks right-click menu, copying code snippets, and pasting text.

 5. Keyboard Listener (keydown)
    --> Intercepts Ctrl+C, Ctrl+V, Ctrl+U, Alt+Tab, F12, Escape.
```

### 16.2 Violation Record Payload
Every detected event transmits a JSON payload to `POST /api/v1/anticheat/log`:

```json
{
  "teamId": "TEAM-024",
  "sessionId": "SESS-88392",
  "violationType": "TAB_SWITCH",
  "severity": "HIGH",
  "timestamp": "2026-09-23T13:42:11.402Z",
  "violationCount": 3,
  "clientMetadata": {
    "fullscreenActive": false,
    "currentQuestionIndex": 7
  }
}
```

### 16.3 Explicit Technical Limitation Disclaimer
> [!WARNING]
> **BROWSER-LEVEL MONITORING VS. DEVICE LOCKDOWN:**  
> A standard web browser running on client laptops cannot determine the exact name of external desktop applications opened by a user (e.g., WhatsApp, VS Code, Discord). The platform relies strictly on browser event signals (`blur`, `visibilitychange`, `fullscreenchange`). Event administrators must combine system logs with physical room proctoring inside Computer Lab 1.

---

## 17. Result Management

1. **Concealed Results:** Scores and answer keys remain strictly hidden from participants during active competition rounds.
2. **Server-Side Persisted Rankings:** Scores are calculated and written to table `final_results`.
3. **Live Admin Leaderboard:** Admin Dashboard updates continuously as teams submit.
4. **One-Click Result Broadcast:** Admin triggers "Publish Results" endpoint (`POST /api/v1/admin/results/publish`).
5. **Post-Publication Participant View:** Participant UI transitions to display:
   * Final Score & Campus Rank.
   * Round 1 (SYNTRACE) vs. Round 2 (DEBUGNOVA) score breakdown.
   * Full Question Review Sheet with highlighted correct answers and explanations.

---

## 18. Offline Architecture

```
+-----------------------------------------------------------------------------------+
|                        100% OFFLINE LOCAL ARCHITECTURE                            |
+-----------------------------------------------------------------------------------+

 [ PARTICIPANT LAPTOPS / MOBILE DEVICES ]
 (Connect to Local Wi-Fi SSID: "SFOSS_QUIZ_5G")
         |
         | (HTTP / Local IP: http://192.168.1.100 or http://sfoss.local)
         v
 +---------------------------------------------------------------------------------+
 |                    COMPUTER LAB 1 LOCAL HOST SERVER                             |
 |                                                                                 |
 |  +--------------------+   +---------------------+   +------------------------+  |
 |  | NGINX REVERSE PROXY|   | NODE.JS / EXPRESS   |   | POSTGRESQL DATABASE    |  |
 |  | (Serves Bundled    |-->| BACKEND API         |-->| (Local Persistent      |  |
 |  | Static Assets)     |   | (Quiz/Timer Engine) |   | Storage & WAL)         |  |
 |  +--------------------+   +---------------------+   +------------------------+  |
 +---------------------------------------------------------------------------------+
```

### 18.1 Static Asset Self-Containment
All required resources are pre-compiled and served directly from the local server disk:
* No external Google Fonts links $\rightarrow$ Bundled local TTF/WOFF2 font files.
* No CDN script tags (Tailwind, React, Lucide) $\rightarrow$ Compiled Node production bundle.
* Local SVG icons embedded inline or served from local static directory.

---

## 19. Internal System Architecture

```
+-----------------------------------------------------------------------------------+
|                             INTERNAL SYSTEM LAYERS                                |
+-----------------------------------------------------------------------------------+

 1. PRESENTATION LAYER
    +--------------------------------+   +----------------------------------+
    | Participant React Application  |   | Admin Dashboard React App        |
    +--------------------------------+   +----------------------------------+

 2. API ROUTING & AUTHENTICATION LAYER
    +-----------------------------------------------------------------------+
    | Express.js Router / JWT Middleware / Session Validator                |
    +-----------------------------------------------------------------------+

 3. CORE APPLICATION ENGINES
    +------------------+  +-------------------+  +--------------------------+
    | Quiz Engine      |  | Timer Engine      |  | Shuffling Engine         |
    +------------------+  +-------------------+  +--------------------------+
    | Anti-Cheat Engine|  | Document Parser   |  | Scoring & Results Engine |
    +------------------+  +-------------------+  +--------------------------+

 4. PERSISTENCE & DATA LAYER
    +-----------------------------------------------------------------------+
    | Prisma ORM Engine / PostgreSQL Local Database / Local Log File System |
    +-----------------------------------------------------------------------+
```

---

## 20. Local Network Architecture

### 20.1 Computer Lab 1 Network Topology
* **Local Router / Switch:** High-capacity Dual-Band Wi-Fi 6 Router or 48-Port Gigabit Switch.
* **Server Static IP Address:** `192.168.1.100`
* **Subnet Mask:** `255.255.255.0`
* **DHCP Range:** `192.168.1.101` to `192.168.1.200`
* **Local mDNS Hostname:** `http://sfoss.local`

### 20.2 Network Bandwidth & Capacity Analysis
* Total concurrent active clients: 80 participant devices + 5 admin devices.
* Average payload per answer submission: ~1.2 KB.
* Timer sync heartbeat: ~200 bytes every 5 seconds per client.
* Total required network throughput: **< 1.5 Mbps total** (well within standard Wi-Fi 6 bandwidth capacity).

---

## 21. Database Architecture (Prisma Schema)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPERADMIN
  EVENT_ORGANIZER
  PARTICIPANT_TEAM
}

enum RoundStatus {
  CREATED
  LOBBY_OPEN
  LOBBY_LOCKED
  ROUND_ACTIVE
  ROUND_PAUSED
  ROUND_ENDED
  SCORING_COMPLETE
  RESULTS_PUBLISHED
}

enum ViolationType {
  TAB_SWITCH
  WINDOW_BLUR
  FULLSCREEN_EXIT
  KEYBOARD_SHORTCUT
  CONTEXT_MENU
  NETWORK_DISCONNECT
}

model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  role         Role     @default(PARTICIPANT_TEAM)
  createdAt    DateTime @default(now())
  team         Team?
}

model Team {
  id             String               @id @default(uuid())
  userId         String               @unique
  user           User                 @relation(fields: [userId], references: [id])
  teamName       String               @unique
  passcode       String
  member1Name    String
  member1RegNo   String
  member2Name    String
  member2RegNo   String
  isDisqualified Boolean              @default(false)
  sessions       ParticipantSession[]
  submissions    AnswerSubmission[]
  antiCheatLogs  AntiCheatLog[]
  scores         FinalResult[]
}

model QuizRoom {
  id          String      @id @default(uuid())
  roomCode    String      @unique
  title       String
  status      RoundStatus @default(CREATED)
  rounds      QuizRound[]
  createdAt   DateTime    @default(now())
}

model QuizRound {
  id               String               @id @default(uuid())
  roomId           String
  room             QuizRoom             @relation(fields: [roomId], references: [id])
  roundNumber      Int
  roundName        String               // "SYNTRACE" or "DEBUGNOVA"
  durationMinutes  Int
  marksPerCorrect  Float                @default(1.0)
  penaltyPerWrong  Float                @default(-1.0)
  startTime        DateTime?
  endTime          DateTime?
  status           RoundStatus          @default(CREATED)
  questions        Question[]
  sessions         ParticipantSession[]
  submissions      AnswerSubmission[]
  scores           FinalResult[]
}

model Question {
  id             String             @id @default(uuid())
  roundId        String
  round          QuizRound          @relation(fields: [roundId], references: [id])
  questionNumber Int
  questionText   String
  codeSnippet    String?
  explanation    String?
  options        Option[]
  submissions    AnswerSubmission[]
}

model Option {
  id           String             @id @default(uuid())
  questionId   String
  question     Question           @relation(fields: [questionId], references: [id])
  optionLetter String             // "A", "B", "C", "D"
  optionText   String
  isCorrect    Boolean            @default(false)
  submissions  AnswerSubmission[]
}

model ParticipantSession {
  id             String    @id @default(uuid())
  teamId         String
  team           Team      @relation(fields: [teamId], references: [id])
  roundId        String
  round          QuizRound @relation(fields: [roundId], references: [id])
  questionOrder  Json      // Array of Master Question IDs
  optionOrder    Json      // Map of QuestionID -> Array of Option IDs
  startedAt      DateTime  @default(now())
  submittedAt    DateTime?
  isCompleted    Boolean   @default(false)
}

model AnswerSubmission {
  id               String    @id @default(uuid())
  teamId           String
  team             Team      @relation(fields: [teamId], references: [id])
  roundId          String
  round            QuizRound @relation(fields: [roundId], references: [id])
  questionId       String
  question         Question  @relation(fields: [questionId], references: [id])
  selectedOptionId String?
  selectedOption   Option?   @relation(fields: [selectedOptionId], references: [id])
  isCorrect        Boolean?
  pointsAwarded    Float?
  submittedAt      DateTime  @default(now())

  @@unique([teamId, roundId, questionId])
}

model AntiCheatLog {
  id            String        @id @default(uuid())
  teamId        String
  team          Team          @relation(fields: [teamId], references: [id])
  violationType ViolationType
  timestamp     DateTime      @default(now())
  metadata      Json?
}

model FinalResult {
  id              String    @id @default(uuid())
  teamId          String
  team            Team      @relation(fields: [teamId], references: [id])
  roundId         String
  round           QuizRound @relation(fields: [roundId], references: [id])
  totalCorrect    Int
  totalWrong      Int
  totalUnanswered Int
  score           Float
  rank            Int?
  createdAt       DateTime  @default(now())

  @@unique([teamId, roundId])
}
```

---

## 22. API & Backend Architecture

### 22.1 RESTful Endpoint Specification

#### Authentication & Room Joining
* `POST /api/v1/auth/login` — Admin authentication.
* `POST /api/v1/room/join` — Team login using Room Code (`FURY20`) & secret Team Passcode.

#### Admin Control Panel
* `POST /api/v1/admin/room/create` — Initialize quiz room.
* `POST /api/v1/admin/questions/upload` — Upload `.docx` or `.pdf` question file.
* `POST /api/v1/admin/questions/approve` — Lock official question set.
* `POST /api/v1/admin/round/start` — Launch round timer & enable participant UI.
* `POST /api/v1/admin/round/end` — Force end round & calculate scores.
* `POST /api/v1/admin/results/publish` — Publish scores & answer keys.

#### Participant Quiz Engine
* `GET /api/v1/quiz/state` — Fetch current round state, server remaining time, and team-specific shuffled question set.
* `POST /api/v1/quiz/answer` — Idempotent save/update of single question selection.
* `POST /api/v1/quiz/submit` — Final manual quiz submission.
* `POST /api/v1/anticheat/log` — Record browser anti-cheat violation event.

---

## 23. Security Requirements

1. **Answer Masking Integrity:** Payload returned by `GET /api/v1/quiz/state` MUST NEVER contain `isCorrect` tags or raw master answer keys.
2. **Server-Side Authentication:** Admin endpoints require valid HTTP-only JWT cookies verifying `Role === SUPERADMIN`.
3. **Replay & Tampering Prevention:** Submissions sent after `server_end_time + 5s grace buffer` are rejected by backend.

---

## 24. Failure Recovery

| Failure Scenario | Recovery Procedure | Result |
| :--- | :--- | :--- |
| **Participant Browser Reload (F5)** | Client re-initiates session with local token | UI restores active session, timer, and saved answers from PostgreSQL DB |
| **Wi-Fi Router Power Drop** | Router auto-reboots | Socket auto-reconnects; quiz timer continues running server-side |
| **Host Server Power Outage** | Server reboots (UPS backed up) | PostgreSQL WAL logs restore state; Admin extends round time by outage duration |

---

## 25. Performance Requirements

* **Concurrent User Capacity:** Tested for 80 active participants + 5 admin dashboards.
* **API Latency Target:** 95% of requests served in $< 35\text{ ms}$.
* **Page Load Time:** Initial load $< 1\text{ s}$ over local 5GHz Wi-Fi.
* **Database Throughput:** Peak load $< 300\text{ queries/sec}$ during bulk submit.
* **Memory Footprint:** Node server $< 300\text{ MB RAM}$, PostgreSQL $< 500\text{ MB RAM}$.

---

## 26. Technology Stack

* **Frontend:** React 18 / Next.js 14 (Exported static bundle), TypeScript, Vanilla CSS / Tailwind (locally bundled).
* **Backend:** Node.js 20 LTS, Express / Fastify, TypeScript, Prisma ORM, Socket.io.
* **Database:** PostgreSQL 16 (Local instance).
* **Document Parsing:** `mammoth.js` (DOCX extraction), `pdf-parse` (PDF extraction).
* **Testing Tools:** Playwright (E2E & Load Testing), Vitest (Unit Tests), Postman / Bruno (API Testing).
* **Version Control:** Git & GitHub (Used ONLY for source code repository management; actual deployment is 100% offline).

---

## 27. Deployment Architecture

### 27.1 Local Server Hardware Requirements
* **Host Machine:** Intel Core i5/i7 (10th Gen+) or Apple Silicon M1/M2/M3 laptop/desktop.
* **RAM:** Minimum 8 GB (16 GB recommended).
* **Storage:** 256 GB SSD.
* **Power Supply:** Dedicated UPS battery backup.

### 27.2 Docker Compose Configuration (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  sfoss-db:
    image: postgres:16-alpine
    container_name: sfoss_postgres
    restart: always
    environment:
      POSTGRES_USER: sfoss_admin
      POSTGRES_PASSWORD: SfossFury2026Password!
      POSTGRES_DB: sfoss_fury_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  sfoss-app:
    build: .
    container_name: sfoss_app
    restart: always
    ports:
      - "80:3000"
    environment:
      DATABASE_URL: "postgresql://sfoss_admin:SfossFury2026Password!@sfoss-db:5432/sfoss_fury_db?schema=public"
      NODE_ENV: "production"
      JWT_SECRET: "SFOSS_FURY_LOCAL_SUPER_SECRET_KEY_2026"
    depends_on:
      - sfoss-db

volumes:
  pgdata:
```

---

## 28. Testing Requirements

1. **Unit Testing (Vitest):** 100% test coverage on Shuffling Engine, Scoring Calculator, and Document Parser.
2. **Integration & API Testing (Postman/Bruno):** Automated test scripts for user auth, room join, question upload, and answer submission.
3. **E2E & Load Testing (Playwright):** Simulated 40-team concurrent session login, question navigation, tab-switch event logging, auto-submit, and score calculation.

---

## 29. Event-Day Setup

```
+-----------------------------------------------------------------------------------+
|                        EVENT-DAY OPERATIONAL TIMELINE                             |
+-----------------------------------------------------------------------------------+

 TIME          STAGE               ACTIONS
 -----------------------------------------------------------------------------------
 T-24 Hours    Pre-Event Dry Run   * Perform full system mock run in Lab 1.
                                   * Verify database backup scripts.
                                   * Test Wi-Fi router coverage across all desks.

 T-2 Hours     Hardware Setup      * Position host server machine at Admin Desk.
                                   * Connect UPS power back-up to server & router.
                                   * Boot PostgreSQL & Node Server. Verify `sfoss.local`.

 T-45 Mins     Admin Prep          * Log into Admin Panel.
                                   * Create Room `FURY20`.
                                   * Upload & validate Round 1 (SYNTRACE) questions.
                                   * Verify 40 pre-registered team list.

 T-15 Mins     Participant Entry   * Admit 80 participants into Computer Lab 1.
                                   * Display SSID & IP address on projector screen.
                                   * Teams navigate to `http://sfoss.local` and join.

 1:00 PM       ROUND 1 START       * Admin locks lobby and clicks "Start Round 1".
 (SYNTRACE)                        * Monitor live timer & anti-cheat alerts.

 1:45 PM       ROUND 1 END         * Round auto-expires. Submissions finalized.
                                   * Admin verifies scores.

 2:00 PM       ROUND 2 START       * Admin uploads Round 2 (DEBUGNOVA) questions.
 (DEBUGNOVA)                       * Clicks "Start Round 2".

 2:45 PM       COMPETITION END     * Round 2 completes.
                                   * Admin reviews top leaderboard standings.

 3:00 PM       RESULTS PUBLISH     * Admin clicks "Publish Results".
                                   * Participant screens display scores & answer key.
                                   * Prize distribution ceremony begins.
```

---

## 30. Acceptance Criteria

### Scenario 1: Server-Authoritative Timer & Reload Protection
```gherkin
GIVEN a participant team is actively answering Round 1 (SYNTRACE)
AND the server timer shows 15 minutes remaining
WHEN the participant refreshes the browser page (F5) or closes the tab
THEN the application restores the quiz state from the local server
AND the remaining time continues directly from the server's master countdown (e.g., 14 mins 58s)
AND no extra time is granted to the participant.
```

### Scenario 2: Independent Question & Option Shuffling
```gherkin
GIVEN Team A and Team B are logged into the same Quiz Room
WHEN both teams receive the official question set for Round 1
THEN Team A's rendered Question 1 displays Master Question 7
AND Team B's rendered Question 1 displays Master Question 3
AND the option order (A, B, C, D) for Master Question 7 is randomized independently for Team A
AND the server correctly maps Team A's answer choices back to Master Question 7 upon scoring.
```

### Scenario 3: Real-Time Anti-Cheat Violation Alerting
```gherkin
GIVEN a participant attempts to switch tabs or open another application during the quiz
WHEN the browser emits a `visibilitychange` or `blur` event
THEN the participant interface immediately displays a warning overlay
AND an anti-cheat log payload is transmitted to the local server
AND the Admin Dashboard increments the team's violation counter in real-time.
```

---

## 31. Future Enhancements

* **FE-1 (Automated Code Sandbox Execution):** Docker-in-Docker sandboxed compilation for live coding tasks.
* **FE-2 (Multi-Lab Synchronization):** Distributed node replication for simultaneous multi-lab events across university campuses.
* **FE-3 (Question Difficulty Analytics):** Post-event discrimination index & item analysis metrics for faculty researchers.

---

## 32. Risks and Mitigations

| Risk Description | Impact | Probability | Mitigation Strategy | Contingency Plan |
| :--- | :---: | :---: | :--- | :--- |
| **Wi-Fi Router Hardware Crash** | HIGH | LOW | Use enterprise-grade router with passive cooling; connect server via Ethernet. | Instantly switch to backup router pre-configured with identical SSID & IP subnet. |
| **Server Power Cable Dislodged** | CRITICAL | LOW | Server connected to dedicated online UPS unit. | Restart host machine; PostgreSQL WAL logs restore quiz session state without data loss. |
| **Document Parser Fails on Syntax Error** | MEDIUM | MEDIUM | Admin UI provides live validation preview highlighting exact line errors. | Provide fallback manual web form for editing questions directly in Admin UI. |
| **Participant Attempts IP Spoofing** | HIGH | LOW | Bind Team sessions to unique generated passcodes & client hardware fingerprints. | Admin retains instant 1-click "Disqualify Team" button on live dashboard. |

---
**End of Product Requirements Document.**  
*SFOSS FURY 2.0 — SASTRA Free & Open Source Software, SASTRA SRC Kumbakonam.*
