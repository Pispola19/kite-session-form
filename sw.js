/**
 * VENTO LIVE — solo per “Salva in Home”. Niente cache: la faccia resta quella viva.
 */
self.addEventListener("install", function (ev) {
  self.skipWaiting();
});
self.addEventListener("activate", function (ev) {
  ev.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", function () {
  /* rete di default, senza intercettare */
});
