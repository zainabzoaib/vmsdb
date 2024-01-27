const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const qrcode = require("qrcode");
const nodemailer = require("nodemailer");
const app = express();

app.use(cors({ origin: "*" }));
app.set("port", process.env.PORT || 5000);
app.use(express.json());

const db = mysql.createConnection({
  host: "35.213.173.85",
  user: "uowax0ps0y2rh",
  password: "@j2)eP;d2@^&",
  database: "dbrtaiiidka9wr",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Database connected successfully");
  }
});

app.get("/", function (request, response) {
  response.send("Hello World!");
});
//all visitors records
app.get("/api/visitors", (req, res) => {
  const query = "SELECT * FROM visitor_records";

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching visitors from MySQL:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(results);
    }
  });
});
//all user records
app.get("/api/users", (req, res) => {
  const querySelect = "SELECT * FROM users";

  db.query(querySelect, (error, results) => {
    if (error) {
      console.error("Error fetching users from MySQL:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(results);
    }
  });
});

const generateQRCode = async (data) => {
  try {
    const qrCodeDataUrl = await qrcode.toDataURL(data);
    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

const sendEmailWithQRCode = async (recipientEmail, qrCodeDataUrl) => {
  const transporter = nodemailer.createTransport({
    host: "mail.parentechnology.com",
    port: 465,
    secure: true, // upgrade later with STARTTLS
    auth: {
      user: "zainab@parentechnology.com",
      pass: "zainab123$",
    },
  });

  const mailOptions = {
    from: "zainab@parentechnology.com", // Replace with your Gmail email
    to: recipientEmail,
    subject: "QR Code for Registration",
    text: "Scan the QR code to enter.",
    html: `<p>Please find the attached QR code and get scanned on the gate for entry.</p>
    <img src="cid:qrcode_cid" alt="QR Code" />`,
    attachments: [
      {
        filename: "qrcode.png",
        content: qrCodeDataUrl.split(";base64,").pop(),
        encoding: "base64",
        cid: "qrcode_cid",
        type: "image/png", // Specify the content type
        disposition: "inline",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent with QR code");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
//insert into visitors table
app.post("/api/visitor", (req, res) => {
  const { name, phone, email, purpose_of_visit, person_meeting } = req.body;

  if (!name || !phone || !email || !purpose_of_visit || !person_meeting) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const insertQuery =
    "INSERT INTO `visitor_records`(`name`, `phone`, `email`, `purpose_of_visit`, `person_meeting`) VALUE (?,?,?,?,?)";
  db.query(
    insertQuery,
    [name, phone, email, purpose_of_visit, person_meeting],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.status(201).json({
          message: "Registration done successfully",
          //   userId: result.insertId,
        });
      }
    }
  );
  let formData = JSON.stringify({
    Name: name,
    Phone: phone,
    Email: email,
    PurposeOfVisit: purpose_of_visit,
    PersonMeeting: person_meeting,
  });
  generateQRCode(formData)
    .then((response) => {
      sendEmailWithQRCode(email, response);
    })
    .catch((err) => console.log(err));
});
//insert into user records
app.post("/api/user", (req, res) => {
  const { username, password, email, role } = req.body;

  if (!username || !password || !email || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const insertQuery =
    "INSERT INTO `users`(`username`, `password`, `email`, `role`) VALUE (?,?,?,?)";
  db.query(insertQuery, [username, password, email, role], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.status(201).json({
        message: "user added done successfully",
        //   userId: result.insertId,
      });
    }
  });
});
//Chart data fetching
app.get("/api/monthly-visitors", (req, res) => {
  const params = req.query;

  let whereConditions = [];
  let selectConditions = [];
  let groupByConditions = [];

  if (req.query.day) {
    whereConditions.push(`DAY(entry_date) = ${params.day}`);
  }

  if (req.query.month) {
    whereConditions.push(`MONTH(entry_date) = ${params.month}`);
    selectConditions.push(`MONTH(entry_date) as month`);
    groupByConditions.push(`MONTH(entry_date)`);
  }

  if (req.query.year) {
    whereConditions.push(`YEAR(entry_date) = ${params.year}`);
    selectConditions.push(`YEAR(entry_date) as year`);
    groupByConditions.push(`YEAR(entry_date)`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const selectClause =
    selectConditions.length > 0 ? `${selectConditions.join(", ")}` : "";

  const groupByClause =
    groupByConditions.length > 0 ? `${groupByConditions.join(", ")}` : "";

  const query = `
    SELECT 
    ${selectClause}
    ,COUNT(*) as totalEntries
    FROM visitor_records
    ${whereClause}
    GROUP BY ${groupByClause}
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching monthly visitor count from MySQL:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json({ count: results });
    }
  });
});
//login code
app.post("/api/login", (req, res) => {
  const { user, pass } = req.body;

  // Query the database for the user with the provided credentials
  db.query(
    "SELECT username FROM users WHERE username = ? AND password = ?",
    [user, pass],
    (err, results) => {
      if (err) {
        console.error("Error querying the database:", err);
        res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
        return;
      }
      // Check if the query returned any results
      if (results.length > 0) {
        // If valid, send a success response with user details
        results[0].token = "abcd1234";
        res.json({ success: true, user: results[0] });
      } else {
        // If not valid, send a failure response
        res.status(201).json({
          message: "Invalid Credentials",
          //   userId: result.insertId,
        });
      }
    }
  );
});
//Update Users
app.put("/api/users/:userId", (req, res) => {
  const { userId } = req.params;
  const updatedUser = req.body;

  db.query(
    "UPDATE users SET ? WHERE user_id = ?",
    [updatedUser, userId],
    (err, result) => {
      if (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.json({ message: "User updated successfully", result });
      }
    }
  );
});
//Delete Users
app.delete("/api/users/:userId", (req, res) => {
  const { userId } = req.params;

  db.query("DELETE FROM users WHERE user_id = ?", userId, (err, result) => {
    if (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json({ message: "User deleted successfully", result });
    }
  });
});
//Bar Chart Data Fill
app.get("/api/yearlyData", (req, res) => {
  const query =
    "SELECT YEAR(entry_date) as year, COUNT(*) as totalRecords FROM visitor_records GROUP BY YEAR(entry_date)";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error executing MySQL query:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(results);
  });
});

app.listen(app.get("port"), function () {
  console.log("Node app is running at localhost:" + app.get("port"));
});
