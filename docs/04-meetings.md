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
