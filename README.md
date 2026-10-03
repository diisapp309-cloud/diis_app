# DIIS Dispatch Log

Website + installable app (PWA) for recording truck consignments:
truck/vehicle number, date & time, sender + NTN, FBR digital invoice number, value of goods,
sales tax, receiver + NTN.

- **Users** sign in with a username/password created by the admin, submit records, and see their own
  records as a log by **day / week / month / custom range**, with search and filters and CSV export.
  They can edit a record **only on the day they submitted it** (Pakistan time). Older records are locked.
- **Admin** (`diisapp309@gmail.com`) sees every user's records, adds records (for themself or on behalf
  of a user), edits or deletes any record, views each record's change history, and manages accounts:
  create user, reset password, disable/enable, make admin.

The rules are enforced in the database (Supabase row level security), not only in the UI.

Stack: Next.js 16 (App Router) on Vercel · Supabase Auth + Postgres · GitHub.

## One-time setup

### 1. Supabase (project "Diis Project", `vzwythpeoicprtwtbdau`)
1. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
2. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
   Only the admin creates accounts (through the app).
3. **Authentication → Users → Add user → Create new user**: email `diisapp309@gmail.com`, choose a strong
   password, tick **Auto Confirm User**. The database makes this account the admin automatically.
4. **Project Settings → API Keys**: copy the **Publishable** (or legacy `anon`) key and the **Secret**
   (or legacy `service_role`) key.

### 2. GitHub (`diisapp309-cloud/diis_app`)
```bash
cd diis_app
git push -u origin main      # sign in as diisapp309-cloud when Git asks
```

### 3. Vercel (team `diis1`)
1. **Add New → Project → Import** `diisapp309-cloud/diis_app` (connect GitHub if asked).
2. Framework preset: **Next.js** (auto-detected). Node.js version: 22.x or newer.
3. **Environment Variables**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://vzwythpeoicprtwtbdau.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret / service_role key — **never** put `NEXT_PUBLIC_` in front of this |
   | `NEXT_PUBLIC_USERNAME_DOMAIN` | `users.diis.app` (optional, this is the default) |
4. **Deploy**. Every push to `main` redeploys automatically.

### 4. First sign-in
Open the Vercel URL, sign in with `diisapp309@gmail.com` and your password. You land on **Admin**.
Go to **Users → New user** to create accounts, then share the username + password shown.

## Install as an app
- **Android / Chrome / Edge (desktop)**: open the site → "Install the app on this device" on the
  sign-in page, or browser menu → *Install app*.
- **iPhone / iPad**: open in Safari → Share → *Add to Home Screen*.

## Run locally
```bash
cp .env.example .env.local   # fill in the keys
npm install
npm run dev                  # http://localhost:3000
```

## How it works
| Piece | Where |
|---|---|
| Tables, triggers, security rules | `supabase/schema.sql` |
| Same-day edit rule | `records_update` policy + `pk_date()` (Asia/Karachi) |
| Edit / delete audit trail | `record_history` table, filled by trigger |
| Admin-only account management | `app/api/admin/users/**` (verifies the caller is an active admin, uses the secret key server-side) |
| Records log, period switch, filters, CSV | `components/RecordsView.js` |
| Record form + validation | `components/RecordForm.js` |
| User management UI | `components/UsersPanel.js` |

Usernames are stored in Supabase Auth as `<username>@users.diis.app`; no email is ever sent there.
Disabling a user blocks sign-in immediately and keeps all their records.
