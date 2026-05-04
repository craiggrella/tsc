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
# Dashboard

The landing page when you log in. It's a quick snapshot — not a place to do work.

## What you see

**Upcoming Meetings.** The next meetings on the calendar, with the meeting title, status, and the time. Click any of them to jump to the meeting's detail page.

**Recent Calls.** The most recently logged calls, with who they were with and the call status. Click through to open the call.

That's it. Both panels are read-only summaries pulled from the Meetings and Call Sheet tables. Anything you can do here you can do better from the actual section pages.

## When to use it

- First thing in the morning to see what's on deck.
- After someone asks "what calls did we just take?" and you want a fast scan.
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
# Meetings

Step three in the order of operations. Where you track every meeting between a Shuman client and an industry contact.

## What you see (the table)

| Column | What it shows |
|--------|---------------|
| Client(s) | Which client(s) the meeting is for |
| Meeting With | Which contact(s) they're meeting |
| Our Team | Which Shuman team member(s) attended |
| Status | Where the meeting is in the lifecycle |
| Date & Time | When it's scheduled (or happened) |
| Location | Address, Zoom link, or "Hybrid" details |

## Filters

- **All / By status** — toggle the view
- **Status dropdown** — `need to set`, `need to reschedule`, `scheduled`, `completed`, `cancelled`

## Creating / editing a meeting

Open an existing meeting by clicking it, or hit **+ New Meeting** to create one. The detail page has these fields:

| Field | Required? | Type | What it's for |
|-------|-----------|------|---------------|
| Client | **Required** for it to be useful | Multi-select from Clients | Sometimes more than one client meets with the same exec — pick all of them |
| Meeting With | **Required** for it to be useful | Multi-select from Contacts | Who they're meeting on the other side |
| Our Team | Optional | Multi-select from team members | Which Shuman manager(s) are attending |
| Projects | Optional | Multi-select from Projects | If the meeting is about a specific show or film, link it here |
| Status | **Required** (defaults to "need to set") | Single-select | See list above |
| Date & Time | Optional | Date/time picker | Set once the meeting is locked |
| Location Type | Optional | Single-select: `Virtual`, `In-person`, `Hybrid` | Drives which address fields appear |
| Virtual Meeting Info | Conditional | Free text | Shows when location is Virtual or Hybrid. Zoom link, conference number, etc. |
| Meeting Address | Conditional | Free text | Shows when location is In-person or Hybrid |
| Notes | Optional | Rich text | Anything you want to remember about the meeting |

## How it shows up elsewhere

Once you save a meeting, it automatically appears on:

- The **Meetings** tab of every linked client
- The **Meetings** tab of every linked contact
- The **Meetings** tab of every linked project
- The **Grid** tab of clients, contacts, and companies — once a client meets with a contact, that contact moves from "not yet met" to "met" on every relevant grid (see [Tips & Shortcuts](./13-tips.md))

You don't have to enter the same meeting in multiple places.

## What comes next

A successful meeting leads to a deal, which leads to a contract. Contracts exist in the data model but the UI is not yet built — for now, store contract artifacts in [Files](./10-files.md) and use the **Credits** tab on the client's page to record their attachment to the project once the deal closes.
# Clients

The writers, directors, and other creators Shuman represents.

## The list page

Shows every client with:

- **Name**
- **Current Project** — pulled from their credits, whichever credit is marked "current"
- **Staff Level** — their staff level on that current project

Search by name at the top.

## The individual client page

Opens to the **Info** tab. Tabs across the top let you see everything connected to that client.

### Info tab

| Field | Required? | What it's for |
|-------|-----------|---------------|
| First Name | Optional | First name |
| Last Name | Optional | Last name |
| Company / Loan Out | Optional | The client's loan-out company. Single-select from Companies. You can add a new company if it's not there |
| Staff Level | Optional | Free text — their current staff level (writer, story editor, exec producer, director, etc.) |
| Phones | Optional | Add as many as needed. Each has a type (cell, home, office, other) — one can be marked as starred/preferred |
| Emails | Optional | Same pattern as phones — multiple, with a starred preferred |
| Addresses | Optional | Multiple, each with a type |
| Social Links | Optional | URLs with a type (Instagram, website, LinkedIn, etc.) |
| Macros | Optional | Saved canned text for this client |
| Notes | Optional | Free text |

Realistically, **first name + last name** is the only thing you need to create the record. Fill in the rest as it comes up.

### Grid tab

A two-column at-a-glance view: **buyers this client has met with** on the left, **buyers this client has not yet met** on the right. Pull this up before a staffing season or a general round to spot the holes — anyone in the right column is a target.

