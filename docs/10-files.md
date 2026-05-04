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
