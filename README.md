# Alhuda Homeo Hospital - Management System

A comprehensive Clinic & Hospital Management System built with React 19, TanStack Start / Router, TypeScript, Tailwind CSS, and local MySQL.

## Features

- **Dashboard**: Real-time stats on revenue, new patients, and patient visit trends.
- **Patient Management**: Complete record keeping, medical history, and contact details.
- **Prescriptions & Backdating**: Create detailed prescriptions with customizable medicine list and visit backdating options.
- **Billing & Invoicing**: Auto-generate invoices from prescriptions or create manual bills with instant printable views.
- **Inventory Control**: Track stock levels, pricing, and medicine dosages.
- **Dynamic Hospital Branding**: Customizable clinic name, tagline, address, phone number, and logo.
- **Local MySQL Backend**: High-performance local database storing all clinic data securely.

## Getting Started

### Prerequisites

- Node.js (v18+)
- MySQL Server (running locally on port 3306)

### Setup & Installation

1. **Install dependencies**:
   ```sh
   npm install
   ```

2. **Configure Database**:
   Import `homeocare.sql` into your local MySQL database:
   ```sh
   mysql -u root -p < homeocare.sql
   ```

3. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="mysql://root:yourpassword@127.0.0.1:3306/homeocare"
   JWT_SECRET="your-secure-jwt-secret-key"
   ```

4. **Run Development Server**:
   ```sh
   npm run dev
   ```

5. Access the application at `http://localhost:3000`.