The grid is built from every meeting linked to this client, so as soon as you log a meeting, the relevant buyer moves from the right column to the left.

### Meetings tab

A table of every meeting this client has been on. Shows the contact they met, the date, and the project (if any). Icon to jump to the meeting's full page.

### Submissions tab

A table of every submission involving this client. Shows the person it went to, that person's company, the project it was for, and the response. Icon to jump to the submission.

### Client Material tab

Every piece of material belonging to this client — title, type, format, genre, sub-genre, status. Click to open the material's page.

### Credits tab

Every project this client has been attached to.

| Field | What it's for |
|-------|---------------|
| Project | Single-select from Projects |
| Staff Level | Single-select picklist |
| Status | `current` or `former` — only one credit should be marked "current" at a time |
| Start Year | 4-digit year |
| End Year | 4-digit year |

The "current" credit is what shows up on the Clients list page as the client's current project.

### Calls tab

A table of every call logged about this client. Shows date/time, status, etc.
# Client Material

Scripts, samples, reels, decks, treatments — anything a client has authored or directed.

## The list page

Shows every piece of material with:

- **Title**
- **Type** (pilot, feature, sample, etc.)
- **Client** — who created it. A single piece of material can have multiple clients (co-writers, writer-director teams, etc.)
- **Format** (one-hour, half-hour, feature, etc.)
- **Status** (where it is in the writing/review process)

Filter by status, search by title.

## The individual material page

| Field | Required? | What it's for |
|-------|-----------|---------------|
| Title | **Required** | The title of the piece |
| Is Client Material | Optional toggle | Marks whether this is internally-owned client material or something else |
| Clients | **Required** | Multi-select. Sometimes more than one client co-created a piece — pick all of the authors / directors |
| Type | Optional | Single-select from picklist |
| Format | Optional | Single-select from picklist |
| Status | Optional | Single-select. `not yet reviewed`, `in review`, `coverage available`, `notes given`, `editing`, `final draft` |
| Genre | Optional | Single-select |
| Sub-genre | Optional | Multi-select |
| Box File | Optional | Link to the actual file in Box |

## Submissions table at the bottom

Below the fields, there's a table showing every submission this material has been part of — who got it, their company, the project it was for, and their response. A single piece of material can be sent out many times; this is where you see the whole history at once.
# Contacts

Every industry person you deal with — executives, assistants, casting directors, producers, and so on. The people you put on a call sheet or send material to.

## The list page

Columns:

- **Name**
- **Title**
- **Company**
- **Type** (contact, potential client, vendor, assistant, executive)
- **Phone** — the starred/preferred phone
- **Email** — the starred/preferred email

### Filters

- **Search** — by name
- **Buyer** — narrow to contacts at companies of a specific buyer type
- **Type** — narrow to a specific contact type
- **Level** — narrow to a specific exec level (intern through chair)

The active filter count appears next to the table title in amber. Use **Clear** to reset all filters at once.

## The individual contact page

### Info tab

| Field | Required? | What it's for |
|-------|-----------|---------------|
| First Name | Optional | First name |
| Last Name | Optional | Last name |
| Company | Optional | Single-select from Companies |
| Title | Optional | Job title (free text) |
| Type | Optional | Single-select picklist |
| Level | Optional | Exec level — intern, assistant, coordinator, manager, director, VP, SVP, EVP, president, chair |
| Phones / Emails / Addresses / Social Links | Optional | Same multi-entry pattern as on Clients — each entry has a type, and one can be starred as preferred |
| Assistant | Optional | Single-select from Contacts. Once you pick one, their starred phone and email appear automatically |
| Notes | Optional | Rich-text |

### Grid tab

Only appears if the contact's company has a **buyer type** set. Shows a two-column at-a-glance view of **clients this contact has already met** on the left and **clients they have not yet met** on the right.

Read it as: "if this exec is taking generals, who do we still need to put in front of them?" Anyone in the right column is a target. As soon as you log a meeting linking this contact to a client, the client moves from right to left automatically.

### Meetings tab

Every meeting this contact has been on. Shows the client(s), date, and any linked projects.

### Calls tab

Every call logged with this contact — date/time, status, and which client (if any) it was about.

### Submissions tab

Every submission this contact has received. Shows the client whose material it was, the title of the material, the company at the time, the project, and their response.

### Materials tab

Every piece of client material this contact has had submitted to them.
# Companies

Studios, networks, production companies, agencies, management firms — anywhere your contacts work.

## The list page

Columns:

