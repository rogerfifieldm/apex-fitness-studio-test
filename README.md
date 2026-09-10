# Apex Fitness Studio V2

## What this version adds
- Persistent reservations stored in SQLite
- Live capacity tracking
- Full-class blocking
- Duplicate email protection per class
- Admin reservation list grouped by class
- Existing filters and dark/light mode

## Run locally
1. Install Node.js 18+.
2. In this folder run: `npm install`
3. Start the app: `npm start`
4. Open: `http://localhost:3000`

Important: unlike Version 1, this build requires the Node server to be running because the database and API live on the backend.

## Production note
The admin view in this test build has no login yet. Before public deployment, add admin authentication and HTTPS hosting.
