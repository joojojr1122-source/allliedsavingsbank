const {
  getApplicationStatus,
  signup,
  login,
  logout,
  handleChangePassword,
  requestPasswordResetController,
  resetPasswordController
} = require("../controllers/authController");
const { sendJson } = require("../utils/http");

async function handleAuthRoute(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/auth/application-status") {
    await getApplicationStatus(req, res, url);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    await signup(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    await login(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    await logout(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/change-password") {
    await handleChangePassword(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/request-password-reset") {
    await requestPasswordResetController(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
    await resetPasswordController(req, res);
    return;
  }

  sendJson(res, 404, { error: "Auth route not found" });
}

module.exports = { handleAuthRoute };
