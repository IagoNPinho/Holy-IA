// WAHA/provider inbound bridge for legacy panel persistence.
const { getProvider } = require("../providers/whatsapp/base/providerRegistry");
const { handleProviderInboundEvent } = require("../services/whatsappService");

function log(level, message, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

async function inboundLegacyWebhook(req, res, next) {
  try {
    if (req?.body?.event && req.body.event !== "message") {
      log("info", "provider_inbound_event_ignored", {
        event: req.body.event,
        session: req.body.session || null,
      });
      return res.json({ ok: true, ignored: true });
    }
    const provider = getProvider();
    log("info", "provider_inbound_webhook_received", {
      provider: provider.getName(),
      route: "/api/webhooks/whatsapp/inbound-legacy",
    });

    let normalized;
    try {
      normalized = provider.parseInboundEvent(req.body);
    } catch (error) {
      log("warn", "provider_inbound_parse_failed", {
        error: error?.message || "parse_failed",
      });
      return res.status(400).json({ error: error?.message || "Invalid payload" });
    }

    log("info", "provider_inbound_parsed", {
      externalChatId: normalized.externalChatId || null,
      externalMessageId: normalized.externalMessageId || null,
      contactPhone: normalized.contact?.phone || null,
      bodyPreview: (normalized.message?.text || "").slice(0, 20),
    });

    const result = await handleProviderInboundEvent(normalized);
    return res.json({ ok: true, result });
  } catch (error) {
    return next(error);
  }
}

module.exports = { inboundLegacyWebhook };
