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

  function legacyCopy(text, documentRef) {
    if (!documentRef || !documentRef.body || !documentRef.createElement) return false;
    var ta = documentRef.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.boxShadow = "none";
    ta.style.background = "transparent";
    documentRef.body.appendChild(ta);
    if (ta.focus) ta.focus();
    ta.removeAttribute("readonly");
    if (ta.select) ta.select();
    if (ta.setSelectionRange) ta.setSelectionRange(0, text.length);
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

  function flash(btn) {
    if (!btn) return;
    var old = btn.textContent;
    btn.classList.add("ok");
    btn.textContent = "Copied";
    setTimeout(function () {
      btn.classList.remove("ok");
      btn.textContent = old;
    }, 1400);
  }

  function bindSharePage(root) {
    root = root || (typeof document !== "undefined" ? document : null);
    if (!root || !root.querySelectorAll) return;

    function lookup(id) {
      if (root.getElementById) return root.getElementById(id);
      return root.querySelector("#" + id);
    }

    function onCopyPost(btn) {
      var key = btn.getAttribute("data-copy-post");
      var section = root.querySelector('section[data-draft="' + key + '"]');
      copyText(assemblePost(fieldsFromSection(section))).then(function (ok) {
        if (ok) flash(btn);
      });
    }

    function onCopyField(btn) {
      var el = lookup(btn.getAttribute("data-copy"));
      if (!el) return;
      copyText(el.value).then(function (ok) {
        if (ok) flash(btn);
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
