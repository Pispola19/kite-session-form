/**
 * NUOVA_UX — tubo B. Lab innestato: POST LegacyPayload sul DAM già in opera.
 * Niente Google. Niente WhatsApp. Mock solo se la presa è staccata.
 */
(function initNuovaUxTransport(global) {
  "use strict";

  const TIMEOUT_MS = 4000;

  function tt(key) {
    const apply = global.NuovaUxI18nApplyV1;
    if (apply && typeof apply.t === "function") return apply.t(key);
    return key;
  }

  function ports() {
    return global.NuovaUxPortsV1 || {};
  }

  function transportPlugged() {
    const t = ports().transport;
    return !!(t && t.plugged);
  }

  function damSubmitUrl() {
    const routing = global.VENTOLIVE_ROUTING_V1;
    return routing && routing.DAM_SUBMIT_URL ? String(routing.DAM_SUBMIT_URL) : "";
  }

  function failLive(reason) {
    return {
      ok: false,
      durable: false,
      mock: false,
      plugged: true,
      refused: reason || "dam_submit_failed",
      scritta: tt("nuova_ux_transport_failed")
    };
  }

  function mockSubmit(legacy) {
    const id = legacy && legacy.session_id ? String(legacy.session_id) : "mock_receipt";
    return {
      ok: true,
      durable: true,
      mock: true,
      plugged: false,
      receipt: { id: id }
    };
  }

  function refuseLive() {
    return {
      ok: false,
      durable: false,
      mock: false,
      plugged: false,
      refused: "punto_x_not_authorized",
      scritta: tt("nuova_ux_port_unplugged_transport")
    };
  }

  function isDurableOk(sent) {
    return !!(sent && sent.ok === true && sent.durable === true);
  }

  function liveSubmit(legacy) {
    const url = damSubmitUrl();
    if (!url) return Promise.resolve(failLive("dam_url_missing"));
    if (typeof global.fetch !== "function") return Promise.resolve(failLive("fetch_missing"));

    const controller = typeof global.AbortController === "function" ? new global.AbortController() : null;
    let timedOut = false;
    const timer = global.setTimeout(function () {
      timedOut = true;
      if (controller) controller.abort();
    }, TIMEOUT_MS);

    const opts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(legacy || {}),
      cache: "no-store"
    };
    if (controller) opts.signal = controller.signal;

    return global
      .fetch(url, opts)
      .then(function (res) {
        global.clearTimeout(timer);
        return Promise.resolve(res.json())
          .catch(function () {
            return null;
          })
          .then(function (data) {
            const body = data && typeof data === "object" ? data : {};
            const ok = res.ok === true && body.ok === true;
            const durable = ok && body.durable === true;
            if (!durable) return failLive("not_durable");
            return {
              ok: true,
              durable: true,
              mock: false,
              plugged: true,
              receipt: {
                id: String(body.message_id || (legacy && legacy.session_id) || "")
              }
            };
          });
      })
      .catch(function () {
        global.clearTimeout(timer);
        return failLive(timedOut ? "timeout" : "network");
      });
  }

  function submit(legacy) {
    if (!transportPlugged()) return mockSubmit(legacy);
    return liveSubmit(legacy);
  }

  global.NuovaUxTransportV1 = Object.freeze({
    submit: submit,
    liveSubmit: liveSubmit,
    mockSubmit: mockSubmit,
    refuseLive: refuseLive,
    isDurableOk: isDurableOk
  });
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxTransportV1;
}
