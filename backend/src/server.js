const http = require("http");
const path = require("path");
const { URL } = require("url");
const { handleAuthRoute } = require("./routes/authRoutes");
const { handleAccountRoute } = require("./routes/accountRoutes");
const { handleAdminRoute } = require("./routes/adminRoutes");
const { sendJson, sendStaticFile } = require("./utils/http");

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "..", "..", "frontend");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/auth")) {
    await handleAuthRoute(req, res, url);
    return;
  }

  if (url.pathname.startsWith("/api/account")) {
    await handleAccountRoute(req, res, url);
    return;
  }

  if (url.pathname.startsWith("/api/admin")) {
    await handleAdminRoute(req, res, url);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const requestedPath = url.pathname === "/"
    ? "/index.html"
    : url.pathname === "/favicon.ico"
      ? "/favicon.svg"
      : url.pathname;
  sendStaticFile(res, FRONTEND_DIR, requestedPath);
});

server.listen(PORT, () => {
  console.log(`Banking portal running at http://localhost:${PORT}`);
});
