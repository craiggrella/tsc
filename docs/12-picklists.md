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
