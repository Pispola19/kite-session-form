/**
 * NUOVA_UX — bandierine sul selettore lingua. AR = Lega Araba (non un paese).
 * Il select nativo resta il valore; questa è solo la faccia.
 */
(function initNuovaUxLangFlags(global) {
  "use strict";

  function flagNode(doc, option) {
    const src = option.getAttribute("data-flag");
    if (src) {
      const img = doc.createElement("img");
      img.className = "nuova-ux-lang__flag";
      img.src = src;
      img.alt = "";
      img.width = 18;
      img.height = 12;
      img.decoding = "async";
      return img;
    }
    const span = doc.createElement("span");
    span.className = "nuova-ux-lang__flag nuova-ux-lang__flag--emoji";
    span.setAttribute("aria-hidden", "true");
    const raw = String(option.textContent || "").trim();
    span.textContent = raw.replace(/\s*[A-Z]{2}\s*$/, "").trim() || "";
    return span;
  }

  function codeOf(option) {
    return String(option.value || "").trim().toUpperCase();
  }

  function paintFace(btn, select) {
    const option = select.options[select.selectedIndex] || select.querySelector("option[value=\"" + select.value + "\"]");
    btn.textContent = "";
    if (!option) return;
    btn.appendChild(flagNode(btn.ownerDocument, option));
    const code = btn.ownerDocument.createElement("span");
    code.textContent = codeOf(option);
    btn.appendChild(code);
  }

  function closeUi(btn, list) {
    list.hidden = true;
    list.innerHTML = "";
    btn.setAttribute("aria-expanded", "false");
  }

  function boot(doc) {
    const root = doc || global.document;
    if (!root) return;
    const select = root.getElementById("languageSelect");
    if (!select || select.getAttribute("data-nuova-ux-flags") === "1") return;
    select.setAttribute("data-nuova-ux-flags", "1");
    const nav = select.closest(".nuova-ux-lang") || select.parentNode;
    const box = root.createElement("div");
    box.className = "nuova-ux-lang__box";
    select.parentNode.insertBefore(box, select);
    box.appendChild(select);
    select.classList.add("nuova-ux-lang__native");
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");

    const btn = root.createElement("button");
    btn.type = "button";
    btn.id = "languageSelectUi";
    btn.className = "nuova-ux-lang__btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    const label = nav.querySelector("label");
    if (label) {
      label.setAttribute("for", "languageSelectUi");
    }
    btn.setAttribute("aria-label", (label && label.textContent) || "Language");

    const list = root.createElement("ul");
    list.className = "nuova-ux-lang__list";
    list.hidden = true;
    list.setAttribute("role", "listbox");
    list.id = "languageSelectList";
    btn.setAttribute("aria-controls", list.id);

    function fillList() {
      list.textContent = "";
      Array.prototype.forEach.call(select.options, function (option) {
        const li = root.createElement("li");
        const item = root.createElement("button");
        item.type = "button";
        item.className = "nuova-ux-lang__opt";
        item.setAttribute("role", "option");
        item.setAttribute("data-lang", option.value);
        item.setAttribute("aria-selected", option.value === select.value ? "true" : "false");
        item.appendChild(flagNode(root, option));
        const code = root.createElement("span");
        code.textContent = codeOf(option);
        item.appendChild(code);
        item.addEventListener("click", function () {
          if (select.value !== option.value) {
            select.value = option.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
          closeUi(btn, list);
        });
        li.appendChild(item);
        list.appendChild(li);
      });
    }

    btn.addEventListener("click", function () {
      const open = list.hidden;
      if (open) {
        fillList();
        list.hidden = false;
        btn.setAttribute("aria-expanded", "true");
      } else {
        closeUi(btn, list);
      }
    });

    root.addEventListener("click", function (ev) {
      if (!nav.contains(ev.target)) closeUi(btn, list);
    });
    root.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeUi(btn, list);
    });
    root.addEventListener("nuova-ux-lang", function () {
      paintFace(btn, select);
      if (label) btn.setAttribute("aria-label", label.textContent || "Language");
      if (!list.hidden) fillList();
    });

    box.appendChild(btn);
    box.appendChild(list);
    paintFace(btn, select);
  }

  global.NuovaUxLangFlagsV1 = Object.freeze({ boot });

  if (global.document && global.document.readyState !== "loading") {
    boot(global.document);
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      boot(global.document);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.NuovaUxLangFlagsV1;
}
