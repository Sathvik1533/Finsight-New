# FINSIGHT — TOOL ORCHESTRATION SYSTEM
## How Claude, Kiro, ChatGPT, and You Build Together

```
Version:        1.0.0
Classification: Internal — Build Execution Guide
Purpose:        Define exactly who does what, when, and how
Audience:       You — the builder running this project
Philosophy:     Every tool has one job. Confusion ends when roles are clear.
```

---

👉 **FinSight Tool Orchestration System**

This document is your daily operating manual.
Not theory. Not architecture.
The exact answer to: **"What do I do right now?"**

Read it once end-to-end before starting.
After that, you will only open specific sections as needed.

---

## THE ONE PICTURE THAT GOVERNS EVERYTHING

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   YOU                                                                   │
│   ─────────────────────────────────────────────────────────────────    │
│   You are the builder-in-chief.                                         │
│   You read. You decide. You verify. You commit.                         │
│   You control every tool. No tool controls you.                         │
│                                                                         │
│                        ↓ gives tasks to          ↓ asks when stuck     │
│                                                                         │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │
│   │    CLAUDE       │    │     KIRO         │    │    CHATGPT      │   │
│   │                 │    │                  │    │                 │   │
│   │  The Planner    │    │  The Builder     │    │  The Teacher    │   │
│   │                 │    │                  │    │                 │   │
│   │  Knows the      │    │  Writes code     │    │  Explains       │   │
│   │  full system.   │    │  from prompts.   │    │  concepts.      │   │
│   │  Makes          │    │  Follows         │    │  Interprets     │   │
│   │  decisions.     │    │  instructions.   │    │  error msgs.    │   │
│   │  Never codes.   │    │  Never decides.  │    │  Zero project   │   │
│   │                 │    │                  │    │  context.       │   │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**The rule that makes this work:**
No tool does another tool's job.
The moment Kiro starts making architecture decisions, the code is wrong.
The moment ChatGPT starts knowing your project, it will give conflicting advice.
The moment Claude starts writing your production code, you stop understanding it.

---

## PART 1 — TOOL USAGE SYSTEM

### 1.1 CLAUDE — The Planner

**Claude's job:**
- Hold the complete system understanding of FinSight
- Tell you which task is next and in what order
- Extract the exact prompt to give Kiro for each task
- Identify exactly which doc sections Kiro needs
- Diagnose what went wrong when something breaks
- Decide if a feature is V1 scope or V2+ scope
- Validate that Kiro's output matches what was expected

