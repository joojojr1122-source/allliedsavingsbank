const crypto = require("crypto");

const sessions = new Map();
const TOKEN_SECRET = process.env.SESSION_SECRET || "local-bank-portal-session-secret";

function createSession(userId) {
  if (process.env.VERCEL) {
    return signToken({ userId, createdAt: Date.now() });
  }

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    userId,
    createdAt: Date.now()
  });
  return token;
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

function getUserIdFromRequest(req) {
  const token = getTokenFromRequest(req);

  if (process.env.VERCEL) {
    const payload = token ? verifyToken(token) : null;
    return payload ? payload.userId : null;
  }

  const session = token ? sessions.get(token) : null;
  return session ? session.userId : null;
}

function deleteSession(token) {
  sessions.delete(token);
}

function signToken(payload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyToken(token) {
  const [body, signature] = String(token || "").split(".");

  if (!body || !signature) {
    return null;
  }

  const expectedSignature = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");

  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

module.exports = {
  createSession,
  getTokenFromRequest,
  getUserIdFromRequest,
  deleteSession
};