- **Name**
- **Buyer** — buyer type (single value)
- **Types** — a company can wear multiple hats (e.g., studio AND network)
- **Outlet** — broadcast / cable / digital / independent / major / pod (multi-select)
- **Department** — IP / TV / Digital / MP (multi-select)

### Filters

- **Search** — by name
- **Buyer / Type / Outlet / Dept** — multi-select dropdowns

## The individual company page

### Info tab

| Field | Required? | What it's for |
|-------|-----------|---------------|
| Company Name | **Required** | Name of the company |
| Buyer Type | Optional | Single-select picklist. Drives whether the Grid tab on contacts and clients is available |
| Types | Optional | Multi-select. Studio, network, prodco, agency, etc. |
| Outlet | Optional | Multi-select |
| Departments | Optional | Multi-select |
| Phones / Emails / Addresses / Social Links | Optional | Same multi-entry pattern as on Clients and Contacts |
| Notes | Optional | Rich-text |

### People tab

Every contact whose company is this one. Shows name, title, level, department, buyer type, starred phone, starred email, and any projects they're associated with.

### Projects tab

Every project linked to this company. Shows name, type, status, genre, and sub-genre. Icon to jump to the project's full page.

### Grid tab

Only appears when the company has a **buyer type** set. Shows a two-column view of **clients who have met someone at this company** on the left and **clients who haven't yet** on the right.

Use it before targeting a buyer (e.g., "we want to hit Netflix this season — who haven't we sent in yet?"). The right column is your shortlist. The grid updates automatically as meetings get logged.
# Projects

Shows and films. Every project material gets submitted for, every show clients are staffed on.

## The list page

Columns:

- **Name**
- **Status** — `rumored`, `development`, `pilot`, `picked up`, `current`, `on the bubble`, `completed`, `cancelled`
- **Companies** — comma-separated list of associated companies. Each one is clickable

Search by name, filter by status.

## The individual project page

### Info tab

| Field | Required? | What it's for |
|-------|-----------|---------------|
| Name | **Required** | Project name |
| Status | **Required** (defaults to "development") | Single-select from the statuses above |
| Companies | Optional | Add associated companies. Each one is a single-select from Companies, with a type (studio, network, prodco, etc.) |

### People tab

Every contact attached to this project. Name, title, level, department, buyer type, starred phone, starred email.

### Meetings tab

Every meeting linked to this project. Shows the client(s) who met, who they met with, and the date.

### Submissions tab

Every submission for this project. Shows the client whose material went out, the title of the material, who received it, and their response.

### Clients tab

Every client linked to this project (via credits or otherwise).
# Files

A file browser backed by Box. The Shuman Box account is the source of truth — this page is a window into it.

## What you can do

- **Browse folders** — click any folder to drill in. The breadcrumb at the top shows where you are; click any crumb to jump back up.
- **Back button** — the arrow next to the breadcrumb steps up one level.
- **Upload** — hit the **Upload** button (top right), or just drag files onto the page. Supports multiple files at once.
- **Search** — the search box (top right) searches across files and folders.
- **List / Grid view** — toggle between the two view modes with the icons next to search.
- **Right-click a file or folder** — opens a context menu (preview, etc.).

## How it connects to the rest of the app

When you attach a Box file to a piece of [Client Material](./06-client-material.md), the link points back into Box. Files don't live in this app's database — they live in Box, and this page is a viewer.

## If something's broken

If you see a "Box error" message, the connection between this app and Box has expired. An admin needs to go to **Settings → Integrations** and re-authorize Box.
# Settings

Three core tabs: **Profile**, **Team**, **Integrations**. (A fourth tab, **Picklists**, gets its own dedicated section in this guide — see [Picklists](./12-picklists.md).)

## Profile

Your own account info.

| Field | What it's for |
|-------|---------------|
| Full Name | Your display name across the app |
| Email | The email tied to your login |
| Avatar | Profile photo |

There's also a **Change Password** section at the bottom.

## Team

Lists every team member with their role.

**Roles:**

- **Admin** — full access, can invite and remove team members, can change integrations
- **Manager** — full access to records (clients, contacts, calls, etc.)
- **Assistant** — same record access; meant for support staff

Admins see an **Invite** button to add new team members by email.

## Integrations

Right now, the only integration is **Box** (for the Files page). When Box is connected, the Files page works. When the Box connection lapses, an admin needs to come here and re-authorize.

## Picklists

The fourth tab in Settings is **Picklists**, which controls every dropdown in the app. Because it's broad and worth its own walkthrough, it has its own page in this guide: [Picklists](./12-picklists.md).
# Picklists