**Claude does NOT:**
- Write production code that goes directly into your repo
- Give you concept explanations (that is ChatGPT's job)
- Know your personal preferences or daily schedule
- Make business decisions

**The test for using Claude correctly:**
> You come with a specific question about the FinSight project.
> You leave with a specific, actionable answer.
> If you're leaving with a general concept lesson, you used the wrong tool.

---

### 1.2 KIRO — The Builder

**Kiro's job:**
- Write code based on a precise, focused prompt
- Create exactly the files specified in the prompt
- Stop when the prompt ends
- Follow the Kiro Prompt format exactly

**Kiro does NOT:**
- Make architectural decisions
- Add features that aren't in the prompt
- Know what other parts of the system look like
- Receive full documentation dumps
- Plan anything

**The test for using Kiro correctly:**
> You give Kiro a prompt for ONE task.
> Kiro delivers ONE thing — the specific file(s) asked for.
> Kiro stops.
> If Kiro is building multiple features at once, you gave it too much.

**Why Kiro needs restricted context:**

When you give Kiro 50,000 tokens of documentation, something bad happens.
Kiro tries to reconcile everything it knows into the current task.
It adds security features you're not ready for yet.
It adds Redis queues you won't need until V4.
It adds V2 features that break because V1 isn't stable.
The more context Kiro has, the more it hallucinates helpful-looking additions.

**The fix: a scalpel, not a library.**

---

### 1.3 CHATGPT — The Teacher

**ChatGPT's job:**
- Explain programming concepts you don't understand
- Interpret error messages in plain language
- Teach you how a technology works (React, FastAPI, Pydantic, SQL, etc.)
- Help you understand code Kiro wrote that you can't read

**ChatGPT does NOT:**
- Know anything about FinSight's architecture
- Receive your project files or doc content
- Decide what to build or how to build it
- Replace Claude for project decisions

**The most important rule about ChatGPT:**

```
ChatGPT gets ZERO FinSight project context. Ever.

WRONG:  "Here is my TECH_STACK.md. Explain it and tell me
         what I should build next."

WRONG:  "Here is my upload route code. What is wrong with it?"

RIGHT:  "What does a 422 HTTP error mean and what causes it?"

RIGHT:  "I'm learning Pydantic validation. How does it work?
         Show me a simple example."

RIGHT:  "What is the difference between async and sync functions
         in Python? When would I use each?"
```

**Why this rule exists:**
When ChatGPT has your project context, it starts making suggestions
that conflict with your architecture decisions. It doesn't know why
you made certain choices. Its suggestions will cause you to change
working code based on incorrect reasoning. Keep it generic.
Use Claude for anything project-specific.

---

### 1.4 YOU — The Builder-in-Chief

**Your job:**
- Choose the next task from V1_EXECUTION_TASKS.md
- Prepare the correct context package for Kiro
- Write the tasks marked "Owner: You"
- Run every verification check completely
- Make the final call on every decision
- Control which tool is active at any moment

**You do NOT:**
- Skip verification checks because "it looks fine"
- Accept Kiro output without reading it
- Let any tool make decisions you haven't understood
- Build V2 features because they seem "quick"
- Start a new task when you have less than 30 minutes

---

## PART 2 — COMMUNICATION PLAYBOOK

### 2.1 How to Talk to Claude

**The standard prompt pattern for Claude:**

```
TEMPLATE:
"I'm on Task [NUMBER] — [TASK NAME] from V1_EXECUTION_TASKS.md.
[ONE specific question or need]
[Only include if relevant: exact error message, database state,
 or specific line of code causing the problem]"
```

**Example prompts to Claude (these are good):**

```
ASKING FOR NEXT TASK:
"I just completed Task 06 and the verification passed.
What is Task 07 and what do I need to prepare to give Kiro?"

ASKING FOR KIRO PROMPT:
"I'm about to start Task 13 — Upload Modal.
Can you confirm the exact prompt to give Kiro and which doc
sections I need to extract?"

ASKING TO DIAGNOSE A PROBLEM:
"I'm on Task 10 — Upload BFF Route.
The route returns 200 but the transaction never appears in Supabase.
The receipts table shows the row with status='pending' even after
the FastAPI call completes. What should I check?"

ASKING SCOPE QUESTIONS:
"I want to show users their subscription costs as a summary card.
Is this in V1 scope or V2?"

ASKING TO VALIDATE OUTPUT:
"Kiro built the Upload Modal for Task 13. Here is what it returned:
[paste relevant part of Kiro's output]
Does this match what V1_EXECUTION_TASKS.md expects for this task?"
```

**Example prompts to Claude (these are wrong):**

```
TOO VAGUE:
"Something is broken. Help."
→ Claude cannot help without: which task, exact error, what you tried.

WRONG TOOL:
"Explain how Pydantic works"
→ That is ChatGPT's job. Concepts are ChatGPT. Project decisions are Claude.

TOO BROAD:
"Build the entire upload system for me"
→ Claude plans. Kiro builds. This request belongs to Kiro,
  split into individual task prompts.

OUT OF SCOPE:
"Can you design the V3 tax export feature?"
→ You are in V1. V3 features are not the current focus.
  Ask Claude this only when you start V3.
```

---

### 2.2 How to Talk to Kiro

**The Kiro Prompt Formula — use this structure every time:**

```
STRUCTURE:
  [1 sentence: what you are building]
  FILE: [exact file path(s)]
  [Exact requirements, bullet by bullet]
  USE: [specific dependencies already in the project]
  DO NOT: [explicitly list any V2+ features to exclude]
  OUTPUT: [exact deliverable].
  STOP. Do not create any other files.
```

**Example of a CORRECT Kiro prompt:**

```
Build the IntelligenceMeter component for FinSight's dashboard.

FILE: src/components/dashboard/IntelligenceMeter.tsx

This is a 'use client' component.
Props: { totalReceipts: number }

Show a horizontal progress bar:
- Level 1 (0–2 receipts): 15% fill, amber pulse animation (CSS only)
- Level 2 (3–5 receipts): 40% fill
- Level 3 (6–9 receipts): 70% fill
- Level 4 (10+ receipts): 100% fill, shimmer animation (CSS only)

Visual:
- Container: full width, height 8px, rounded, rgba(255,255,255,0.1)
- Fill: #FFD166 (amber)
- Label row above: "Intelligence Level [N]" on left + status on right
  - Level 1: "System Learning"
  - Level 2: "Patterns Forming"
  - Level 3: "Analysis Active"
  - Level 4: "Full Intelligence"

Use: Tailwind CSS only. No Framer Motion.
DO NOT add: click handlers, tooltips, settings, or any API calls.

OUTPUT: Complete IntelligenceMeter.tsx file.
STOP. Do not create any other files.
```

**Example of an INCORRECT Kiro prompt:**

```
Build the dashboard with the intelligence meter, KPI cards, transaction
list, upload button, and make sure it all connects to the API.
Also add nice animations and make it look good like the design system says.

[THIS IS WRONG BECAUSE:]
- Multiple features in one prompt
- Vague requirements ("look good")
- No specific file paths
- No STOP instruction
- Will produce 500+ lines across multiple files that are hard to verify
```

---

### 2.3 How to Talk to ChatGPT

**Use ChatGPT only for these three purposes:**

```
PURPOSE 1: Understanding a concept
"Explain [technology/concept] simply. Small example only.
No need to know my project."

PURPOSE 2: Decoding an error
"I got this error: [paste exact error message].
What does it mean and what typically causes it?"

PURPOSE 3: Understanding code
"Can you explain what this code does line by line:
[paste isolated code snippet — no surrounding context]"
```

**ChatGPT prompt examples (correct):**

```
"I don't understand what Row Level Security in PostgreSQL is.
Explain it simply like I'm new to databases."

"I got this Python error:
'pydantic.error_wrappers.ValidationError: 1 validation error for OCROutput
raw_confidence: ensure this value is greater than or equal to 0 (type=value_error.number.not_ge; limit_value=0)'
What does this mean?"

"What is the difference between useEffect and useCallback in React?
When would I use each?"

"Explain what base64 encoding is and why developers use it to send images."
```

---

## PART 3 — EXECUTION FLOW

This is the step-by-step procedure you follow for every task.
Follow every step in order. Do not skip any step.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — SELECT THE TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Open your task tracker.
Find the next task with status "○ Not started".
Open V1_EXECUTION_TASKS.md.
Read the task's "Context" section completely.

ASK YOURSELF: "Do I understand what this builds and why?"

If NO → go to STEP 1A (learn the concept)
If YES → go to STEP 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1A — LEARN THE CONCEPT (ChatGPT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Open ChatGPT.
Ask: "Explain [concept from the task] simply."
No project context. Concepts only.
Return to STEP 1 when you understand it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — CHECK THE TASK OWNER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read the "Owner:" field in the task.

Owner: You   → You write this code directly. Skip to STEP 5.
Owner: Kiro  → Go to STEP 3.

Tasks marked "Owner: You" involve:
  - Sessions, auth, security checks
  - API routes that read user identity from cookies
  - AI client integrations (OCR, categorization)
  - Pipeline orchestration
  - Deployment and infrastructure
  These must be written by you. They involve concepts that Kiro
  can hallucinate dangerously in security-sensitive contexts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — PREPARE THE KIRO CONTEXT PACKAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read the task's "Docs to Give Kiro" list.
For each doc + section listed:
  1. Open the document
  2. Find that section
  3. Copy ONLY that section (not the whole document)
  4. Paste it into a blank text file or note

This is your "context package" — it goes above the Kiro prompt.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — GIVE KIRO THE PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Open Kiro.
Paste: [Context package] + [Kiro Prompt from the task]
Give it to Kiro.

DO NOT interrupt Kiro while it generates.
DO NOT say "also add..." while Kiro is working.
Wait for Kiro to finish and stop.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — REVIEW KIRO'S OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before copying anything into your project, read what Kiro produced.

CHECK:
□ Did Kiro create only the files listed in the prompt?
□ Did Kiro add any features NOT in the requirements?
□ Are all imports pointing to packages that exist in your project?
□ Does it match what V1_EXECUTION_TASKS.md described?

If Kiro added extra features not in the prompt:
  Do NOT work with the extra code.
  Re-prompt Kiro: "Your previous response added [X] which I did not ask for.
  Please redo the task WITHOUT [X]. Here is the original prompt: [paste again]"

If everything looks correct:
  Copy Kiro's output into the correct file paths in your project.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — RUN THE VERIFICATION CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Open the task's "✅ VERIFY" section.
Run each check listed.
Every single one. Not "most of them."

ALL PASS → go to STEP 7.
ANY FAIL → go to STEP 6A (debug).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6A — DEBUG (See Part 6 for full protocol)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Follow the Error Handling System in Part 6.
Do not randomly change code hoping something works.
Do not move to the next task until all checks pass.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — COMMIT AND UPDATE TRACKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
git add .
git commit -m "feat: task [N] - [task name]"

Update your task tracker:
  Change task status from "⟳ In progress" to "✓ Complete"
  Write the date completed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8 — SELECT NEXT TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return to STEP 1.
If you have less than 30 minutes left in your session: STOP.
Commit. Close your tools. Start fresh next session.
```

---

## PART 4 — DOCUMENT DISTRIBUTION RULES

### 4.1 The Master Rule

```
Kiro receives the MINIMUM information needed to complete one task.
Every extra sentence in Kiro's context is a hallucination opportunity.
```

### 4.2 What NEVER Goes to Kiro

These documents contain information that will cause Kiro to build
features you are not ready for, in the wrong place, at the wrong time.

```
NEVER GIVE KIRO:

SECURITY.md
  → Kiro will add auth middleware, secret validation, and CORS config
    to components that don't need them. It will get the layers wrong.

SCALABILITY.md
  → Kiro will add Redis queues, connection pooling, and caching
    to a system serving 0 users. You don't need this yet.

AI_STACK.md
  → Kiro will attempt to implement multi-model pipelines and LangGraph
    routing in a single component task.

INFRA.md
  → Kiro will add monitoring, CI/CD, and deployment infrastructure
    to frontend components that have nothing to do with deployment.

PRODUCT_EVOLUTION.md
  → Kiro will build V2 and V3 features because they sound good.
    These features break because V1's data doesn't exist yet.

The FULL PRD
  → Kiro will try to build the entire product vision in one task.

V1_EXECUTION_TASKS.md
  → Kiro will try to execute all 17 tasks simultaneously.
    Never give Kiro the orchestration document.
```

### 4.3 How to Extract a Doc Section

This is the exact process to prepare Kiro's context package.

```
EXAMPLE: Preparing context for Task 06 (NVIDIA NIM OCR Client)

Task says: "Docs to Give Kiro: TECH_STACK.md → Section 6.1 (OCR Layer)"

Step 1: Open TECH_STACK.md in your text editor
Step 2: Search for "## 6.1 OCR Layer"
Step 3: Copy from that heading to the start of "## 6.2 Categorization Layer"
        (stop before the next section begins)
Step 4: Open a blank note/doc
Step 5: Paste the copied section
Step 6: Below it, paste the Kiro Prompt from the task
Step 7: That note is what you give to Kiro

WHAT YOU DO NOT COPY:
× Section 6.2 (that is a different task)
× Section 12 (cost optimization — not relevant here)
× Any scaling, security, or infra content
× Headers or introductory paragraphs outside the section
```

### 4.4 Context Package Size Guide

```
RIGHT-SIZED KIRO CONTEXT:

UI Component task      →  150–400 tokens of doc context
  (design colors, component specs)

AI Client task         →  300–600 tokens of doc context
  (one tech stack section + one prompt strategy section)

Backend route task     →  Owner: You — not given to Kiro

Infrastructure task    →  Owner: You — not given to Kiro

RED FLAG:
If you're preparing more than 1,000 tokens of context for a single
Kiro task, you are either combining tasks or giving too much.
Stop. Reduce the context to only what is explicitly listed in the task.
```

---

## PART 5 — DAILY WORKFLOW PLAN

### 5.1 The Standard Build Session (2–3 hours)

```
─────────────────────────────────────────────────────────────────
OPENING (15 minutes)
─────────────────────────────────────────────────────────────────
1. Open your task tracker
   → Identify exactly where you stopped
   → Mark the current task as "⟳ In progress"

2. Read the task's Context section from V1_EXECUTION_TASKS.md
   → If you don't understand something: ChatGPT (concept question only)

3. Optional 2-minute Claude check-in:
   "I'm starting Task [N] today. Anything to watch for?"
   → Claude answers or says "proceed as documented"
   → This is optional — only do it if you have a specific concern

─────────────────────────────────────────────────────────────────
EXECUTION (90–120 minutes)
─────────────────────────────────────────────────────────────────
Work through 1–3 tasks using the Execution Flow (Part 3).

Target pace:
  Kiro component tasks:  20–40 min per task
    (prepare context → prompt → review → integrate → verify)

  Owner:You coding tasks:  30–60 min per task
    (read → understand → write → test → verify)

  Infrastructure tasks:  45–90 min per task
    (dashboard configuration, OAuth setup, deployment)

─────────────────────────────────────────────────────────────────
CLOSING (15 minutes)
─────────────────────────────────────────────────────────────────
1. Run any pending verification checks
2. Commit all completed work:
   git commit -m "feat: task [N] - [name]"
3. Update your task tracker (mark ✓ Complete or ✗ Blocked)
4. Write 2 sentences in your tracker notes:
   "Today I built: [what]"
   "Tomorrow I will build: [what]"
5. Close all tools
   → Do not leave Kiro conversations open
   → Do not start reading V2 docs "just to prepare"
```

### 5.2 Task Targets Per Session

```
SESSION TYPE          TASKS EXPECTED    NOTES
─────────────────────────────────────────────────────────
First session         Task 00 only      Bootstrap is substantial
Standard session      2–3 tasks         Verification included
Debugging session     0–1 tasks         You spend the time fixing
Deployment session    1 task            Tasks 16–17 need full attention
Integration test      1 task (Task 15)  Give it a full session
```

### 5.3 STOP CONDITIONS — Stop Working When Any of These Are True

```
STOP IMMEDIATELY AND COMMIT WHEN:

□ You have been stuck on the same error for 30 consecutive minutes
  → Stop. Write down the exact error. Fresh session tomorrow.
  → Sleeping on it resolves 40% of technical blocks.

□ A verification check has failed twice with different approaches
  → Stop. Bring the exact error to Claude next session.
  → Do not keep trying random fixes.

□ You are thinking: "Let me add this feature quickly while I'm here"
  → HARD STOP. That thought is the beginning of scope creep.
  → Log the idea. Check with Claude if it is V1. Build it in order.

□ You are copy-pasting code without understanding what it does
  → Stop. Ask ChatGPT to explain the pattern.
  → Code you don't understand is a bug you can't fix.

□ You have less than 30 minutes remaining in your session
  → Do not start a new task.
  → Commit what is complete. Stop cleanly.

□ You are on your third cup of coffee and it is past midnight
  → Go to sleep. The bug will still be there tomorrow.
  → Tired debugging produces worse bugs than the original.
```

### 5.4 Weekly Progress Check

Every Friday (or end of your build week):

```
5-MINUTE WEEKLY REVIEW:

□ Count tasks with ✓ Complete status
  Healthy pace: 8–12 tasks per week (2–3/day × 3–4 days)

□ List all tasks with ✗ Blocked status
  For each blocker: write the exact question to bring to Claude
  Schedule a 15-minute Claude session to clear all blockers

□ Check: are all completed tasks git committed?
  git log --oneline | head -20
  One commit per task, in order

□ Set goal: which 3 tasks will you complete next week?
  Write them in your tracker. Commit to the order.
```

---

## PART 6 — ERROR HANDLING SYSTEM

### 6.1 The Debug Protocol (Always Follow in This Order)

```
WHEN SOMETHING BREAKS:

BEFORE ANYTHING ELSE:
  Write down the EXACT error message.
  "It doesn't work" is not actionable.
  "TypeError: Cannot read properties of undefined (reading 'amount')"
  on line 47 of TransactionFeed.tsx is actionable.

─────────────────────────────────────────────────────────────────
CHECK 1: The Database (2 minutes)
─────────────────────────────────────────────────────────────────
Open Supabase → Table Editor

Find the specific row that should exist after this action.
Read the status column. Read the values.

If the data is WRONG in the database:
  → The problem is in the pipeline (FastAPI, OCR, DB write)
  → Do not debug the UI — the data is the source of truth

If the data is CORRECT in the database:
  → The problem is in the frontend reading it
  → Check the API route response, then the component

─────────────────────────────────────────────────────────────────
CHECK 2: The Network Tab (2 minutes)
─────────────────────────────────────────────────────────────────
Open browser → DevTools (F12) → Network tab
Trigger the action that is failing
Find the failing request
Read the HTTP status code and response body

Status code tells you WHICH LAYER broke:

  401 → Session/auth problem. Check cookie, check getSession().
  400 → Validation error. Wrong data was sent.
  402 → Free tier limit hit. Check total_receipts_uploaded.
  422 → FastAPI rejected the request. Check:
         - OCR confidence below 0.30
         - Pydantic model validation failed
         - UUID format wrong in request body
  500 → Server error. Check Railway logs (next step).
  CORS error → ALLOWED_ORIGINS is wrong in Railway.
  Network error → FastAPI is not running or Railway is down.

─────────────────────────────────────────────────────────────────
CHECK 3: The Logs (3 minutes)
─────────────────────────────────────────────────────────────────
FastAPI errors → Railway dashboard → your service → Logs tab
Next.js errors → Vercel dashboard → your project → Functions tab
                 OR: your terminal (npm run dev output)
Database errors → Supabase dashboard → API section → Logs

Look for:
  - The exact exception type and message
  - The file name and line number
  - Any traceback that shows the call chain

─────────────────────────────────────────────────────────────────
CHECK 4: TypeScript (1 minute)
─────────────────────────────────────────────────────────────────
Run: npx tsc --noEmit

TypeScript errors often ARE the runtime error.
A type mismatch caught here prevents a confusing undefined error later.

─────────────────────────────────────────────────────────────────
AFTER THESE FOUR CHECKS:
─────────────────────────────────────────────────────────────────
You now have:
  - The exact error message
  - The HTTP status (which layer broke)
  - The server log (what FastAPI said)
  - The TypeScript status

THIS is the information to bring to Claude or ChatGPT.
Not before. Not with just "it's broken."
```

### 6.2 Which Tool to Use for Which Error

```
USE CHATGPT WHEN:
  → You don't understand what the error message means
  → You want to learn how a technology works conceptually
  → You don't understand the code pattern Kiro wrote

  Template: "I got this error: [paste error].
             What does it mean and what typically causes it?"

USE CLAUDE WHEN:
  → You understand the error but don't know how to fix it in FinSight
  → You need a project-level decision (is this a V1 issue?)
  → You have the database state + error + logs and need a diagnosis
  → The same task has been broken for more than 30 minutes

  Template: "I'm on Task [N]. Here is what went wrong:
             Error: [paste error]
             Database state: [paste relevant rows]
             Logs: [paste relevant log lines]
             What is wrong and what should I fix?"

USE NEITHER — FIX IT YOURSELF WHEN:
  → You checked the database and a row is simply missing a field
    → Add the field in the insert statement
  → The TypeScript error says a property doesn't exist on a type
    → Add the property to the type definition in api.ts
  → The verification check says "should redirect to /dashboard"
    and it redirects to /auth instead
    → Your session cookie isn't being set — check the auth callback route

DO NOT RANDOMLY CHANGE CODE WHEN:
  → You don't know what the change does
  → You are changing 3 things at once to see if one works
  → You are deleting code that "seems unrelated" to see if it helps
```

### 6.3 The 30-Minute Rule

```
If you have been debugging the same problem for 30 minutes
without a clear hypothesis, STOP.

Do:
  1. Write one sentence: exactly what is wrong
  2. Write one sentence: exactly what you have tried
  3. Write one sentence: the exact error you are seeing
  4. Commit your current work-in-progress
  5. Close everything
  6. Start fresh next session with this documented problem

Why:
  After 30 minutes of confusion, your debugging becomes less structured.
  You start making multiple changes at once.
  You start forgetting which change did what.
  Fresh eyes + a documented problem = faster resolution.
```

---

## PART 7 — CONTROL RULES

### 7.1 How to Prevent Kiro Hallucination

Hallucination = Kiro inventing features, patterns, or integrations
not in your prompt. It always looks helpful. It is always wrong
for your specific system.

```
THE 5 ANTI-HALLUCINATION RULES:

RULE 1: One task = one prompt. Never combine.
  Kiro builds exactly one thing per prompt.
  If you want two components: two separate Kiro sessions.
  Each session is independent. Kiro does not remember the last one.

RULE 2: STOP instruction is non-negotiable.
  Every Kiro prompt ends with exactly:
  "OUTPUT: [specific deliverable]. STOP. Do not create any other files."
  Without STOP, Kiro continues building things you did not ask for.

RULE 3: Review before integrating.
  Read every file Kiro produces BEFORE adding it to your codebase.
  Check for: unexpected files, extra imports, features not in requirements.
  If Kiro added something you didn't ask for: re-prompt, don't use it.

RULE 4: Minimal context = minimal hallucination.
  The right amount of context for each task is specified in the task doc.
  Do not add more. More context = more conflicting information = more invention.

RULE 5: Correct hallucinations the same session.
  If Kiro adds a feature not in the prompt, correct it immediately.
  "Your previous output included [X] which I did not ask for.
   Please rewrite the file WITHOUT [X]."
  Do not build on top of hallucinated features.
```

### 7.2 How to Prevent Overbuilding

```
OVERBUILDING SYMPTOMS (recognize these thoughts):
  "I'll add this quick feature while I'm in this file"
  "The V2 feature is simple — I'll add it now and save time later"
  "I know this isn't in V1 but it's only 10 lines"
  "This V2 component depends on V1 anyway so I might as well..."

THE RESPONSE TO EVERY OVERBUILDING THOUGHT:
  Stop.
  Ask Claude: "I want to add [feature]. Is it in V1 scope?"
  Claude will answer: "V1" or "V2/V3 — here is why."
  If V2 or later: add the idea to a V2 ideas list. Build it when you get there.
  If V1: find the exact task number. Execute it in order. Not now.

WHY THIS MATTERS:
  V2 features built in V1 create three problems:
  1. They often require data that doesn't exist until V1 runs for 30 days
  2. They add code you can't debug because V1 isn't stable yet
  3. They delay V1 shipping, which delays real user feedback
     which is the only way to know what V2 should actually be
```

### 7.3 The V1 Scope Boundary

```
IN V1 SCOPE — only these features:

  □ Project bootstrap and folder structure
  □ Supabase: database, auth, storage
  □ Email + Google OAuth login and signup
  □ Receipt upload (file to Supabase Storage)
  □ OCR extraction (NVIDIA NIM → merchant, amount, date, confidence)
  □ Transaction categorization (Groq → 12 categories)
  □ Database writes (transaction + receipt status + receipt count)
  □ Intelligence level progression (1–4 based on receipt count)
  □ Dashboard: KPI cards (total spend, top category, receipt count)
  □ Dashboard: Transaction feed (last 8 transactions)
  □ Intelligence Meter (visual progress indicator)
  □ Upload modal (IDLE → PREVIEW → PROCESSING → RESULTS)
  □ AppShell and Sidebar navigation
  □ Dashboard summary API route
  □ FastAPI /analyze/receipt endpoint
  □ End-to-end integration test
  □ Deploy FastAPI to Railway
  □ Deploy Next.js to Vercel

NOT IN V1 — (V2, V3, V4, V5):

  V2: Insights page, Health Score, category correction, monthly email,
      referral system, receipt detail page, receipts list page

  V3: Subscription detector, spending forecast, budget alerts,
      income awareness, tax export PDF

  V4: Redis queue, async processing, materialized views,
      merchant intelligence cards, natural language search

  V5: AI Spending Coach, business workspace, vector search,
      multi-agent orchestration
```

---

## PART 8 — EXECUTION DASHBOARD

### 8.1 Your Task Tracker

Copy this into Notion, Google Sheets, or a plain text file.
This is your single source of truth for V1 progress.

```
FINSIGHT V1 — TASK TRACKER
Last updated: [date]

TASK  NAME                                  OWNER   STATUS         DATE DONE   NOTES
────  ──────────────────────────────────────────────────────────────────────────────────
 00   Project Bootstrap                     Kiro    ○ Not started
 01   Supabase Project Setup                You     ○ Not started
 02   Database Schema + RLS                 You     ○ Not started
 03   Authentication Page                   Kiro    ○ Not started
 04   Auth Callback Route                   You     ○ Not started
 05   X-Internal-Secret Middleware          You     ○ Not started
 06   NVIDIA NIM OCR Client                 You     ○ Not started
 07   Groq Categorization Client            You     ○ Not started
 08   Pipeline Orchestrator + DB Write      You     ○ Not started
 09   FastAPI /analyze/receipt Endpoint     You     ○ Not started
 10   Next.js Upload BFF Route              You     ○ Not started
 11   Dashboard Summary API Route           You     ○ Not started
 12   AppShell + Sidebar                    Kiro    ○ Not started
 13   Upload Modal Component                Kiro    ○ Not started
 14   Dashboard Page + KPI + Feed          Kiro    ○ Not started
 15   End-to-End Integration Test           You     ○ Not started
 16   Deploy FastAPI to Railway             You     ○ Not started
 17   Deploy Next.js to Vercel              You     ○ Not started

STATUS CODES:
  ○ Not started
  ⟳ In progress (active right now)
  ✓ Complete (all verification checks passed)
  ✗ Blocked (add one-sentence note about what's blocking)
```

### 8.2 Status Update Protocol

```
WHEN TO UPDATE STATUS:

Start of session:
  → Change "○ Not started" to "⟳ In progress"

Verification passes:
  → Change "⟳ In progress" to "✓ Complete"
  → Add the date
  → Write a one-line note if you solved something non-obvious

Stuck for 30+ minutes:
  → Change "⟳ In progress" to "✗ Blocked"
  → Write exactly what is blocking you (one sentence)
  → This note becomes your question for Claude

IMPORTANT:
  Never move to the next task while the current task is ✗ Blocked.
  Clear the blocker first. Ask Claude with the exact blocker note.
```

### 8.3 V1 Completion Signals

You have completed V1 when ALL of these are true:

```
TECHNICAL COMPLETION:
  □ All 17 tasks have ✓ Complete status
  □ All verification checks from Task 15 pass
  □ FastAPI /health returns all providers healthy
  □ Secret audit finds zero AI keys in frontend code
  □ Site is live at your Vercel URL

FUNCTIONAL COMPLETION:
  □ You can photograph a real receipt and upload it
  □ OCR extracts the merchant name and amount correctly
  □ The category is assigned correctly for common merchants
     (Swiggy → Food & Dining, Uber → Transportation, etc.)
  □ The transaction appears in your dashboard within 5 seconds
  □ The Intelligence Meter advances when you upload more receipts
  □ KPI cards show real numbers after 3+ receipts

V1 → V2 TRANSITION:
  When all boxes above are checked:
  → Ask Claude: "V1 is complete. What is the first task in V2?"
  → Claude will reference PRODUCT_EVOLUTION.md and V2 priorities
  → Do NOT start V2 until V1 is confirmed complete in production
```

---

## QUICK REFERENCE — THE 5 CARDS

Keep these visible during every build session.

```
┌────────────────────────────────────────────────────────────────┐
│ CARD 1: WHICH TOOL DO I OPEN?                                  │
│                                                                │
│ I need to BUILD something → V1 tasks doc → Owner:You or Kiro  │
│ I need to UNDERSTAND a concept → ChatGPT                       │
│ I need to DECIDE something about the project → Claude          │
│ I need to DECODE an error → ChatGPT first, Claude if needed    │
│ I need to VERIFY my work → Run the task's verify checks        │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ CARD 2: WHAT DO I GIVE KIRO?                                   │
│                                                                │
│ GIVE:  The exact Kiro Prompt from the task                     │
│        Only the doc sections listed under "Docs to Give Kiro"  │
│                                                                │
│ NEVER: SECURITY.md · SCALABILITY.md · AI_STACK.md · INFRA.md  │
│        PRODUCT_EVOLUTION.md · Full PRD · V1_EXECUTION_TASKS.md │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ CARD 3: SOMETHING BROKE — IN ORDER                             │
│                                                                │
│ 1. Write the exact error message (30 seconds)                  │
│ 2. Check Supabase: is the data correct? (2 min)                │
│ 3. Check Network tab: what HTTP status? (2 min)                │
│ 4. Check Railway/Vercel logs (3 min)                           │
│ 5. ChatGPT: explain the error concept                          │
│ 6. Claude: task + exact error + database state                 │
│ 7. Still stuck 30 min? STOP. Document. Tomorrow.               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ CARD 4: V1 SCOPE GUARD                                         │
│                                                                │
│ Before building anything, ask:                                 │
│ "Is this in V1_EXECUTION_TASKS.md?"                            │
│                                                                │
│ YES → find the task number → build it in order                 │
│ NO  → ask Claude which version → log it for later              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ CARD 5: STOP CONDITIONS                                        │
│                                                                │
│ STOP when you:                                                 │
│ • Have been on the same error for 30 minutes                   │
│ • Are thinking "I'll add this quick feature"                   │
│ • Have less than 30 minutes left in your session               │
│ • Are copying code you don't understand                        │
│ • Are making multiple random changes hoping one works          │
└────────────────────────────────────────────────────────────────┘
```

---

## ONBOARDING CHECKLIST

Before your very first task, verify all of this is true:

```
TOOLS:
□ Claude account is open (claude.ai)
□ Kiro account is set up and working
□ ChatGPT account is open (chatgpt.com)
□ V1_EXECUTION_TASKS.md is saved and accessible

PROJECT PREREQUISITES:
□ NVIDIA NIM API key obtained (build.nvidia.com)
□ Groq API key obtained (console.groq.com)
□ Google Cloud OAuth credentials created
   (needed for Supabase Google auth in Task 01)
□ .env.local and fastapi/.env files created
□ Both .env files are in .gitignore
□ Task tracker is created (copy from Part 8)

MINDSET:
□ You understand V1's goal in one sentence:
   "Real receipt → dashboard transaction"
□ You know that V2 does not exist for you yet
□ You know that every completed task needs a verification check
□ You have a 2-hour uninterrupted window for your first session
```

---

*End of FinSight TOOL_ORCHESTRATION_SYSTEM.md v1.0.0*

*One task at a time. One verification at a time. One commit at a time.*
*The system works when you follow it. It breaks when you skip steps.*
*You are the builder-in-chief. The tools work for you.*
*Not the other way around.*
