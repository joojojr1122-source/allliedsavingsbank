const fs = require("fs");
const path = require("path");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  if (typeof req.body === "string") {
    try {
      return Promise.resolve(req.body ? JSON.parse(req.body) : {});
    } catch (error) {
      return Promise.reject(statusError(400, "Invalid JSON body"));
    }
  }

  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.on("data", (chunk) => {
      rawBody += chunk;

      if (rawBody.length > 1000000) {
        reject(statusError(413, "Request body is too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(statusError(400, "Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function sendStaticFile(res, rootDirectory, requestedPath) {
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(rootDirectory, safePath);

  if (!filePath.startsWith(rootDirectory)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      const extension = path.extname(filePath).toLowerCase();

      if (!extension || extension === ".html") {
        const indexPath = path.join(rootDirectory, "index.html");
        fs.readFile(indexPath, (indexError, indexContent) => {
          if (indexError) {
            sendJson(res, 404, { error: "Page not found" });
            return;
          }

          res.writeHead(200, {
            "Content-Type": MIME_TYPES[".html"]
          });
          res.end(indexContent);
        });
        return;
      }

      sendJson(res, 404, { error: "Page not found" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream"
    });
    res.end(content);
  });
}

function statusError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  sendJson,
  readJsonBody,
  sendStaticFile
};
