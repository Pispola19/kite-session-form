// Modulo futuro per community, share e audio.
// Logica read-only per aggiornare indicatori UI senza toccare submit o payload.
// Nessun impatto su submit, worker path, Google, WhatsApp, payload o localStorage.

(function () {
  function updateReadonlyWindSpeed(root = document) {
    const windInput = root.getElementById("wind");
    const speedEl = root.querySelector(".rs-wind-speed");

    if (!speedEl) {
      return;
    }

    const windValue = windInput?.value.trim() || "";
    speedEl.textContent = windValue ? `Velocità ${windValue} kn` : "Velocità - kn";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const windInput = document.getElementById("wind");

    updateReadonlyWindSpeed();

    if (!windInput) {
      return;
    }

    windInput.addEventListener("input", () => updateReadonlyWindSpeed());
    windInput.addEventListener("change", () => updateReadonlyWindSpeed());
  });
})();
