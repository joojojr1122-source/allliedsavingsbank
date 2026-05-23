const { readJsonBody, sendJson } = require("../utils/http");
const {
  changePassword,
  createUser,
  findUserByEmail,
  findUserByLoginIdentifier,
  isUserLocked,
  publicUser,
  recordFailedLogin,
  recordSuccessfulLogin,
  requestPasswordReset,
  resetPassword
} = require("../services/userService");
const { createSession, deleteSession, getTokenFromRequest, getUserIdFromRequest } = require("../services/sessionService");
const { verifyPassword } = require("../utils/security");

async function signup(req, res) {
  try {
    const body = await readJsonBody(req);
    const user = await createUser(body);
    const token = createSession(user.id);

    sendJson(res, 201, {
      token,
      user: publicUser(user)
    });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Signup failed" });
  }
}

async function login(req, res) {
  try {
    const body = await readJsonBody(req);
    const identifier = String(body.email || body.identifier || "").trim();
    const password = String(body.password || "");
    const user = await findUserByLoginIdentifier(identifier);

    if (isUserLocked(user)) {
      const unlockTime = new Date(user.security.lockedUntil).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      sendJson(res, 423, { error: `Account is temporarily locked. Try again after ${unlockTime}.` });
      return;
    }

    if (!user || !verifyPassword(password, user.password)) {
      if (user) await recordFailedLogin(user.email);
      sendJson(res, 401, { error: "Login details or password are incorrect" });
      return;
    }

    if (user.account?.status === "Frozen") {
      sendJson(res, 403, { error: "This account is frozen. Contact support or an administrator." });
      return;
    }

    if (user.account?.status === "Rejected") {
      sendJson(res, 403, { error: `Your application was rejected. ${user.application?.decisionReason || "Please contact support for details."}` });
      return;
    }

    if (user.account?.status !== "Active") {
      sendJson(res, 403, { error: "Your account application must be approved before you can login" });
      return;
    }

    const loggedInUser = await recordSuccessfulLogin(user.id);
    const token = createSession(user.id);

    sendJson(res, 200, {
      token,
      user: publicUser(loggedInUser || user)
    });
  } catch (error) {
    sendJson(res, 500, { error: "Login failed" });
  }
}

async function logout(req, res) {
  const token = getTokenFromRequest(req);

  if (token) {
    deleteSession(token);
  }

  sendJson(res, 200, { ok: true });
}

async function handleChangePassword(req, res) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    sendJson(res, 401, { error: "You need to login first" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    await changePassword(userId, currentPassword, newPassword);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Password change failed" });
  }
}

async function requestPasswordResetController(req, res) {
  try {
    const body = await readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      sendJson(res, 400, { error: "Email is required" });
      return;
    }

    const token = await requestPasswordReset(email);

    if (!token) {
      sendJson(res, 200, { ok: true, message: "If that email exists, a reset link has been generated." });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      message: "Password reset link generated.",
      resetToken: process.env.VERCEL ? undefined : token
    });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Password reset request failed" });
  }
}

async function resetPasswordController(req, res) {
  try {
    const body = await readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const token = String(body.token || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!email || !token || !newPassword) {
      sendJson(res, 400, { error: "Email, token, and new password are required" });
      return;
    }

    await resetPassword(email, token, newPassword);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Password reset failed" });
  }
}

async function getApplicationStatus(req, res, url) {
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();

  if (!email) {
    sendJson(res, 400, { error: "Email is required" });
    return;
  }

  const user = await findUserByEmail(email);

  if (!user) {
    sendJson(res, 404, { error: "No application was found for that email" });
    return;
  }

  sendJson(res, 200, {
    application: {
      name: `${user.firstName} ${user.lastName}`,
      product: user.account?.type || user.application?.product || "Current Account",
      status: user.application?.status || user.account?.status || "Pending Approval",
      decisionReason: user.application?.decisionReason || "",
      submittedAt: user.application?.submittedAt || "",
      decidedAt: user.application?.decidedAt || ""
    }
  });
}

module.exports = {
  getApplicationStatus,
  signup,
  login,
  logout,
  handleChangePassword,
  requestPasswordResetController,
  resetPasswordController
};
