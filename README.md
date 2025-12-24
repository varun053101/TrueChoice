# 🗳 TrueChoice – Secure Online Voting for College Elections

TrueChoice is a secure and transperant online platform designed for college clubs, student councils and academic organizations. It eliminates manual vote counting, prevents duplicate voting, and ensures a fair and accessible election process for all eligible members.

It handles everything from **user registration** and **role-based access** to **election scheduling**, **candidate management**, **voter eligibility**, **secure vote casting**, and **controlled result publishing**.  

This repository is the **Node.js + MongoDB backend** for the system.

> 🧠 Goal: Make it easy for a college/club to run elections where  
> – only eligible students can vote,  
> – each voter can vote only once per election, and  
> – results are transparent but only visible when the admin decides.

---

## 🧩 Features

### 1. Role-Based Access Control

TrueChoice has three clear roles:

- **Voter**
  - Registers using SRN and email
  - Logs in with credentials
  - Views their profile
  - Votes in ongoing elections (only if eligible)
  - Views results when they are made public

- **Admin**
  - Creates elections (title, position, description, start & end time)
  - Adds candidates to a particular election
  - Uploads eligible voter lists via CSV (SRN-based)
  - Force-starts or force-closes elections in special cases
  - Publishes results for closed elections

- **Superadmin**
  - System-level owner
  - Manages admin assignment and ownership transfer logic
  - Has full control over elections and configuration

Role checks are enforced using middleware and JWT payloads.

---

### 2. Authentication & Security

- **JWT-based authentication**
  - Every protected route validates a JWT token.
  - Token payload includes at least the `id` and `role` of the user.
- **Hashed passwords**
  - Passwords are hashed using `bcrypt` in a Mongoose pre-save hook.
  - `comparePassword` method is used during login.
- **SRN validation**
  - SRN must match a pattern like `R22AB123` (first letter R, next 2 digits, next 2 letters, last 3 digits).
- **Role guards**
  - `requireVoter`, `requireAdmin`, `requireSuperadmin` middlewares protect role-specific routes.

---

### 3. Election Management

Each election has:

- `title` – e.g. “CSE Club President Election 2025”
- `positionName` – the role being contested (President, Secretary, etc.)
- `description` – optional details
- `startTime` and `endTime` – scheduled time window
- `status` – one of `draft`, `scheduled`, `ongoing`, `closed`
- `publicResults` – whether general voters can see results
- `createdBy` – reference to the admin/superadmin who created it
- `startedAt` / `closedAt` – actual times when election started/closed

**Admin controls:**

- Create an election in **draft** state.
- Optionally **force-start** before `startTime`.
- Optionally **force-close** before `endTime`.
- Publish results once the election is closed.

---

### 4. Automatic Start & End of Elections

A background scheduler (`jobs/electionScheduler.js`) periodically:

- Auto-starts elections when `startTime <= now < endTime`
  - `status` becomes `ongoing`
  - `startedAt` is set
- Auto-closes elections when `endTime <= now`
  - `status` becomes `closed`
  - `closedAt` is set

This ensures elections follow their schedule even if no admin interacts during that time.  
Force-start and force-close simply **override** the schedule by updating `startTime` / `endTime`.

---

### 5. Candidate Management

For each election, admins can:

- Add candidates with:
  - `displayName`
  - `manifesto`
  - optional `photoUrl`
- Link candidates to specific elections
- Ensure only candidates of a given election appear on that ballot

The voter’s ballot only shows candidates for the election they are voting in.

---

### 6. Voter Eligibility via CSV

Not every registered user must be eligible for every election.

For each election, the admin can:

- Upload a **CSV file** containing SRNs of eligible voters.
- Backend parses the file and stores SRNs as the eligible list for that election.
- During voting, the system checks:
  - Is the user’s SRN in the eligible list for this election?
  - Has the user already voted in this election?

If not eligible or already voted → vote is rejected.

---

### 7. Secure Voting Logic

When a voter casts a vote:

- System verifies:
  - Election exists and is `ongoing`
  - Election is within time window
  - Voter is authenticated and has role `voter`
  - Voter is on the eligible list for that election
  - Voter has **not already voted** in that election
  - Candidate belongs to that election
- Then stores a `Vote` document linking:
  - `electionId`
  - `candidateId`
  - `voterId`

This enforces **one vote per election per user**.

---

### 8. Result Calculation & Publishing

- When viewing results (for voters), the API:
  - Checks `election.status === 'closed'`
  - Checks `publicResults === true`
- Aggregates votes per candidate:
  - Counts total votes for each candidate
  - Sorts by vote count
  - Computes each candidate’s percentage
  - Identifies winners (handles ties)

Admins can decide when results become visible to voters using a **“publish results”** route that sets `publicResults = true` for a closed election.

---

## 🧱 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Auth:** JSON Web Tokens (JWT)
- **Password Hashing:** bcrypt
- **File Handling (CSV):** multer
- **Tooling:** npm, nodemon (if configured), Git, GitHub

---

## 📌 Requirements

- **Node.js:** v16 or later
- **MongoDB:** local instance or MongoDB Atlas (cloud)
- **npm:** bundled with Node
- **Git:** to clone the repository
- API testing tool like **Postman**, or VS Code REST client

---

## ⚙ Environment Variables

Create a `.env` file in the root directory.

**Example:**

```env
PORT=3000
MONGO_URL=mongodb://127.0.0.1:27017/truechoice
JWT_SECRET=super_secret_jwt_key_here
REGISTERLIMITER_MAX=10 
LOGINLIMITER_MAX=5
```
---

## 📦 Installation

### Clone the repository
git clone https://github.com/varun053101/TrueChoice.git
cd TrueChoice

### Install dependencies
npm install

### Create .env file
cp .env.example .env   # if an example template exists

### Connect MongoDB
Make sure that `MONGO_URL` inside `.env` points to a running MongoDB instance.

---

## ▶️ Usage (Running the Server)

### Start the backend
npm start

The API will be available at:
http://localhost:3000

---

## 🗳 Typical Flow for a Complete Election

### Superadmin / Admin
- Create an election
- Upload eligible voters list (CSV of SRNs)
- Add candidates to the election
- Let election auto-start based on `startTime` or force-start manually
- After closing (auto or forced), publish results

### Voter
- Register using SRN & email
- Login to receive JWT token
- View active elections
- Access ballot and vote for one candidate
- View results after they are published

### Admin (Results Phase)
- Wait until the election automatically closes (or force-close)
- Publish results by setting `publicResults = true`
- Voters can now see final results

Use Postman or any REST client to test these APIs.
