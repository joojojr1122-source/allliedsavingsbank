const { readJsonBody, sendJson } = require("../utils/http");
const { createUser, findUserByEmail, publicUser, changePassword } = require("../services/userService");
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
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = await findUserByEmail(email);

    if (!user || !verifyPassword(password, user.password)) {
      sendJson(res, 401, { error: "Email or password is incorrect" });
      return;
    }

    const token = createSession(user.id);

    sendJson(res, 200, {
      token,
      user: publicUser(user)
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

module.exports = {
  signup,
  login,
  logout,
  handleChangePassword
};
