# WasteWatch

A web application designed to help users track and monitor their packaging waste.

## Features
- Track daily packaging waste based on orders and type.
- View waste logs.
- Earn pledges by actively reducing waste.
- Complete with authentication (login/register).

## Installation

1. Clone the repository
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the application:
   ```sh
   npm start
   ```

## Tech Stack
* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js, Express.js
* **Database:** SQLite (using `better-sqlite3`)

## Deployment (Render)
This project is configured to run on Render's Web Service free tier. 

* The database is stored using Render's ephemeral storage, so no paid disk is required.
* Build Command: `npm install`
* Start Command: `npm start`
* Note: Due to ephemeral storage, data will be reset on every deploy or restart.
