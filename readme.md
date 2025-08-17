# TrueChoice

**An Voting Application** that Allows users to vote among a set of candidates.

## Description

TrueChoice is an online voting platform where users can create accounts, sign in, and participate in elections safely. It features JWT-based authentication, separate roles for administrators and voters and dynamic candidate management. Built with Node.js, Express, and MongoDB, it provides a reliable backend for handling secure voting processes.

## Project Structure

├── routes/              # API routes (user & candidate)
├── models/              # Mongoose models
├── db.js                # Database connection
├── jwt.js               # JWT auth middleware & token generation
├── server.js            # Application entry point
├── package.json         # Dependencies and scripts
└── .env.example         # Sample environment variables

## Features

- Users can vote among a set of candidates.
- Users can see the list of candidates and their live vote counts sorted by there vote counts.
- Users can change their password.
- Users can login only with the adhaar card number and password.
- users can signin / signup
- admin can add candidates
- admin can delete candidates
- admin can update candidates
- admin cannot perform voting

## API Endpoints

### User Authentication

| Endpoint  | Method | Description                             | Payload                       |
| --------- | ------ | --------------------------------------- | ----------------------------- |
| `/signup` | POST   | Create a new user account               | User details (JSON)           |
| `/login`  | POST   | Log in with Aadhaar number and password | Aadhaar No. + Password (JSON) |

### Voting

| Endpoint             | Method | Description                     |
| -------------------- | ------ | ------------------------------- |
| `/candidates`        | GET    | Retrieve the list of candidates |
| `/vote/:candidateId` | POST   | Cast a vote for a candidate     |

### Vote Counts

| Endpoint       | Method | Description                             |
| -------------- | ------ | --------------------------------------- |
| `/vote/counts` | GET    | Get all candidates sorted by vote count |

### User Profile

| Endpoint            | Method | Description                      |
| ------------------- | ------ | -------------------------------- |
| `/profile`          | GET    | Get the logged-in user’s profile |
| `/profile/password` | PUT    | Change the user’s password       |

### Admin Candidate Management

| Endpoint                   | Method | Description                             |
| -------------------------- | ------ | --------------------------------------- |
| `/candidates`              | POST   | Create a new candidate                  |
| `/candidates/:candidateId` | PUT    | Update details of an existing candidate |
| `/candidates/:candidateId` | DELETE | Remove a candidate from the list        |

## Tech Stack

- Node.js
- Express.js
- MongoDB (based on `db.js`)
- JWT-based authentication (`jwt.js`)
- JavaScript runtime

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/varun053101/TrueChoice.git
   cd TrueChoice
   ```

2. Intstall Dependencies

   ```bash
   npm install
   ```

# Usage

1. Run the app

   ```bash
   npm start
   ```

2. Access the server (e.g., http://localhost:3000 unless configured differently)

## Environment Variables

Create a `.env` file in the project root with the following:

- `PORT` → Port number for the server (default: 3000)
- `MONGODB_URL_LOCAL` → MongoDB local connection string
- `MONGODB_URL` → MongoDB Atlas (cloud) connection string
- `JWT_SECRET` → Secret key for JWT signing
