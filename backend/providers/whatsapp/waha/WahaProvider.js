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

  async fetchRecentMessages({ sessionId, externalChatId, limit, before }) {
    const baseUrl = env.WAHA_BASE_URL;
    if (!baseUrl) {
      throw new Error("WAHA_BASE_URL not configured");
    }
    if (typeof fetch !== "function") {
      throw new Error("Global fetch is not available");
    }
    const endpoint = env.WAHA_MESSAGES_ENDPOINT || "/api/messages";
    const method = (env.WAHA_MESSAGES_METHOD || "POST").toUpperCase();
    const normalizedChatId =
      externalChatId && String(externalChatId).includes("@")
        ? String(externalChatId)
        : `${externalChatId}@c.us`;
    const payload = {
      session: sessionId || "default",
      chatId: normalizedChatId,
      limit: Number(limit) || 50,
      before: before || null,
    };

    let url = `${baseUrl}${endpoint}`;
    let body = null;
    if (method === "GET") {
      const params = new URLSearchParams();
      params.set("session", payload.session);
      params.set("chatId", payload.chatId);
      params.set("limit", String(payload.limit));
      if (payload.before) params.set("before", payload.before);
      url = `${url}?${params.toString()}`;
    } else {
      body = JSON.stringify(payload);
    }

    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        message: "waha_history_request",
        url,
        method,
        session: payload.session,
        chatId: payload.chatId,
        limit: payload.limit,
      })
    );

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(env.WAHA_API_KEY ? { "X-Api-Key": env.WAHA_API_KEY } : {}),
      },
      body,
    });

    if (!res.ok) {
      const textBody = await res.text();
      console.warn(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "warn",
          message: "waha_history_failed",
          status: res.status,
          response: textBody || "",
        })
      );
      throw new Error(textBody || `WAHA history failed: ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.payload)
            ? data.payload
            : [];

    return list.map((item) => ({
      externalMessageId:
        item?.id?._serialized || item?.id || item?.messageId || item?.key?.id || null,
      externalChatId:
        item?.from || item?.chatId || item?.to || normalizedChatId || externalChatId,
      text: item?.body || item?.text || item?.message?.text || "",
      timestamp: item?.timestamp || item?.t || item?.message?.timestamp || null,
      fromMe: item?.fromMe ?? item?.key?.fromMe ?? false,
      messageType: item?.type || item?.message?.type || "text",
    }));
  }
}

module.exports = { WahaProvider };
