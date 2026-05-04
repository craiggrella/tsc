# Submissions

The most important section in the app, and step two in the order of operations. Tracks every time client material goes out to someone.

A submission ties together five things:

- A **client** (whose material is going out)
- A piece of **material** belonging to that client
- One or more **projects** the submission is for
- A **person** (contact) you're sending it to
- A **response** from that person, once they read it

When you fill those in, the submission shows up on each of those records' pages automatically.

## What you see (the table)

| Column | What it shows |
|--------|---------------|
| Date | When the submission went out |
| Status | `need to send`, `sent`, or `connected` |
| Clients | Which client(s) the material is from |
| People | Which contact(s) it went to |
| Reason | The general reason for the submission |

## Filters and search

- **Search** — searches across clients, people, and reasons
- **Status filter** — narrow to a specific status

## Creating / editing a submission

The detail page is split into a top section (the submission itself) and a bottom section (the items inside it).

### Top section

| Field | Required? | What it's for |
|-------|-----------|---------------|
| Status | **Required** (defaults to "need to send") | Where the submission is in the lifecycle |
| Date | Optional | When it went out |
| Reason | Optional | Multi-select: `general`, `meeting`, `staffing`, `at their request`, `spec script`, `development` |
| Notes | Optional | Rich-text notes about the submission as a whole |

### Items (the actual material going out)

A single submission can include multiple items. For each item, fill in:

| Field | Required? | What it's for |
|-------|-----------|---------------|
| Client | **Required** | Pick the client whose material is going out (single-select) |
| Material | **Required** | Auto-filtered to material belonging to the client you picked. Single-select |
| Projects | Optional | Multi-select. Which projects this is being submitted for |
| Person | **Required** | The contact you're sending it to (single-select from Contacts) |
| Response | Optional | `love`, `like`, `meh`, `hate`. Fill this in once they get back to you |
| Notes | Optional | Per-item notes |

## Status meanings

| Status | When to use it |
|--------|----------------|
| **need to send** | Submission is queued but hasn't gone out yet |
| **sent** | Material is out — waiting on a response |
| **connected** | The recipient responded (or the submission led to a meeting) |

## Why this matters

The whole point of tracking submissions this way is that later, when you open a client's page, you can see every person who ever read their material and what those people thought. Same on a contact's page — you can see everything you've ever sent that person and how they reacted. The data flows because the relationships are filled in.

## What comes next

A `love` or `like` response usually leads to a [Meeting](./04-meetings.md). When you set one, link the same client(s), contact, and project so the meeting shows up alongside the submission across the app.
