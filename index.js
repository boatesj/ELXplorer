const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");

// Try to require morgan only if installed
let morgan = null;
try { morgan = require("morgan"); } catch (_) {}

const swaggerUI = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const authRoute = require("./routes/auth");

dotenv.config();
const app = express();

// --- MIDDLEWARES ---
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(helmet());
if (process.env.NODE_ENV === "development" && morgan) app.use(morgan("dev"));

// --- HEALTH CHECK ---
app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --- ROOT ---
app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "Ellcworth API",
    version: "1.0.0",
    endpoints: { health: "/health", register: "POST /auth/register", login: "POST /auth/login", me: "GET /auth/me (Bearer token required)", docs: "/docs" },
    time: new Date().toISOString(),
  });
}); 

 // --- SWAGGER SETUP ---
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Ellcworth API",
     version: "1.0.0",
      description: "Auth & Health endpoints for Ellcworth backend.",
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 8000}` }],
    components: {
     securitySchemes: {
       bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },       },
      schemas: {         RegisterRequest: {
          type: "object",
         required: ["fullname", "email", "password", "country", "address"],
          properties: {
           fullname: { type: "string", example: "Test User" },
           email: { type: "string", example: "test@example.com" },
            password: { type: "string", example: "Passw0rd!" },
            country: { type: "string", example: "UK" },
            address: { type: "string", example: "1 Demo Street" },
            age: { type: "integer", example: 33 }
          }
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "test@example.com" },
            password: { type: "string", example: "Passw0rd!" }
          }
        },
        AuthResponse: {
          type: "object",
          properties: {
            _id: { type: "string" },
            fullname: { type: "string" },
            email: { type: "string" },
            role: { type: "string", example: "user" },
            status: { type: "string", example: "pending" },
            accessToken: { type: "string" }
          }
        }
      },
    },
    paths: {
      "/health": {
        get: {
          summary: "Health check",          tags: ["System"],
           responses: {
             200: { description: "OK" }
          }
        }
      },       "/auth/register": {
        post: {
           summary: "Register a new user",
          tags: ["Auth"],
          requestBody: {
            required: true,
             content: {
              "application/json": {
                 schema: { $ref: "#/components/schemas/RegisterRequest" }
               }
             }
           },
           responses: {
             201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
             409: { description: "Email already registered" },
             400: { description: "Missing required fields" }
           }
         }
       },
       "/auth/login": {
         post: {
           summary: "Login",
           tags: ["Auth"],
           requestBody: {
             required: true,
            content: {
               "application/json": {
                 schema: { $ref: "#/components/schemas/LoginRequest" }
               }
             }
           },
           responses: {
             200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
             401: { description: "Invalid credentials" }
           }
         }
       },
       "/auth/me": {
         get: {
           summary: "Get current user",
           tags: ["Auth"],
           security: [{ bearerAuth: [] }],
           responses: {
             200: { description: "OK" },
             401: { description: "Unauthorized" }
           }
         }
       }
     }
   },
   apis: [], // you can point to route files for JSDoc comments later
 });
 
 app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec, { explorer: true }));

// --- ROUTES ---
app.use("/auth", authRoute);

// --- DB + SERVER START ---
const PORT = Number(process.env.PORT) || 8000;
const MONGO_URI = process.env.MONGO_URI || process.env.DB;
if (!MONGO_URI) { console.error("❌ No Mongo URI found. Set MONGO_URI (or DB) in your .env."); process.exit(1); }

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ DB connection successful");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong", error: err.message });
});

module.exports = app;
