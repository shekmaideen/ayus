# Dr. Ayus Homeopathy Hospital - Management System

A modern, high-performance Clinic & Hospital Management System designed for **Dr. Ayus Homeopathy Hospital**, built with React 19, TanStack Start & Router, TypeScript, Tailwind CSS, and local MySQL with Drizzle ORM.

---

## 🌟 Key Features

- **Dashboard**: Real-time overview of clinic statistics, revenue trends, today's appointments, and recent patient visits.
- **Patient Management**: Full demographic records, contact details, medical case history, and past visit logs.
- **Prescription Builder**: Create detailed prescriptions with multi-potency support, customizable dosages, instructions, and next visit scheduling.
- **Dedicated WhatsApp Messaging**: Independent manual WhatsApp buttons on Patient Registration, Prescription Builder, and Billing to send pre-filled updates via WhatsApp Web without paid API dependencies.
- **Advanced Medicine Inventory**:
  - Full tracking for Medicine Name, Brand, Form/Type, Potency, Stock Quantity, and live Selling Price.
  - Form-specific conditional options: `Bottle` (with dilution potencies `30CH`, `200CH`, `1M`, `Q`, `4X`, `3X`, `6X`, and manual custom typing), `Tablet` (`3X`, `4X`, `6X`, and manual custom typing), `Globules` (`1 drum`, `2 drum`, `3 drum`, `size 40`, and manual custom typing), and clean display for other forms.
  - Automatically generated Indian Standard Time (IST / Asia/Kolkata) Stock Entry Date, Day, and Time.
  - Stock Adjustment tool (`+` Add, `-` Remove, `=` Set Exact) with audit logging.
  - Decoupled stock: Prescriptions and bills do not automatically alter stock levels, leaving inventory fully in the staff's control.
- **Billing & Invoicing**: Automated invoice calculation from live medicine prices and consultation fees, printable receipts, and payment status tracking.
- **Follow-up Management**: Filter upcoming follow-ups for Today, This Week, and Overdue with one-click status updates.
- **Security & Staff RBAC**:
  - Role-based permissions (Doctor vs Receptionist).
  - Bcrypt password hashing and secure JWT session management.
  - Login rate limiting, failed attempt lockout protection, and comprehensive audit logging.
- **Automated Local Backups**: Daily non-blocking database export with one-click manual JSON backup downloads.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **MySQL Server 8.0+** running on port 3306

---

### Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shekmaideen/ayus.git
   cd ayus
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Database**:
   Import `ayus.sql` into your local MySQL database:
   ```bash
   mysql -u root -p < ayus.sql
   ```

4. **Environment Configuration**:
   Copy the example environment configuration file to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(On Windows Command Prompt: `copy .env.example .env`)*

   Update your `.env` with your local MySQL credentials:
   ```env
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=ayus

   JWT_SECRET=your_secure_jwt_secret_key
   JWT_EXPIRES_IN=30d
   ```

5. **Run the Application**:
   - **For Everyday Clinic Use (Easiest)**:
     Simply double-click `Start Hospital App.bat`. It will automatically check MySQL, start the server, and open `http://localhost:8080` in your default browser.
   - **Via Terminal**:
     ```bash
     npm run dev
     ```

6. Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🔒 Security Best Practice

The `.env` file contains sensitive environment secrets (database credentials, JWT secret keys) and is excluded from version control via `.gitignore`. Always maintain local credentials in your `.env` file and use `.env.example` as a template.

---

## 🛠️ Production Build

To test or generate the production bundle:

```bash
npm run build
```
