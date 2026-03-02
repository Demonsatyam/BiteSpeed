# 🔗 BiteSpeed – Identity Reconciliation Service

> A backend microservice that intelligently links customer identities across multiple contact points, maintaining a unified customer profile.

---

## 📌 Overview

Customers often place orders using different emails or phone numbers. This service solves that by:

- Identifying if incoming contact info belongs to an existing customer
- Linking related contacts together under a single **primary** identity
- Converting newer primaries into **secondary** contacts during merges
- Returning a clean, consolidated identity response every time

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Dev Server | Nodemon |

---

## 🧠 Problem Summary

Each order may contain an **email**, a **phone number**, or **both**.

If multiple contacts share either the same email or the same phone number — they belong to the same customer.

### Rules

- ✅ The **oldest contact** becomes (or remains) `primary`
- ✅ All other related contacts become `secondary`
- ✅ If two `primary` contacts get linked → the **newer one** becomes `secondary`
- ✅ The API always returns a **fully consolidated** contact structure

---

## 🏗 Database Schema

### `Contact` Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | `Int` | Primary Key |
| `email` | `String?` | Email address (optional) |
| `phoneNumber` | `String?` | Phone number (optional) |
| `linkedId` | `Int?` | Points to the primary contact |
| `linkPrecedence` | `"primary" \| "secondary"` | Contact type |
| `createdAt` | `DateTime` | Auto-set on creation |
| `updatedAt` | `DateTime` | Auto-updated on change |
| `deletedAt` | `DateTime?` | Soft delete timestamp |

---

## 📦 Setup & Installation

### 1️⃣ Clone the Repository
```bash
git clone <your-repository-url>
cd <project-folder>
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Setup PostgreSQL

Ensure PostgreSQL is installed and running, then create the database:
```sql
CREATE DATABASE bitespeed_identity;
```

### 4️⃣ Configure Environment Variables

Create a `.env` file in the root directory:
```env
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/bitespeed_identity?schema=public"
```

> Replace `username` and `password` with your PostgreSQL credentials.

### 5️⃣ Run Prisma Migrations
```bash
npx prisma migrate dev
npx prisma generate
```

### 6️⃣ Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server runs at: **http://localhost:3000**

---

## 📡 API Reference

### `POST /identify`

**Endpoint:**
```
POST http://localhost:3000/identify
```

**Headers:**
```
Content-Type: application/json
```

**Request Body** *(at least one field required)*:
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primaryEmail", "otherEmail"],
    "phoneNumbers": ["primaryPhone", "otherPhone"],
    "secondaryContactIds": [2, 3]
  }
}
```

> ⚠️ `primaryContatctId` spelling follows the original task specification exactly.

---

## 🧪 Example Scenarios

### Case 1 – New Customer (Creates Primary)
```json
// Request
{ "email": "lorraine@hillvalley.edu", "phoneNumber": "123456" }

// Response
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

### Case 2 – Existing Customer, New Info (Creates Secondary)
```json
// Request
{ "email": "mcfly@hillvalley.edu", "phoneNumber": "123456" }

// Response
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

### Case 3 – Merging Two Primaries

Given Primary A (`george@hillvalley.edu` / `919191`) and Primary B (`biffsucks@hillvalley.edu` / `717171`):
```json
// Request
{ "email": "george@hillvalley.edu", "phoneNumber": "717171" }
```

The older primary stays `primary`. The newer is downgraded to `secondary`. The full group consolidates.

---

## 🔁 Reconciliation Logic Flow
```
1. Find contacts matching the incoming email or phone
2. Fetch the full linked group for each match
3. Determine the oldest contact → becomes the primary
4. If multiple primaries → merge (newer becomes secondary)
5. If new info detected → create a new secondary contact
6. Return the fully consolidated identity
```

---

## 🌿 Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready code |
| `test` | Active development branch |

---

## 🌍 Deployment

Deploy on any Node.js platform: **Render**, **Railway**, or **Cyclic**.
Ensure `PORT` and `DATABASE_URL` environment variables are set on your host.

---

## ✅ Task Checklist

- [x] Database schema implemented
- [x] Identity reconciliation logic implemented
- [x] API tested via Postman
- [x] Edge cases handled
- [x] Clean Git history maintained

---

## 👨‍💻 Author

**Satyam Kumar** — Backend Developer