Picklists are the dropdowns that show up everywhere in the app — the list of contact types, project statuses, genres, and so on. They live in **Settings → Picklists** and changes you make there ripple through the whole app instantly.

## How many are there?

There are **14 picklists** managed in Settings, plus a handful of statuses that are baked into the app and not editable (calls, submissions, meetings, projects, materials — see [Built-in statuses](#built-in-statuses-not-editable) at the bottom).

## The full list

| # | Picklist | Single or multi | Where it shows up | Filterable? |
|---|----------|-----------------|-------------------|-------------|
| 1 | **Contact Types** | Single-select | Contacts → Info tab → Type field | ✅ Contacts list page |
| 2 | **Contact Levels** | Single-select | Contacts → Info tab → Level field (exec level) | ✅ Contacts list page |
| 3 | **Company Types** | Multi-select | Companies → Info tab → Types field | ✅ Companies list page |
| 4 | **Location Types** | Single-select | Phones, emails, addresses, and social links across Clients, Contacts, and Companies | ❌ |
| 5 | **Departments** | Multi-select | Companies → Info tab → Departments; Contacts → department | ✅ Companies list page |
| 6 | **Buyer Types** | Single-select | Companies → Info tab → Buyer Type | ✅ Contacts list page, Companies list page |
| 7 | **Outlets** | Multi-select | Companies → Info tab → Outlet | ✅ Companies list page |
| 8 | **Material Types** | Single-select | Client Material → Type | ❌ |
| 9 | **Material Statuses** | Single-select | Client Material → Status | ✅ Client Material list page |
| 10 | **Formats** | Single-select | Client Material → Format | ❌ |
| 11 | **Genres** | Single-select | Client Material → Genre | ❌ |
| 12 | **Sub-Genres** | Multi-select | Client Material → Sub-genre | ❌ |
| 13 | **Project Statuses** | Single-select | Projects → Info tab → Status | ✅ Projects list page |
| 14 | **Credit Statuses** | Single-select | Clients → Credits tab → Status | ❌ |

## Current options out of the box

These are the values that ship with a fresh install. You can add, rename, or remove any of them in Settings → Picklists at any time.

### Contact Types
`contact`, `potential client`, `vendor`, `assistant`, `executive`

### Contact Levels (exec level)
`intern`, `assistant`, `coordinator`, `manager`, `director`, `vice president`, `senior vice president`, `executive vice president`, `president`, `chair`

### Company Types
`studio`, `network`, `production company`, `agency`, `management`, `law firm`, `distributor`, `guild`, `publisher`, `publicity`, `theatre`, `financer`, `hedge fund`, `business management`, `financial consultant`, `news`, `video game publisher`

### Location Types
`cell`, `home`, `office`, `other` (used for phones, addresses, etc. — the available types vary slightly by field type)

### Departments
`IP`, `TV`, `Digital`, `MP`

### Buyer Types
Configurable per client — values like `streamer`, `broadcaster`, `cable`, etc. Set up in your install.

### Outlets
`broadcast`, `cable`, `digital`, `independent`, `major`, `pod`

### Material Types
Common values: `pilot`, `feature`, `sample`, `treatment`, `pitch deck`, `series bible`. Configurable.

### Material Statuses
`not yet reviewed`, `in review`, `coverage available`, `notes given`, `editing`, `final draft`

### Formats
Common values: `one-hour`, `half-hour`, `feature`, `limited series`, `short`. Configurable.

### Genres
Common values: `drama`, `comedy`, `thriller`, `horror`, `sci-fi`, `fantasy`, `documentary`, `animation`. Configurable.

### Sub-Genres
Configurable. Multi-select, so a piece of material can be tagged with several at once.

### Project Statuses
`rumored`, `development`, `pilot`, `picked up`, `current`, `on the bubble`, `completed`, `cancelled`

### Credit Statuses
`current`, `former`

## How filtering works

Several list pages have filter dropdowns powered by these picklists. The marked ones in the table above support filtering — here's where to look:

| List page | Filters available |
|-----------|-------------------|
| Contacts | Buyer (from Buyer Types), Type (Contact Types), Level (Contact Levels) |
| Companies | Buyer (Buyer Types), Type (Company Types), Outlet (Outlets), Dept (Departments) |
| Client Material | Status (Material Statuses) |
| Projects | Status (Project Statuses) |
| Submissions | Status (built-in, not editable) |
| Meetings | Status (built-in, not editable) |
| Call Sheet | Status (built-in, not editable) |

Filters are **multi-select on most pages** — you can pick more than one value at a time (e.g., show me all Studios AND Networks). The active filter count appears next to the table title; **Clear** resets them all.

## How to add, rename, or delete values

In **Settings → Picklists**:

1. **Expand** a picklist by clicking its name.
2. **Add** — click `+ Add`, type the label, press Enter. It's available everywhere instantly.
3. **Rename** — click the label inline and edit.
4. **Delete** — trash icon on the row.

> ⚠️ Be careful deleting a value that's already in use. Records that had it stay pointed at the deleted value until they're edited and given a new one.

## Built-in statuses (not editable)

A few core lifecycle statuses are baked into the app code and **don't** appear in Settings → Picklists. They're listed here for reference:

| Status family | Values |
|---------------|--------|
| Call Status | `to call`, `incoming`, `left word`, `returning`, `connected` |
| Call Priority | `high`, `medium`, `low` |
| Submission Status | `need to send`, `sent`, `connected` |
| Submission Reason | `general`, `meeting`, `staffing`, `at their request`, `spec script`, `development` |
| Submission Response | `love`, `like`, `meh`, `hate` |
| Meeting Status | `need to set`, `need to reschedule`, `scheduled`, `completed`, `cancelled` |
| Meeting Location Type | `Virtual`, `In-person`, `Hybrid` |
| Meeting Response | `love`, `like`, `meh`, `hate` |
| Team Member Role | `admin`, `manager`, `assistant` |

If any of these need to change, that's a code change — flag it to the dev.
# Tips & Shortcuts

## Keyboard shortcuts

| Shortcut | What it does |
|----------|--------------|
| `⌘J` / `Ctrl+J` | Open the New Call panel from anywhere in the app |
| `Esc` | Close any open panel |

## The floating "+ New Call" button

Sits in the bottom-right corner of every page (except the Call Sheet itself, which already has its own controls). Use it to log a call without losing your place.

## Omni-search

The search bar at the top right of every page. Type any name — client, contact, company, project, material — and jump straight to the record. Faster than navigating section-by-section.

## The Grid view (your secret weapon)

Three sections in the app have a **Grid** tab — Clients, Contacts, and Companies. Same idea each time, with a slightly different lens:

| Where | Left column | Right column | Use it when… |
|-------|-------------|--------------|--------------|
| **On a client** | Buyers this client has met with | Buyers this client has not yet met | …you're prepping a staffing or generals push for that client and want to see who's still on the table |
| **On a contact** | Clients this contact has already met | Clients this contact has not yet met | …a buyer is taking generals and you want to see which of your clients you still need to put in front of them |
| **On a company** | Clients who have met someone there | Clients who haven't | …you're targeting a whole buyer (e.g., "this is our Netflix push") and need a shortlist of clients to send in |

The Grid only appears on contacts and companies if a **buyer type** is set on the company — that's the signal that the entity is a buyer worth tracking against. On clients it always appears.

The grid is built live from the Meetings table, so logging a meeting moves the relevant client/contact from the right side to the left automatically. No separate bookkeeping.

## Auto-save

Most fields save automatically a beat after you stop typing. You'll see a small "saved" indicator. Don't worry about losing work if you navigate away.

## How records connect (a mental model)

The shortest version: a **submission** is the hub. It points at a client, the client's material, a project, and a contact (the recipient). Once those four are filled in:

- The submission shows up on the **client's** Submissions tab
- It shows up on the **contact's** Submissions tab
- It shows up on the **project's** Submissions tab
- It shows up on the **material's** submissions table at the bottom

When the contact responds, you log the response on the submission once — and it appears in all four places. **Fill in the relationships and the rest is free.**

The same principle applies to meetings: link the client, contact, and project, and the meeting populates everywhere it belongs (including all three Grid views).

## Common gotchas

- **The Grid tab only appears on a contact or company page if a buyer type is set.** No buyer type → no Grid tab. Set it on the contact's company.
- **A client's "current project" on the Clients list comes from their Credits tab.** Mark exactly one credit as `current` per client. If none is marked current, the column will be empty.
- **Picklists update everywhere instantly.** If someone says "I don't see that genre," check Settings → Picklists → Genres. Add it and it'll appear on the next dropdown click.
- **Deleting a picklist value doesn't auto-fix records using it.** The records keep the old value pointer until edited.
- **Box connection can lapse.** If the Files page shows an error, an admin needs to re-authorize Box in Settings → Integrations.

## Who to ask

- App not working / something looks off → ping the admin on the Shuman team.
- Box / file issues → admin (re-auth via Settings).
- Bug or feature request → tell the dev on Slack or wherever Shuman tracks tickets.
