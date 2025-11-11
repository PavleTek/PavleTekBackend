const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRouter = require("./routers/authRouter");
const adminRouter = require("./routers/adminRouter");
const emailRouter = require("./routers/emailRouter");
const domainRouter = require("./routers/domainRouter");

dotenv.config();
const app = express();

const envOrigins = process.env.CORS_ORIGIN || "";
const allowedOrigins = envOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// CORS setup — must be FIRST
const corsOptions = {
  origin: (origin, callback) => {
    if (
      allowedOrigins.length === 0 || // no origins configured
      !origin || // non-browser request
      allowedOrigins.includes(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

// Routers after CORS
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin", emailRouter);
app.use("/api/admin", domainRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`server running on ${PORT}`));
