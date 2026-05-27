const jwt = require("jsonwebtoken");

module.exports = async function (context, req) {
  const companyId = req.query.companyId;

  if (!companyId) {
    context.res = {
      status: 400,
      body: { error: "companyId is required" }
    };
    return;
  }

  const gatewayHost = process.env.RDP_GATEWAY_HOST;
  const sessionHost = process.env.RDP_SESSION_HOST;
  const signingSecret = process.env.RDP_SIGNING_SECRET;
  const ttlSeconds = parseInt(process.env.RDP_TOKEN_TTL_SECONDS || "300", 10);

  const token = jwt.sign({ companyId }, signingSecret, { expiresIn: ttlSeconds });

  const rdpBody = [
    "screen mode id:i:2",
    "use multimon:i:0",
    "desktopwidth:i:1920",
    "desktopheight:i:1080",
    `full address:s:${sessionHost}`,
    `gatewayhostname:s:${gatewayHost}`,
    "gatewayusagemethod:i:1",
    "promptcredentialonce:i:1",
    `alternate shell:s:cmd /c set ADP_COMPANY_ID=${companyId}`
  ].join("\r\n");

  const rdpDownloadUrl = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/rdp/file?token=${encodeURIComponent(token)}`;

  context.res = {
    status: 200,
    headers: {
      "content-type": "application/json"
    },
    body: {
      companyId,
      sessionHost,
      rdpDownloadUrl,
      inlineRdp: Buffer.from(rdpBody, "utf8").toString("base64")
    }
  };
};
