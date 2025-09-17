const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");

// Try to require morgan only if installed
let morgan = null;
try { morgan = require("morgan"); } catch (_) {}

const rateLimit = require("express-rate-limit");
const swaggerUI = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");
const shipmentRoute = require("./routes/shipment");

dotenv.config();
const app = express();

// --- RATE LIMITERS (auth endpoints) ---
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

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
    endpoints: {
      health: "/health",
      register: "POST /auth/register",
      login: "POST /auth/login",
      me: "GET /auth/me (Bearer token required)",
      users: "GET /users (admin), DELETE /users/:id (admin)",
      shipments: "CRUD /shipments, admin ops at /shipments/:id/*",
      docs: "/docs",
    },
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
      description: "Auth, Users & Shipments for Ellcworth backend.",
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 8000}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        RegisterRequest: {
          type: "object",
          required: ["fullname", "email", "password", "country", "address"],
          properties: {
            fullname: { type: "string", example: "Test User" },
            email: { type: "string", example: "test@example.com" },
            password: { type: "string", example: "Passw0rd!" },
            country: { type: "string", example: "UK" },
            address: { type: "string", example: "1 Demo Street" },
            age: { type: "integer", example: 33 },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "test@example.com" },
            password: { type: "string", example: "Passw0rd!" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            _id: { type: "string" },
            fullname: { type: "string" },
            email: { type: "string" },
            role: { type: "string", example: "user" },
            status: { type: "string", example: "pending" },
            accessToken: { type: "string" },
          },
        },
        TrackingEvent: {
          type: "object",
          properties: {
            code: { type: "string", example: "SAILED" },
            description: { type: "string", example: "Vessel sailed from SOU" },
            at: { type: "string", format: "date-time" },
            location: { type: "string", example: "Southampton" },
            meta: { type: "object" },
          },
        },
        Document: {
          type: "object",
          properties: {
            type: { type: "string", example: "BOL" },
            url: { type: "string", example: "https://cdn.example.com/bol123.pdf" },
          },
        },
        ShipmentMinimal: {
          type: "object",
          properties: {
            customer: { type: "string", example: "64f1e2c7a1b2c3d4e5f6a7b8" },
            cargoType: { type: "string", example: "vehicle" },
            ports: {
              type: "object",
              properties: {
                originPort: { type: "string", example: "Southampton" },
                destinationPort: { type: "string", example: "Tema" },
              },
            },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: { summary: "Health check", tags: ["System"], responses: { 200: { description: "OK" } } },
      },
      "/auth/register": {
        post: {
          summary: "Register a new user",
          tags: ["Auth"],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
          responses: {
            201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
            409: { description: "Email already registered" },
            400: { description: "Missing required fields" },
          },
        },
      },
      "/auth/login": {
        post: {
          summary: "Login",
          tags: ["Auth"],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
          responses: {
            200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/auth/me": {
        get: { summary: "Get current user", tags: ["Auth"], security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
      },
      "/shipments": {
        get: { summary: "List shipments", tags: ["Shipments"], security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } },
        post: {
          summary: "Create shipment",
          tags: ["Shipments"],
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ShipmentMinimal" } } } },
          responses: { 201: { description: "Created" } },
        },
      },
      "/shipments/{id}": {
        get: {
          summary: "Get a shipment",
          tags: ["Shipments"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
        },
        put: {
          summary: "Update shipment",
          tags: ["Shipments"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "OK" } },
        },
        delete: {
          summary: "Delete shipment",
          tags: ["Shipments"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Deleted" } },
        },
      },
      "/shipments/{id}/tracking": {
        post: {
          summary: "Add tracking event (admin)",
          tags: ["Shipments"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TrackingEvent" } } } },
          responses: { 200: { description: "OK" }, 403: { description: "Forbidden" } },
        },
      },
      "/shipments/{id}/documents": {
        post: {
          summary: "Attach document (admin)",
          tags: ["Shipments"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Document" } } } },
          responses: { 200: { description: "OK" }, 403: { description: "Forbidden" } },
        },
      },
      "/shipments/{id}/status": {
        patch: {
          summary: "Update status (admin)",
          tags: ["Shipments"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", example: "sailed" } } } } } },
          responses: { 200: { description: "OK" }, 403: { description: "Forbidden" } },
        },
      },
    },
  },
  apis: [], // you can point to route files with JSDoc later
});

app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec, { explorer: true }));

// --- ROUTES ---
app.use("/auth", authLimiter, authRoute);
app.use("/users", userRoute);
app.use("/shipments", shipmentRoute);

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
  res.status(500).json({ ok: false, message: "Something went wrong", error: err.message });
});

module.exports = app;
