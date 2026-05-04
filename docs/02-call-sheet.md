# Call Sheet

The daily driver, and the first step in the order of operations. Tracks both calls coming in and calls you need to make.

## What you see (the table)

| Column | What it shows |
|--------|---------------|
| Contact | The person on the other end of the call |
| Subject | What the call is about (free text) |
| Call to/for | Which team member the call is for |
| Re: Client | Which client the call is regarding (if any) |
| Status | `to call`, `incoming`, `left word`, `returning`, or `connected` |
| Phone | The number being used (cell, office, home, etc.) |
| Email | Email of the contact |
| Due Date | When the call needs to happen |
| Last Updated | Last time the row changed |

You can sort by **Status**, **Due Date**, and **Last Updated** by clicking the column header.

## Filters and search

- **Search box** — searches contacts and clients
- **Status filter** — narrows to a specific call status
- **Select all** checkbox — for bulk actions

## Logging a new call

Hit **+ New Call** in the bottom-right corner of any page (or press `⌘J` / `Ctrl+J`). A side panel slides in. Fill in:

| Field | Required? | What it's for |
|-------|-----------|---------------|
| Contact | Recommended | The person on the call. Pick from the contacts list, or use the search to find them fast |
| Preferred Phone | Optional | Which of their numbers (cell / office / home / other / custom). If "custom," type the number directly |
| Subject | **Required** | One-line description of what the call is about |
| Call to/for | Optional | Which team member this call is assigned to |
| Status | **Required** (defaults to "to call") | Where this call is in the lifecycle |
| Re: Client | Optional | If the call is about a specific client, pick them. This makes the call show up on that client's Calls tab |
| Due Date | Optional | When you need to make the call by |
| Log Time | Optional | When the call actually happened — set this once it's done |
| Notes | Optional | Rich-text notes. The "about" detail Shuman used to capture in a separate field lives here now |

The panel auto-saves as you go.

## Status meanings

| Status | When to use it |
|--------|----------------|
| **to call** | Queued — you need to make this call |
| **incoming** | Someone called in and you're tracking it |
| **left word** | You called, didn't reach them, left a message |
| **returning** | They called you and you're returning the call |
| **connected** | The call happened and is done |

## Priority

Calls can be flagged **high / medium / low**. Use this to triage what to make first.

## What comes next

A call often leads to a [Submission](./03-submissions.md) — you ask if a contact has anything open, they do, you send material. Logging the call with a `Re: Client` value makes it easy to find the call later from the client's page when you're following up.
