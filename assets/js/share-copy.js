/** iPhone one-copy for /share/ drafts. Clipboard API, then iOS-safe fallback. */
(function (root) {
  function assemblePost(fields) {
    fields = fields || {};
    var title = String(fields.title || "").trim();
    var body = String(fields.body || "").trim();
    if (title && body) return title + "\n\n" + body;
    return title || body;
  }

  function fieldsFromSection(section) {
    var fields = {};
    if (!section || !section.querySelectorAll) return fields;
    var nodes = section.querySelectorAll("textarea[data-field]");
    for (var i = 0; i < nodes.length; i++) {
      fields[nodes[i].getAttribute("data-field")] = nodes[i].value;
    }
    return fields;
  }

  function selectVisible(el) {
    if (!el) return;
    if (el.focus) el.focus();
    if (el.select) el.select();
    if (el.setSelectionRange && typeof el.value === "string") {
      el.setSelectionRange(0, el.value.length);
    }
  }

  function legacyCopy(text, documentRef) {
    if (!documentRef || !documentRef.body || !documentRef.createElement) return false;
    var ta = documentRef.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    // iOS: keep readonly, keep the field large enough to select, 12pt avoids zoom.
    ta.style.fontSize = "12pt";
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "2em";
    ta.style.height = "2em";
    ta.style.padding = "0";
    ta.style.margin = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.boxShadow = "none";
    ta.style.background = "transparent";
    ta.style.opacity = "0.01";
    documentRef.body.appendChild(ta);
    if (ta.focus) ta.focus();
    if (ta.setSelectionRange) ta.setSelectionRange(0, text.length);
    if (ta.select) ta.select();
    var ok = false;
    try {
      ok = !!(documentRef.execCommand && documentRef.execCommand("copy"));
    } catch (e) {
      ok = false;
    }
    documentRef.body.removeChild(ta);
    return ok;
  }

  function copyText(text, env) {
    env = env || {};
    var clipboard = env.clipboard;
    if (!clipboard && typeof navigator !== "undefined") clipboard = navigator.clipboard;
    var documentRef = env.document;
    if (!documentRef && typeof document !== "undefined") documentRef = document;

    function viaLegacy() {
      return Promise.resolve(legacyCopy(text, documentRef));
    }

    if (clipboard && clipboard.writeText) {
      try {
        var written = clipboard.writeText(text);
        if (written && typeof written.then === "function") {
          return written.then(function () { return true; }).catch(viaLegacy);
        }
        return Promise.resolve(true);
      } catch (e) {
        return viaLegacy();
      }
    }
    return viaLegacy();
  }

  function flash(btn, ok) {
    if (!btn) return;
    var old = btn.textContent;
    if (ok) {
      btn.classList.add("ok");
      btn.textContent = "Copied";
    } else {
      btn.textContent = "Hold the box";
    }
    setTimeout(function () {
      btn.classList.remove("ok");
      btn.textContent = old;
    }, 1600);
  }

  function visibleField(section, id) {
    if (id) {
      var byId = section && section.ownerDocument
        ? section.ownerDocument.getElementById(id)
        : null;
      if (byId) return byId;
    }
    if (!section || !section.querySelector) return null;
    return section.querySelector('textarea[data-field="body"]')
      || section.querySelector("textarea");
  }

  function bindSharePage(root, env) {
    root = root || (typeof document !== "undefined" ? document : null);
    if (!root || !root.querySelectorAll) return;
    env = env || {};

    function lookup(id) {
      if (!id) return null;
      if (root.getElementById) return root.getElementById(id);
      return root.querySelector ? root.querySelector("#" + id) : null;
    }

    function onCopyPost(btn) {
      var key = btn.getAttribute("data-copy-post");
      var section = root.querySelector('section[data-draft="' + key + '"]');
      var text = assemblePost(fieldsFromSection(section));
      copyText(text, env).then(function (ok) {
        if (!ok) selectVisible(visibleField(section));
        flash(btn, ok);
      });
    }

    function onCopyField(btn) {
      var el = lookup(btn.getAttribute("data-copy"));
      if (!el) return;
      copyText(el.value, env).then(function (ok) {
        if (!ok) selectVisible(el);
        flash(btn, ok);
      });
    }

    var posts = root.querySelectorAll("button.copy[data-copy-post]");
    for (var i = 0; i < posts.length; i++) {
      posts[i].addEventListener("click", function (ev) {
        onCopyPost(ev.currentTarget);
      });
    }
    var fieldBtns = root.querySelectorAll("button.copy[data-copy]");
    for (var j = 0; j < fieldBtns.length; j++) {
      fieldBtns[j].addEventListener("click", function (ev) {
        onCopyField(ev.currentTarget);
      });
    }
    var areas = root.querySelectorAll("textarea");
    for (var k = 0; k < areas.length; k++) {
      areas[k].addEventListener("focus", function (ev) {
        ev.currentTarget.select();
      });
    }
  }

  var api = {
    assemblePost: assemblePost,
    copyText: copyText,
    fieldsFromSection: fieldsFromSection,
    bindSharePage: bindSharePage,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.ShareCopy = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
