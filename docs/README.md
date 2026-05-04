# The Shuman Company App — User Guide

This is the user guide for the TSC app. It covers what the app is, how to get around, and what every section does.

## What this app is

The Shuman Company represents writers, directors, and other creators. The core of the business is a four-step loop:

> **Call → Submission → Meeting → Contract**

You **call** people on projects to gauge interest. When there's an opening, you **submit** a client's material. If they love it, you set a **meeting**. If the meeting goes well, you negotiate a deal and sign a **contract**.

This app is the workspace for that whole loop. It tracks:

- **Calls** going in and out
- **Submissions** of client material to people on specific projects
- **Meetings** between clients and industry contacts
- **Contracts** (planned — see note below)
- **Clients** (the writers, directors, and other creators Shuman represents)
- **Client Material** (scripts, samples, reels, decks, treatments)
- **Contacts** (executives, assistants, anyone you call or pitch to)
- **Companies** (studios, networks, prodcos, agencies, etc.)
- **Projects** (shows and films material is going out for)
- **Files** (a Box-backed file browser)

Everything is interconnected. A submission ties together a client, a piece of material, the contact you sent it to, the company they work at, and the project it was for. Once you fill in the relationships, the data shows up everywhere it should — on the client's page, the contact's page, the project page, all of it.

## How it works (the short version)

1. **Log a call** when you talk to someone, or queue one up to make.
2. **Log a submission** when client material goes out for a project.
3. **Set a meeting** when a contact wants to meet a client.
4. **Sign a contract** when a deal closes. *(Contracts exist in the data model but the UI for them is not yet built.)*
5. **Manage the supporting records** (clients, contacts, companies, projects, material) so the dropdowns above have something to point at.

## Sections

The sidebar on the left mirrors the order of operations: Call Sheet, Submissions, Meetings, then everything that supports them.

| # | Section | What it's for |
|---|---------|---------------|
| 1 | [Dashboard](./01-dashboard.md) | Snapshot of upcoming meetings and recent calls |
| 2 | [Call Sheet](./02-call-sheet.md) | Calls in and calls out — the daily driver |
| 3 | [Submissions](./03-submissions.md) | Material going out, who got it, how they responded |
| 4 | [Meetings](./04-meetings.md) | Meetings between clients and contacts |
| 5 | [Clients](./05-clients.md) | Writers, directors, and other creators Shuman represents |
| 6 | [Client Material](./06-client-material.md) | Scripts, samples, reels, decks |
| 7 | [Contacts](./07-contacts.md) | Industry people — execs, assistants, etc. |
| 8 | [Companies](./08-companies.md) | Studios, networks, prodcos, agencies |
| 9 | [Projects](./09-projects.md) | Shows and films |
| 10 | [Files](./10-files.md) | Box-backed file storage |
| 11 | [Settings](./11-settings.md) | Profile, team, integrations |
| 12 | [Picklists](./12-picklists.md) | Every dropdown in the app — what they are, where they show up, and how to filter with them |
| 13 | [Tips & Shortcuts](./13-tips.md) | Keyboard shortcuts, omni-search, the Grid view, gotchas |

## A few conventions used everywhere

- **Auto-save.** Most fields save automatically a moment after you stop typing. You'll see a small "saved" indicator. You don't need to hit a save button.
- **Picklists.** Anywhere you see a dropdown of types, statuses, levels, genres, etc., those values are managed in **Settings → Picklists**. Add or rename values there and they appear everywhere instantly. Full list in [Picklists](./12-picklists.md).
- **Multi-select fields.** Some fields (clients on a meeting, projects on a submission, types on a company) accept more than one value. Click the field and add as many as needed.
- **Tabs on detail pages.** Every individual record (a client, a contact, a project, etc.) opens to an Info tab with the basics, plus extra tabs that pull in related records — meetings, submissions, calls, etc.
- **The Grid tab.** On clients, contacts, and companies you'll see a **Grid** tab that shows, at a glance, which buyers a client *has* met and *has not yet* met. It's the fastest way to spot gaps before staffing season. See [Tips & Shortcuts](./13-tips.md) for the full explanation.
- **The "+ New Call" button** floats in the bottom-right corner of every page. Use it (or `⌘J` / `Ctrl+J`) to log a call without leaving what you're doing.
- **Omni-search** lives at the top right. Type a name, project, company — anything — and jump straight to it.

## Required vs. optional

In general, the app asks for very little to create a record. You can usually start with just a name and fill in details over time. Sections below call out which fields actually have to be filled to make a record useful (e.g., a submission isn't useful without at least one client and the person it went to).
