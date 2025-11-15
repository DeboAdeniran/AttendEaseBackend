const mysql = require("mysql2");
const config = require("./config");

// Create connection pool
const pool = mysql.createPool(config.db);

// Get promise-based pool
const promisePool = pool.promise();

// Test connection
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log("✅ Database connected successfully");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

testConnection();

module.exports = promisePool;
