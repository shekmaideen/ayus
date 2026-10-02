import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

async function main() {
  const host = process.env.MYSQL_HOST || "localhost";
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";

  console.log(`Connecting to MySQL at ${host}:${port} as user '${user}'...`);

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  console.log("Connected to MySQL server!");

  console.log("Re-creating database 'homeocare'...");
  await connection.query("DROP DATABASE IF EXISTS homeocare;");
  await connection.query("CREATE DATABASE homeocare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
  await connection.query("USE homeocare;");

  const sqlPath = path.join(process.cwd(), "homeocare.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("Executing homeocare.sql schema and seed data...");
  await connection.query(sql);

  // Update default clinic settings name to Alhuda Homeo Hospital
  await connection.query(`
    UPDATE clinic_settings 
    SET clinic_name = 'Alhuda Homeo Hospital' 
    WHERE id = 1;
  `);

  console.log("✅ Database 'homeocare' created and initialized successfully!");
  await connection.end();
}

main().catch((err) => {
  console.error("❌ Detailed error initializing database:", err);
  process.exit(1);
});
