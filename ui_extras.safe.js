// Modulo futuro per community, share e audio.
// Logica read-only per aggiornare indicatori UI senza toccare submit o payload.
// Nessun impatto su submit, worker path, Google, WhatsApp, payload o localStorage.

(function () {
  const SPOT_ALIASES = {
    "is solinas": "Is Solinas",
    "punta trettu": "Punta Trettu",
    "porto botte": "Porto Botte",
    "porto pollo": "Porto Pollo"
  };

  function normalizeReadonlySpotName(value) {
    const cleaned = String(value || "").trim().replace(/\s+/g, " ");
    const alias = SPOT_ALIASES[cleaned.toLowerCase()];

    if (alias) {
      return alias;
    }

    return cleaned
      .split(" ")
      .map((word) => word ? `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}` : "")
      .join(" ");
  }

  function updateReadonlySpotValue() {
    const locationInput = document.getElementById("location");
    const spotEl = document.querySelector(".rs-spot-value");

    if (!spotEl) {
      return;
    }

    const spotValue = normalizeReadonlySpotName(locationInput?.value || "");
    spotEl.textContent = spotValue || "-";
  }

  function updateReadonlyRiderWind() {
    const windInput = document.getElementById("wind");
    const riderEl = document.querySelector(".rs-rider-value");

    if (!riderEl) {
      return;
    }

    const windValue = windInput?.value.trim() || "";
    riderEl.textContent = windValue ? `${windValue} kn` : "-";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const locationInput = document.getElementById("location");
    const windInput = document.getElementById("wind");

    updateReadonlySpotValue();
    updateReadonlyRiderWind();

    if (locationInput) {
      locationInput.addEventListener("input", () => updateReadonlySpotValue());
      locationInput.addEventListener("change", () => updateReadonlySpotValue());
    }

    if (!windInput) {
      return;
    }

    windInput.addEventListener("input", () => updateReadonlyRiderWind());
    windInput.addEventListener("change", () => updateReadonlyRiderWind());
  });
})();
