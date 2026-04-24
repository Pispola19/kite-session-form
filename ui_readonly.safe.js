// Modulo read-only non collegato al sito.

function readReadonlyFieldSnapshot(root = document) {
  return {
    location: root.getElementById("location")?.value || "",
    wind: root.getElementById("wind")?.value || "",
    kiteSize: root.getElementById("kiteSize")?.value || "",
    riderWeight: root.getElementById("weight")?.value || ""
  };
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const snapshot = readReadonlyFieldSnapshot();
    console.log("[READONLY MODULE SNAPSHOT]", snapshot);
  } catch (e) {
    console.warn("[READONLY MODULE ERROR]", e);
  }
});
