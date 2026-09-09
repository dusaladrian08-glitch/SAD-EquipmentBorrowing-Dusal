# Equipment Borrowing and Return Monitoring System

A responsive, Supabase-backed web application for College equipment custodians. It supports authentication, equipment CRUD, borrowing and return transactions, automatic overdue detection, dashboard summaries, search, filters, validation, and transaction-safe status changes.

## System analysis

### Problem statement

The College currently records equipment borrowing manually, making it difficult for custodians to know which assets are available, who has borrowed them, when they are due, and which transactions are overdue. Students, faculty, and staff may experience delays because records can become incomplete or outdated. The proposed Equipment Borrowing and Return Monitoring System centralizes equipment and transaction records in a secure online database. It updates availability when an item is borrowed or returned, identifies overdue transactions, and provides search, filters, and dashboard summaries for faster and more accurate monitoring.

### Actors

- **System User / Equipment Custodian:** Logs in and directly manages equipment and transactions.
- **Borrower:** A student, faculty member, or staff member whose borrowing information is recorded by the custodian.

### Relationship

One equipment item can appear in many borrowing transactions over time. Each borrowing transaction refers to exactly one equipment item.

## Features

- Supabase email/password login, logout, and session protection
- Dashboard totals for total, available, borrowed, returned, and overdue records
- Add, view, edit, search, filter, and safely delete equipment
- Record borrowing using available equipment only
- Atomic database functions for borrowing and returning
- Automatic overdue status when the due date has passed
- Search transactions by borrower, equipment name, or asset code
- Responsive desktop and mobile interface
- Row Level Security policies for authenticated users

## Supabase setup

1. Create a new Supabase project.
2. Open **SQL Editor**, paste `database/schema.sql`, and run it.
3. Open **Authentication → Users** and create at least one email/password user.
4. Open **Project Settings → API** and copy the Project URL and anon/public key.
5. Replace the two placeholders in `js/supabase.js`.
6. Do not place the service-role key in this frontend project.

## Run locally

Open the folder using VS Code Live Server, or run a basic static server. Then open `login.html` and sign in using the Supabase user you created.

## Deploy on GitHub Pages

1. Create a public repository named `SAD-EquipmentBorrowing-Yulinto`.
2. Upload or push all files in this folder.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select `main`, folder `/ (root)`, then click **Save**.
6. Your URL will follow: `https://USERNAME.github.io/SAD-EquipmentBorrowing-Yulinto/`.

Suggested commits:

1. `Initial equipment borrowing system structure`
2. `Create Supabase database integration`
3. `Implement borrowing and return transaction logic`
4. `Add overdue detection and deployment documentation`

## Project structure

```text
├── index.html
├── login.html
├── css/style.css
├── js/
│   ├── supabase.js
│   ├── auth.js
│   └── app.js
├── database/schema.sql
├── documentation/
│   ├── use-case.png
│   ├── erd.png
│   ├── requirements-traceability-matrix.md
│   └── functional-testing.md
└── README.md
```

## Business-rule implementation

| Rule | Implementation |
|---|---|
| BR-01/04 | Required HTML fields plus database checks prevent empty names. |
| BR-02 | Client pre-check and database `UNIQUE` constraint protect asset codes. |
| BR-03/06/07 | `borrow_equipment` atomically checks availability, creates a Borrowed transaction, and marks the asset Borrowed. |
| BR-05 | Form validation and SQL check ensure due date is not before borrowed date. |
| BR-08/12 | `return_equipment` prevents a second return and restores availability. |
| BR-09 | JavaScript derives Overdue for unreturned records past their due date. |
| BR-10 | An explicit confirmation dialog appears before deletion. |
| BR-11 | Session checks and Supabase RLS restrict management to authenticated users. |

## Security notes

The anon key is safe to use in a browser only when RLS is enabled. The included SQL enables RLS. Database functions use the signed-in user's identity, validate state, and execute borrowing/return changes atomically.

