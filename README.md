# Dairy Inventory Management System

A complete full-stack application for managing dairy inventory, sales, purchases, and expenses.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

## Prerequisites

- Node.js installed
- Supabase account and project

## Setup Instructions

1.  **Clone the repository** (if applicable) or navigate to the project folder.

2.  **Database Setup**:
    - Go to your Supabase project's SQL Editor.
    - Copy the contents of `schema.sql` and run it to create the necessary tables and views.

3.  **Environment Variables**:
    - Navigate to the `server` directory: `cd server`
    - Create a `.env` file (copy from `.env.example` if available) and add your Supabase credentials:
      ```env
      SUPABASE_URL=your_supabase_url
      SUPABASE_KEY=your_supabase_anon_key
      PORT=3001
      ```

4.  **Install Dependencies**:
    - From the root directory, run:
      ```bash
      npm install
      npm run install:all
      ```

## Running the Application

To run both the backend and frontend concurrently:

```bash
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## Features

- **Dashboard**: Overview of today's sales, purchases, expenses, and current inventory.
- **Products**: Manage product list (Add, Edit, Delete).
- **Purchases**: Record stock purchases.
- **Sales**: Record product sales.
- **Expenses**: Track daily expenses.
- **Reports**: View Daily and Monthly financial reports.

## Folder Structure

- `/server`: Express backend code.
- `/client`: Next.js frontend code.
- `schema.sql`: Database schema definitions.
