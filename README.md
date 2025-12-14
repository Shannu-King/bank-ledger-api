\# Bank Ledger API



A robust, double-entry bookkeeping financial API built with Node.js, Express, and PostgreSQL. This system ensures ACID compliance, data immutability, and strict balance integrity for financial transactions.



\## 🚀 Setup \& Installation



\### Prerequisites

\* Node.js (v18+)

\* PostgreSQL (v14+)



\### 1. Database Setup

1\.  Log in to PostgreSQL:

&nbsp;   ```bash

&nbsp;   psql -U postgres

&nbsp;   ```

2\.  Create the database and user:

&nbsp;   ```sql

&nbsp;   CREATE DATABASE bank\_ledger;

&nbsp;   CREATE USER ledger\_user WITH ENCRYPTED PASSWORD 'ledger123';

&nbsp;   GRANT ALL PRIVILEGES ON DATABASE bank\_ledger TO ledger\_user;

&nbsp;   \\c bank\_ledger

&nbsp;   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ledger\_user;

&nbsp;   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ledger\_user;

&nbsp;   ```

3\.  Run the Schema Script:

&nbsp;   (Copy the contents of `schema.sql` here or refer to the migration file).



\### 2. Application Setup

1\.  Clone the repository.

2\.  Install dependencies:

&nbsp;   ```bash

&nbsp;   npm install

&nbsp;   ```

3\.  Configure environment variables in `.env`:

&nbsp;   ```env

&nbsp;   DB\_USER=ledger\_user

&nbsp;   DB\_HOST=localhost

&nbsp;   DB\_NAME=bank\_ledger

&nbsp;   DB\_PASSWORD=ledger123

&nbsp;   DB\_PORT=5432

&nbsp;   PORT=3000

&nbsp;   ```

4\.  Start the server:

&nbsp;   ```bash

&nbsp;   node server.js

&nbsp;   ```



---



\## 🏗️ Design Decisions



\### Double-Entry Bookkeeping Implementation

We implemented a strict "Event Sourcing" style model.

\* \*\*No Balance Column:\*\* The `accounts` table does NOT store a balance.

\* \*\*The Ledger is Truth:\*\* A user's balance is purely the sum of all their `ledger\_entries`.

\* \*\*Entry Pairs:\*\* Every transfer creates exactly two immutable entries in the `ledger\_entries` table:

&nbsp;   \* \*\*Debit:\*\* Negative amount (Source Account).

&nbsp;   \* \*\*Credit:\*\* Positive amount (Destination Account).

\* \*\*Zero Sum:\*\* The sum of these two entries is always 0, preventing money creation/destruction errors.



\### Ensuring ACID Properties

We used PostgreSQL's transaction block management (`BEGIN` ... `COMMIT`/`ROLLBACK`) within the Service Layer.

\* \*\*Atomicity:\*\* The `transferFunds` function bundles the Transaction Record, Debit Entry, Credit Entry, and Status Update into a single SQL transaction. If any step fails (e.g., negative balance check), the entire transaction rolls back.

\* \*\*Consistency:\*\* Foreign keys ensure entries must belong to valid accounts. The "Negative Balance Guard" logic prevents invalid states before commit.

\* \*\*Isolation:\*\* We utilize PostgreSQL's default isolation level, ensuring transactions do not see uncommitted data from others.

\* \*\*Durability:\*\* PostgreSQL's WAL (Write-Ahead Logging) ensures committed data survives crashes.



\### Transaction Isolation Level

We utilize \*\*READ COMMITTED\*\* (PostgreSQL Default).

\* \*\*Rationale:\*\* This level prevents "Dirty Reads," ensuring our balance calculations are based only on committed data.

\* \*\*Concurrency:\*\* For high-frequency accounts, row-level locking occurs implicitly during `INSERT` operations into the ledger, ensuring integrity without the performance cost of `SERIALIZABLE` level serialization failures.



\### Balance Calculation \& Negative Balance Prevention

\* \*\*Calculation:\*\* `SELECT SUM(amount) FROM ledger\_entries WHERE account\_id = ?`

\* \*\*Prevention:\*\* We perform an "Optimistic Check" inside the transaction.

&nbsp;   1.  Insert the debit (negative value).

&nbsp;   2.  Immediately query the new sum.

&nbsp;   3.  If `sum < 0`, throw an error and `ROLLBACK` immediately.

&nbsp;   This ensures that even if a user tries to spend funds they don't have, the database state remains clean.



---



\## 🧪 API Endpoints



| Method | Endpoint | Description |

| :--- | :--- | :--- |

| `POST` | `/api/accounts` | Create a new user account. |

| `GET` | `/api/accounts/:id` | Get account info and live balance. |

| `POST` | `/api/transfer` | Execute a double-entry money transfer. |

