# Dataset Request Desk Web

The web app for the Dataset Request Desk: clients request robot-episode datasets, operators fulfil
them, clients accept or reject the delivery.

> **Start in [neotix-api](https://github.com/Nkusibeni23/neotix-api).** It holds the API, the
> database, the tests, the design notes, and the `docker-compose.yml` that runs the whole system
> (including this app) with one command. This repository is only the frontend.

## What you can do

| Role | Screens |
|---|---|
| **Client** | Sign in · see only their own requests, filtered by status · create a request (task chosen from known tasks, episodes, deadline, notes) · follow progress and history · accept or reject a delivery |
| **Operator** | Everything clients see, for all clients · start work · assign episodes with filters (task, robot, quality, unassigned only) · remove episodes · mark as delivered · import a CSV and read the skip report · analytics |
| **Admin** | Everything operators can do · create users · change roles · deactivate and reactivate accounts |

The UI only shows the actions the API says the current user may take (`allowed_transitions`), but
it never relies on that: every rule is enforced by the API.

### UX details

- **Confirmation before irreversible actions:** deliver, accept, reject, remove an episode,
  change a role, deactivate a user. One shared dialog (`useConfirm`) shows a spinner while the
  action runs and stays open if it fails.
- **Clear feedback:** toasts for every success or failure, using the server's own error message
  (for example "Request needs 20 episodes before it can be delivered").
- **Loading, empty and error states** on every list. Skeletons instead of spinners.
- **Responsive:** tables become cards on phones; the navigation becomes a slide-out menu.
- **Keyboard friendly:** request rows are real links; the dialogs, menus and date picker are fully keyboard-operable.
- **Live updates:** new requests and status changes appear without refreshing (Server-Sent
  Events, `lib/live.ts`). Operators get a toast for each new request, clients when their request
  changes; a **Live** dot in the top bar shows the connection state and it reconnects by itself.
- Demo-account buttons on the login page to switch roles in one click.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4 with theme tokens (brand, status and quality colours) in `globals.css` |
| Components | shadcn/ui on Base UI primitives, lucide icons, sonner toasts |
| Server state | TanStack Query: caching, refetch on focus, targeted invalidation after each change |
| Tables | TanStack Table v9 behind one shared `DataTable` |
| Forms | react-hook-form + zod |
| Dates | react-day-picker calendar in a popover |

## Code layout

```text
src/
├── app/
│   ├── login/                 # sign-in page
│   └── (app)/                 # signed-in pages, wrapped in AppShell
│       ├── requests/          # list + [id] detail (actions, history, episode picker)
│       ├── import/            # CSV upload and report
│       ├── analytics/
│       └── users/             # admin only
├── components/
│   ├── ui/                    # shadcn/ui primitives (button, dialog, select, …)
│   ├── data-table.tsx         # one table for every list: loading, empty, selection, mobile cards
│   ├── confirm-dialog.tsx     # app-wide confirmation dialog
│   ├── filters.tsx            # FilterBar, chips, segmented tabs, selects, search
│   ├── date-picker.tsx        # DatePicker and DateRangePicker
│   └── …                      # status badges, progress, timeline, app shell
└── lib/
    ├── api.ts                 # fetch wrapper: auth header, errors, query params
    ├── queries.ts             # every API call as a TanStack Query hook, with query keys
    ├── auth.ts                # session hooks (me, login, logout)
    ├── live.ts                # live-update stream: reconnects, refreshes queries, toasts
    ├── notify.ts              # one place for toast wording
    └── types.ts               # API response types
```

Pages contain no `fetch` calls and no hard-coded colours: data comes through `lib/queries.ts`,
colours through theme tokens.

## Run locally

Requirements: Node.js 24+, and the API running on <http://localhost:8000> (see
[neotix-api](https://github.com/Nkusibeni23/neotix-api)).

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and use a demo account from the login page.

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (`output: "standalone"`, used by the Dockerfile) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the API. Inlined into the browser bundle at **build** time. |

## Docker

Normally built by the API repository's `docker compose up`. To build on its own:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t desk-web .
docker run -p 3000:3000 desk-web
```

## Known limitations

- The session token is kept in `localStorage`. Simple and fine for an internal tool, but readable
  by any script on the page; an httpOnly cookie would be safer (see NOTES.md in the API repo).
- Live updates say *what* changed, then the page refetches it, so each event costs one small
  request. Simple and always consistent; fine at this scale.
