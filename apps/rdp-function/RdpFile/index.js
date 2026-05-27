const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// Verifies the short-lived JWT issued by RdpGenerate and returns the
// SmartsoftTallyServer RDP file as an attachment. The base file is the
// template at ../templates/SmartsoftTallyServer.rdp; the companyId from
// the JWT is injected as an environment variable via "alternate shell".
module.exports = async function (context, req) {
  const token = (req.query.token || "").trim();
  if (!token) {
    context.res = { status: 400, body: "token is required" };
    return;
  }

  const signingSecret = process.env.RDP_SIGNING_SECRET;
  const overrideAddress = process.env.RDP_FULL_ADDRESS;
  const overrideUsername = process.env.RDP_USERNAME;

  let claims;
  try {
    claims = jwt.verify(token, signingSecret);
  } catch (err) {
    context.log.warn("Invalid RDP token", err.message);
    context.res = { status: 401, body: "invalid or expired token" };
    return;
  }

  const companyId = claims.companyId;
  const safeCompany = String(companyId).replace(/[^a-zA-Z0-9-]/g, "_");

  const templatePath = path.join(__dirname, "..", "templates", "SmartsoftTallyServer.rdp");
  let base;
  try {
    base = fs.readFileSync(templatePath, "utf8");
  } catch (err) {
    context.log.error("Could not load RDP template", err);
    context.res = { status: 500, body: "RDP template missing" };
    return;
  }

  // Normalize line endings, apply optional overrides, and append the
  // company environment variable.
  let lines = base.replace(/\r?\n/g, "\r\n").trim().split("\r\n");
  if (overrideAddress) {
    lines = lines.map(l => l.startsWith("full address:s:") ? `full address:s:${overrideAddress}` : l);
  }
  if (overrideUsername) {
    lines = lines.map(l => l.startsWith("username:s:") ? `username:s:${overrideUsername}` : l);
  }
  lines.push(`alternate shell:s:cmd /c set ADP_COMPANY_ID=${companyId}`);
  const rdp = lines.join("\r\n");

  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/x-rdp",
      "Content-Disposition": `attachment; filename="SmartsoftTallyServer-${safeCompany}.rdp"`,
      "Cache-Control": "no-store"
    },
    body: rdp
  };
};
