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
    const body = {
      session: instanceId || "default",
      chatId: to,
      text,
    };
    const fallbackBody = {
      session: instanceId || "default",
      to,
      text,
    };
    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        message: "waha_send_request",
        url,
        session: instanceId || "default",
        chatId: to,
        bodyPreview: (text || "").slice(0, 20),
      })
    );
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.WAHA_API_KEY ? { Authorization: `Bearer ${env.WAHA_API_KEY}` } : {}),
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
      const retry = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.WAHA_API_KEY ? { Authorization: `Bearer ${env.WAHA_API_KEY}` } : {}),
        },
        body: JSON.stringify(fallbackBody),
      });
      if (!retry.ok) {
        const retryBody = await retry.text();
        throw new Error(retryBody || `WAHA send failed: ${retry.status}`);
      }
      const payload = await retry.json().catch(() => ({}));
      console.info(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "info",
          message: "waha_send_success_fallback",
        })
      );
      return {
        providerMessageId: payload?.id || payload?.messageId || payload?.data?.id || null,
        status: payload?.status || "sent",
      };
    }
    const payload = await res.json().catch(() => ({}));
    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        message: "waha_send_success_primary",
      })
    );
    return {
      providerMessageId: payload?.id || payload?.messageId || payload?.data?.id || null,
      status: payload?.status || "sent",
    };
  }
}

module.exports = { WahaProvider };
