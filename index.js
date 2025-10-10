require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();
const server = require("http").createServer(app);
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3030;

// Dynamically load CORS configuration from database settings or use defaults
async function setupCors() {
  try {
    // Try to get CORS settings from database
    let corsOptions;

    if (process.env.NODE_ENV === "production") {
      const corsSetting = await prisma.apiSetting.findUnique({
        where: { key: "CORS_DOMAINS" },
      });

      if (corsSetting && corsSetting.value !== "*") {
        // Parse comma-separated domains
        const origins = corsSetting.value
          .split(",")
          .map((domain) => domain.trim());

        corsOptions = {
          origin: origins,
          credentials: true,
          optionsSuccessStatus: 200,
        };

        console.log("CORS configured with allowed domains:", origins);
      } else {
        // Default to allowing all origins in production if not configured
        corsOptions = {
          origin:
          //  process.env.FRONTEND_URL || 
           "*",
          credentials: true,
          optionsSuccessStatus: 200,
        };

        console.log(
          "CORS configured with default settings (all origins allowed)"
        );
      }
    } else {
       corsOptions = {
        origin: "*",
        credentials: true,
        optionsSuccessStatus: 200,
      };

      console.log("Development mode: CORS configured to allow all origins");
    }

    app.use(cors(corsOptions));

     setupServer();
  } catch (error) {
    console.error("Error setting up CORS:", error);
     app.use(
      cors({
        origin: "*",
        credentials: true,
        optionsSuccessStatus: 200,
      })
    );

     setupServer();
  }
}

function setupServer() {
   app.use(
    express.json({
      limit: "10mb",
      verify: (req, res, buf, encoding) => {
        try {
          if (req.get("Content-Type") === "application/json") {
            // Check for control characters that might cause JSON parsing issues
            const body = buf.toString("utf8");
            if (body && typeof body === "string") {
              // Remove or replace problematic control characters
              const cleanBody = body.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
              if (cleanBody !== body) {
                console.warn("Removed control characters from request body");
                // Modify the buffer to contain the cleaned body
                req.rawBody = Buffer.from(cleanBody, "utf8");
              }
            }
          }
        } catch (error) {
          console.error("JSON verification error:", error);
        }
      },
    })
  );

  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

   app.use("/storage", express.static("storage"));

  // Request logging middleware
  app.use((req, res, next) => {
    const url = req.url;
    const user = req?.user;
    const method = req.method;
    next();
  });

   app.use((error, req, res, next) => {
    if (
      error instanceof SyntaxError &&
      error.status === 400 &&
      "body" in error
    ) {
      console.error("JSON Parse Error:", error.message);
      return res.status(400).json({
        error: "Invalid JSON format",
        message:
          "Please check your request body for invalid characters or malformed JSON",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
    next();
  });

  require("./routes/router")(app);

  const setupSwagger = require("./utils/swagger");
  setupSwagger(app);

  // Serve frontend static files
  const frontendDistPath = path.join(__dirname, "frontend", "dist");
  app.use(express.static(frontendDistPath));

  // Handle SPA routing - serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    // Skip API routes and static files
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/storage") ||
      req.path.startsWith("/uploads") ||
      req.path.includes(".")
    ) {
      return next();
    }

    // Serve index.html for all other routes
    res.sendFile(path.join(frontendDistPath, "index.html"), (err) => {
      if (err) {
        console.error("Error serving index.html:", err);
        res
          .status(404)
          .send(
            "Frontend not built. Please run 'npm run build:frontend' first."
          );
      }
    });
  });

  // Error handling middleware
  app.use(notFound);
  app.use(errorHandler);

  require("./utils/checkInReminderScheduler");
  require("./utils/autoCheckoutScheduler");

  server.listen(PORT, () =>
    console.log(`Listening on port ${PORT} \nURL: http://localhost:${PORT}`)
  );
}

// Start the application by setting up CORS
setupCors();
