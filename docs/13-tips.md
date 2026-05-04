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
