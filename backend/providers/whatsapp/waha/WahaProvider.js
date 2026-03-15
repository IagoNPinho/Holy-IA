const { WhatsappProvider } = require("../base/WhatsappProvider");
const { mapInbound } = require("./wahaMapper");
const { env } = require("../../../config/env");

class WahaProvider extends WhatsappProvider {
  getName() {
    return "waha";
  }

  parseInboundEvent(body) {
    return mapInbound(body);
  }

  async sendText({ to, text, instanceId }) {
    const baseUrl = env.WAHA_BASE_URL;
    if (!baseUrl) {
      throw new Error("WAHA_BASE_URL not configured");
    }
    if (typeof fetch !== "function") {
      throw new Error("Global fetch is not available");
    }
    const endpoint = env.WAHA_SEND_ENDPOINT || "/api/sendText";
    const url = `${baseUrl}${endpoint}`;
    const normalizedChatId = to && String(to).includes("@") ? String(to) : `${to}@c.us`;
    const body = {
      session: instanceId || "default",
      chatId: normalizedChatId,
      text,
    };
    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        message: "waha_send_request",
        url,
        session: instanceId || "default",
        chatId: normalizedChatId,
        bodyPreview: (text || "").slice(0, 20),
        authMode: env.WAHA_API_KEY ? "x-api-key" : "none",
      })
    );
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.WAHA_API_KEY ? { "X-Api-Key": env.WAHA_API_KEY } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const textBody = await res.text();
      console.warn(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "warn",
          message: "waha_send_failed_primary",
          status: res.status,
          response: textBody || "",
        })
      );
      throw new Error(textBody || `WAHA send failed: ${res.status}`);
    }
    const payload = await res.json().catch(() => ({}));
    const providerMessageId =
      payload?.id?._serialized ||
      payload?._data?.id?._serialized ||
      null;
    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        message: "waha_send_success_primary",
        providerMessageId,
      })
    );
    return {
      providerMessageId,
      status: payload?.status || "sent",
    };
  }
}

module.exports = { WahaProvider };
