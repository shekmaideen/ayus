# Dr. Ayus Homeopathy Hospital Management System — Deployment Guide

This guide describes how to install, configure, deploy, and maintain the application on a local Windows PC for clinic use.

---

## 1. System Requirements & Software

- **Operating System**: Windows 10 / Windows 11 (64-bit)
- **Node.js**: v18.x or v20.x LTS ([nodejs.org](https://nodejs.org/))
- **MySQL Database**: MySQL Server 8.0 or 8.4 ([dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/))
- **Network**: Local Area Network (LAN) connected via Ethernet or Wi-Fi (if other clinic PCs need access)

---

## 2. Environment Configuration (`.env`)

Create a `.env` file in the project root folder (you can copy `.env.example` as a starting point):

```env
# MySQL Database Connection
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=homeocare

# Authentication Secret (Generate a unique 64-char string)
JWT_SECRET=a_very_long_secure_random_jwt_secret_key_32_chars_plus
JWT_EXPIRES_IN=30d

# App Mode
NODE_ENV=production
```

> ⚠️ **SECURITY NOTICE**: Keep `.env` confidential. Never commit it to Git or share it online.

---

## 3. Database Initialization

1. Open PowerShell / Command Prompt as Administrator.
2. Login to MySQL and create the schema:
   ```powershell
   mysql -u root -p < homeocare.sql
   ```
3. This creates the `homeocare` database and all required tables: `users`, `clinic_settings`, `patients`, `case_histories`, `visits`, `medicines`, `prescriptions`, `bills`, `follow_ups`, `appointments`, and `templates`.

---

## 4. Building & Running the Application

### A. Install Dependencies
```powershell
npm install
```

### B. Build for Production
```powershell
npm run build
```

### C. Start Application Server
```powershell
npm run preview
```
The application will launch locally at `http://localhost:3000`.

---

## 5. Account Setup & Staff Management

1. **First Doctor Account Creation**:
   - Open browser to `http://localhost:3000`.
   - On first run, the system prompts you to register the primary Doctor/Admin account.
   - Enter Full Name, Email, Username, and Password.

2. **Receptionist Account Creation**:
   - Log in as the Doctor/Admin.
   - Navigate to **Settings** → **Staff Management**.
   - Click **Add Staff Member** to register receptionist accounts with assigned roles.

---

## 6. LAN Access Setup (Multiple Clinic PCs)

To allow other computers on the clinic local network (e.g. reception desk PC) to access the app:

1. **Find Doctor PC's Local IP**:
   - In PowerShell, run `ipconfig`. Look for `IPv4 Address` (e.g., `192.168.1.100`).
2. **Allow Port 3000 in Windows Firewall**:
   - Run in PowerShell (Admin):
     ```powershell
     New-NetFirewallRule -DisplayName "Dr. Ayus Hospital App" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
     ```
3. **Access from Reception PC**:
   - Open browser on reception PC and go to: `http://192.168.1.100:3000`

---

## 7. Database Backup & Restore Procedure

### A. Automatic / In-App Backup
- Log in as Doctor.
- Go to **Settings** → **MySQL Database Backup & Restore**.
- Click **Create Backup Now**. Timestamped `.sql` dumps will be saved automatically to the `backups/` folder.

### B. Manual Backup Command
```powershell
mysqldump -u root -p homeocare > backups\backup_homeocare_manual.sql
```

### C. Manual Restore Command
```powershell
mysql -u root -p homeocare < backups\backup_homeocare_manual.sql
```

---

## 8. Moving System to Doctor's PC (Migration Steps)

1. **On Development PC**:
   - Export latest database dump via Settings page or `mysqldump`.
   - Copy project repository folder to a USB drive or local network share.

2. **On Doctor's PC**:
   - Install Node.js and MySQL Server.
   - Import `homeocare.sql` (or latest backup dump).
   - Paste `.env` file into root folder.
   - Run `npm install` and `npm run build`.
   - Start app with `npm run preview`.

---

## 9. Troubleshooting

- **Database Connection Error**: Verify MySQL Service is running (`Get-Service MySQL*` in PowerShell) and check password in `.env`.
- **Port 3000 in Use**: Change port in Vite preview configuration or close conflicting process.
- **Login Issues**: Use `resetStaffPassword` feature in Settings or re-run setup on a clean database.
