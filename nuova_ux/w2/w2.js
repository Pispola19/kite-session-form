/**
 * NUOVA_UX W2 — compilazione sessione → LegacyPayload. Mock durable in lab (non DAM live, non Google).
 * Liste da MOCK_DATA (static_data oggi; fetta attrezzo quando ready). Label via i18n; value payload resta canonico.
 */
(function initNuovaUxW2(global) {
  "use strict";

  const REQUIRED_PATHS = [
    ["weight", "rider.weight"],
    ["board", "board.board"],
    ["level", "rider.level"],
    ["kite", "kite.kite"],
    ["wind", "windUserInput.wind"],
    ["result", "result.result"]
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function data() {
    return global.MOCK_DATA || {};
  }

  function fromA() {
    return global.NuovaUxWindFromA;
  }

  function payloadApi() {
    return global.NuovaUxPayloadLegacyV1;
  }

  function i18nApply() {
    return global.NuovaUxI18nApplyV1;
  }

  function tt(key, vars) {
    const api = i18nApply();
    if (api && typeof api.t === "function") return api.t(key, vars);
    return key;
  }

  function sortLang() {
    const api = i18nApply();
    return (api && api.currentLang()) || global.__ventoLiveUiLang || "it";
  }

  function canonicalMap(key) {
    const canon = (data().CANONICAL_VALUES || {})[key] || {};
    return Object.keys(canon);
  }

  function brands() {
    return (data().BRAND_LIST || []).slice().sort(function (a, b) {
      return String(a).localeCompare(String(b), sortLang());
    });
  }

  function modelsForBrand(brand) {
    const map = data().MODELS_BY_BRAND || {};
    const list = map[brand] ? map[brand].slice() : [];
    return list.concat(["Other"]);
  }

  function sizesForBoard(boardType) {
    const map = data().BOARD_SIZE_BY_TYPE || {};
    const list = map[boardType] ? map[boardType].slice() : [];
    return list.concat(["Other"]);
  }

  function labeledItems(values, category) {
    const apply = i18nApply();
    return values.map(function (v) {
      return {
        name: v,
        label: apply ? apply.optionLabel(category, v) : String(v)
      };
    });
  }

  function comboVal(root, name, category) {
    const el = root.querySelector('[data-w2="' + name + '"]');
    if (!el) return "";
    const stored = el.getAttribute("data-canonical");
    if (stored) return stored;
    const apply = i18nApply();
    if (category && apply) return apply.optionCanonical(category, el.value);
    return el.value;
  }

  function setAppear(root, key, on) {
    const el = root.querySelector('[data-w2-appear="' + key + '"]');
    if (!el) return;
    el.hidden = !on;
    if (!on) {
      const input = el.querySelector("input, textarea");
      if (input) input.value = "";
    }
  }

  function syncAppear(root) {
    setAppear(root, "boardSizeOther", comboVal(root, "boardSize", "boardSize") === "Other");
    setAppear(root, "modelOther", comboVal(root, "model", "model") === "Other");
  }

  function phoneFace() {
    if (typeof global.matchMedia !== "function") return false;
    try {
      return global.matchMedia("(max-width: 55.99rem)").matches;
    } catch (_e) {
      return false;
    }
  }

  function keepSessionOpen(root) {
    if (!root || String(root.tagName || "").toUpperCase() !== "DETAILS") return;
    if (phoneFace()) root.open = true;
  }

  function openForCompile(root) {
    if (root && root.tagName === "DETAILS") root.open = true;
  }

  function attachCombo(input, listEl, getValues, category, onCommit) {
    const filterApi = fromA();
    function hideOthers() {
      const slot = listEl.closest("[data-slot=\"w2\"]") || document;
      slot.querySelectorAll(".w2-combo-list").forEach(function (other) {
        if (other !== listEl) other.hidden = true;
      });
    }
    function paint(typed) {
      hideOthers();
      const items = labeledItems(getValues(), category);
      const filtered = filterApi
        ? filterApi.prefixFilter(items, typed)
        : items.filter(function (c) {
            const q = String(typed || "").trim().toLowerCase();
            if (!q) return true;
            return (
              String(c.label).toLowerCase().indexOf(q) === 0 ||
              String(c.name).toLowerCase().indexOf(q) === 0
            );
          });
      listEl.innerHTML = "";
      if (!filtered.length) {
        listEl.hidden = true;
        return;
      }
      filtered.forEach(function (c) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = c.label;
        btn.addEventListener("mousedown", function (ev) {
          ev.preventDefault();
          input.value = c.label;
          input.setAttribute("data-canonical", c.name);
          listEl.hidden = true;
          if (onCommit) onCommit(c.name);
        });
        li.appendChild(btn);
        listEl.appendChild(li);
      });
      listEl.hidden = false;
    }
    input.addEventListener("input", function () {
      input.removeAttribute("data-canonical");
      paint(input.value);
    });
    input.addEventListener("focus", function () {
      paint(input.value);
    });
    input.addEventListener("blur", function () {
      window.setTimeout(function () {
        listEl.hidden = true;
      }, 120);
    });
  }

  function markField(fieldEl, ok) {
    if (!fieldEl) return;
    fieldEl.classList.toggle("is-ok", ok);
    fieldEl.classList.toggle("is-missing", !ok);
  }

  function resetAfterDurable(root) {
    if (!root) return;
    [
      "wind",
      "result",
      "note",
      "weight",
      "level",
      "gender",
      "board",
      "boardSize",
      "boardSizeOther",
      "brand",
      "model",
      "modelOther",
      "kite"
    ].forEach(function (name) {
      const el = root.querySelector('[data-w2="' + name + '"]');
      if (!el) return;
      el.value = "";
      el.removeAttribute("data-canonical");
    });
    root.querySelectorAll(".w2-field").forEach(function (wrap) {
      wrap.classList.remove("is-ok", "is-missing");
    });
    root.querySelectorAll(".w2-combo-list").forEach(function (list) {
      list.hidden = true;
    });
    restoreKit(root);
    syncAppear(root);
    if (root.tagName === "DETAILS") {
      if (phoneFace()) root.open = true;
      else root.open = false;
    }
  }

  function kitSnapshot(root) {
    return {
      level: comboVal(root, "level", "level"),
      gender: comboVal(root, "gender", "gender"),
      board: comboVal(root, "board", "board"),
      boardSize: comboVal(root, "boardSize", "boardSize"),
      boardSizeOther: (function () {
        const el = root.querySelector('[data-w2="boardSizeOther"]');
        return el ? el.value : "";
      })(),
      brand: comboVal(root, "brand", "brand")
    };
  }

  function paintStoredField(root, name, category, value) {
    const el = root.querySelector('[data-w2="' + name + '"]');
    if (!el || value == null || String(value).trim() === "") return;
    const apply = i18nApply();
    if (category) {
      el.setAttribute("data-canonical", String(value));
      el.value = apply ? apply.optionLabel(category, value) : String(value);
      if (!el.value) el.value = String(value);
    } else {
      el.value = String(value);
    }
  }

  function restoreKit(root) {
    const memory = global.NuovaUxLocalConvenienceV1;
    if (!memory || !root) return;
    const weightEl = root.querySelector('[data-w2="weight"]');
    if (weightEl) weightEl.value = memory.readStoredWeight() || "";
    const kit = typeof memory.readStoredKit === "function" ? memory.readStoredKit() : {};
    paintStoredField(root, "level", "level", kit.level);
    paintStoredField(root, "gender", "gender", kit.gender);
    paintStoredField(root, "board", "board", kit.board);
    paintStoredField(root, "boardSize", "boardSize", kit.boardSize);
    paintStoredField(root, "boardSizeOther", "", kit.boardSizeOther);
    paintStoredField(root, "brand", "brand", kit.brand);
  }

  function saveKit(root) {
    const memory = global.NuovaUxLocalConvenienceV1;
    if (!memory) return;
    const weightEl = root.querySelector('[data-w2="weight"]');
    if (weightEl && typeof memory.writeStoredWeight === "function") {
      memory.writeStoredWeight(weightEl.value);
    }
    if (typeof memory.writeStoredKit === "function") memory.writeStoredKit(kitSnapshot(root));
  }

  function readUiState(root) {
    function val(name) {
      const el = root.querySelector('[data-w2="' + name + '"]');
      return el ? el.value : "";
    }
    const genderRaw = comboVal(root, "gender", "gender");
    return {
      rider: {
        weight: val("weight"),
        gender: genderRaw === "" ? null : genderRaw,
        level: comboVal(root, "level", "level")
      },
      board: {
        board: comboVal(root, "board", "board"),
        boardSize: comboVal(root, "boardSize", "boardSize"),
        boardSizeOtherText: val("boardSizeOther")
      },
      kite: {
        kite: val("kite"),
        brand: comboVal(root, "brand", "brand"),
        model: comboVal(root, "model", "model"),
        modelOtherText: val("modelOther")
      },
      windUserInput: { wind: val("wind") },
      spot: { location: val("location") },
      water: { water: comboVal(root, "water", "water") },
      result: { result: comboVal(root, "result", "result") },
      note: { note: val("note") },
      meta: { ui_version: "nuova_ux_lab_v1", submit_channel: "dam" }
    };
  }

  function validate(root) {
    const api = payloadApi();
    const uiState = readUiState(root);
    const legacy = api.toLegacyPayload(api.buildPayloadContractV1(uiState, api.buildRuntimeMeta()));
    const missing = api.missingRequired(legacy);
    REQUIRED_PATHS.forEach(function (pair) {
      const field = pair[0];
      const wrap = root.querySelector('[data-w2-field="' + field + '"]');
      markField(wrap, missing.indexOf(field) === -1);
    });
    return { uiState: uiState, missing: missing };
  }

  function firstMissingEl(root, missing) {
    if (!missing.length) return null;
    return root.querySelector('[data-w2="' + missing[0] + '"]');
  }

  function boot(root) {
    const api = payloadApi();
    if (!root || !api) return;

    root.classList.remove("nuova-ux-slot--dormant");
    keepSessionOpen(root);
    const errEl = $("[data-w2-err]", root);
    const thanksEl = $("[data-w2-thanks]", root);
    const memory = global.NuovaUxLocalConvenienceV1;

    restoreKit(root);
    if (memory && typeof global.matchMedia === "function") {
      try {
        const mq = global.matchMedia("(max-width: 55.99rem)");
        const onWidth = function () {
          keepSessionOpen(root);
        };
        if (typeof mq.addEventListener === "function") mq.addEventListener("change", onWidth);
        else if (typeof mq.addListener === "function") mq.addListener(onWidth);
      } catch (_e) {}
    }

    attachCombo($('[data-w2="level"]', root), $('[data-w2-list="level"]', root), function () {
      return canonicalMap("level");
    }, "level");
    attachCombo($('[data-w2="gender"]', root), $('[data-w2-list="gender"]', root), function () {
      return canonicalMap("gender");
    }, "gender");
    attachCombo($('[data-w2="board"]', root), $('[data-w2-list="board"]', root), function () {
      return canonicalMap("board");
    }, "board", function () {
      const size = $('[data-w2="boardSize"]', root);
      if (size) {
        size.value = "";
        size.removeAttribute("data-canonical");
      }
      syncAppear(root);
    });
    attachCombo($('[data-w2="boardSize"]', root), $('[data-w2-list="boardSize"]', root), function () {
      return sizesForBoard(comboVal(root, "board", "board"));
    }, "boardSize", function () {
      syncAppear(root);
    });
    attachCombo($('[data-w2="brand"]', root), $('[data-w2-list="brand"]', root), function () {
      return brands();
    }, "brand", function () {
      const model = $('[data-w2="model"]', root);
      if (model) {
        model.value = "";
        model.removeAttribute("data-canonical");
      }
      syncAppear(root);
    });
    attachCombo($('[data-w2="model"]', root), $('[data-w2-list="model"]', root), function () {
      return modelsForBrand(comboVal(root, "brand", "brand"));
    }, "model", function () {
      syncAppear(root);
    });
    attachCombo($('[data-w2="water"]', root), $('[data-w2-list="water"]', root), function () {
      return canonicalMap("water");
    }, "water");
    attachCombo($('[data-w2="result"]', root), $('[data-w2-list="result"]', root), function () {
      return canonicalMap("result");
    }, "result");

    [
      "weight",
      "level",
      "gender",
      "board",
      "boardSize",
      "boardSizeOther",
      "brand",
      "model",
      "modelOther",
      "kite"
    ].forEach(function (name) {
      const el = root.querySelector('[data-w2="' + name + '"]');
      if (!el) return;
      el.addEventListener("blur", function () {
        saveKit(root);
      });
    });

    syncAppear(root);

    REQUIRED_PATHS.forEach(function (pair) {
      const input = root.querySelector('[data-w2="' + pair[0] + '"]');
      if (!input) return;
      input.addEventListener("blur", function () {
        validate(root);
      });
    });

    document.addEventListener("nuova-ux-spot", function (ev) {
      const detail = ev && ev.detail;
      if (!detail || detail.from === "w2") return;
      const loc = detail.location;
      const locInput = $('[data-w2="location"]', root);
      if (locInput && loc != null) locInput.value = loc;
      if (detail.openSession && !phoneFace()) openForCompile(root);
    });

    const locInput = $('[data-w2="location"]', root);
    if (locInput) {
      locInput.addEventListener("input", function () {
        if (typeof global.CustomEvent !== "function") return;
        document.dispatchEvent(
          new global.CustomEvent("nuova-ux-spot", {
            detail: {
              location: locInput.value,
              from: "w2",
              openSession: false
            }
          })
        );
      });
    }

    document.addEventListener("nuova-ux-lang", function () {
      const apply = i18nApply();
      if (!apply) return;
      root.querySelectorAll("[data-w2][data-canonical][data-option-cat]").forEach(function (el) {
        el.value = apply.optionLabel(el.getAttribute("data-option-cat"), el.getAttribute("data-canonical"));
      });
      if (thanksEl && !thanksEl.hidden) {
        thanksEl.textContent = tt("nuova_ux_thanks_rider");
      }
      if (errEl && !errEl.hidden && errEl.getAttribute("data-missing")) {
        errEl.textContent = tt("nuova_ux_missing", {
          fields: errEl.getAttribute("data-missing")
        });
      }
    });

    const form = $("[data-w2-form]", root);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (thanksEl) thanksEl.hidden = true;
      const checked = validate(root);
      if (checked.missing.length) {
        openForCompile(root);
        if (errEl) {
          errEl.hidden = false;
          errEl.setAttribute("data-missing", checked.missing.join(", "));
          errEl.textContent = tt("nuova_ux_missing", {
            fields: checked.missing.join(", ")
          });
        }
        const focusEl = firstMissingEl(root, checked.missing);
        if (focusEl) focusEl.focus();
        return;
      }
      const meta = api.buildRuntimeMeta();
      const contract = api.buildPayloadContractV1(checked.uiState, meta);
      const legacy = api.toLegacyPayload(contract);
      const leak = api.assertNoWindDisplayLeak(legacy);
      if (leak.length) {
        if (errEl) {
          errEl.hidden = false;
          errEl.removeAttribute("data-missing");
          errEl.textContent = tt("nuova_ux_payload_invalid");
        }
        return;
      }
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = "";
        errEl.removeAttribute("data-missing");
      }
      const transport = global.NuovaUxTransportV1;
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      const pending =
        transport && typeof transport.submit === "function"
          ? transport.submit(legacy)
          : { ok: true, durable: true, mock: true };
      Promise.resolve(pending)
        .then(function (sent) {
          if (submitBtn) submitBtn.disabled = false;
          const durableOk =
            transport && typeof transport.isDurableOk === "function"
              ? transport.isDurableOk(sent)
              : !!(sent && sent.ok && sent.durable);
          if (!durableOk) {
            if (errEl) {
              errEl.hidden = false;
              errEl.textContent = (sent && sent.scritta) || tt("nuova_ux_transport_failed");
            }
            return;
          }
          saveKit(root);
          root.setAttribute("data-w2-last-session", legacy.session_id);
          if (typeof global.CustomEvent === "function") {
            document.dispatchEvent(
              new global.CustomEvent("nuova-ux-durable", {
                detail: {
                  session_id: legacy.session_id,
                  receipt_id: sent.receipt && sent.receipt.id ? String(sent.receipt.id) : "",
                  mock: !!sent.mock,
                  legacy: legacy
                }
              })
            );
          }
          resetAfterDurable(root);
        })
        .catch(function () {
          if (submitBtn) submitBtn.disabled = false;
          if (errEl) {
            errEl.hidden = false;
            errEl.textContent = tt("nuova_ux_transport_failed");
          }
        });
    });
  }

  global.NuovaUxW2 = Object.freeze({ boot, readUiState, validate, syncAppear, resetAfterDurable });

  if (global.document && global.document.readyState !== "loading") {
    boot(global.document.querySelector("[data-slot=w2]"));
  } else if (global.document) {
    global.document.addEventListener("DOMContentLoaded", function () {
      boot(global.document.querySelector("[data-slot=w2]"));
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
