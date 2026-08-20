/* ==========================================================================
   Skill Shelf — app.js
   Vanilla JS. No dependencies. GitHub Pages subpath safe.

   Everything is resolved against BASE (the directory containing app.js), so
   the site works at "/" and under "/repository/".
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
   * Base path resolution
   * ---------------------------------------------------------------------- */

  var currentScript =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();

  // The script lives at <repo-root>/assets/app.js, so the repo root is the
  // script's directory with "/assets/" stripped off.
  function getBase() {
    var src = currentScript.src || "";
    var m = src.match(/^(.*\/)assets\/[^/?#]+\.js(?:[?#].*)?$/);
    if (m) return m[1];
    var i = src.lastIndexOf("/");
    return i === -1 ? "./" : src.slice(0, i + 1);
  }

  var BASE = getBase();

  // Stored skill paths may be absolute ("/skills/x/skill.md") or relative.
  // Normalize to a path relative to BASE so subpath deploys keep working.
  function resolve(path) {
    var clean = String(path || "").replace(/^\/+/, "");
    if (!clean) return BASE;
    return BASE + clean;
  }

  function absoluteUrl(path) {
    var resolved = resolve(path);
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(resolved)
      ? resolved
      : location.origin + resolved;
  }

  /* ------------------------------------------------------------------------
   * Utilities
   * ---------------------------------------------------------------------- */

  var app = document.getElementById("app");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var toastTimer = null;
  function toast(msg) {
    var node = document.getElementById("toast");
    if (!node) return;
    node.textContent = msg;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove("show");
    }, 2000);
  }

  function copyText(text, successMsg) {
    var done = function () {
      toast(successMsg || "Copied to clipboard");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        legacyCopy(text, done);
      });
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
    done();
  }

  /* ------------------------------------------------------------------------
   * Theme toggle
   * ---------------------------------------------------------------------- */

  var themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("ss-theme", next);
      } catch (e) {}
    });
  }

  /* ------------------------------------------------------------------------
   * Markdown renderer (dependency-free, XSS-safe)
   * ---------------------------------------------------------------------- */

  function inline(t) {
    return escapeHtml(t)
      .replace(/`([^`\n]+)`/g, function (m, code) {
        return "<code>" + code + "</code>";
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>") // ordered: bold first
      .replace(/(^|[^_])\_([^_\n]+)\_/g, "$1<em>$2</em>")
      .replace(/~~([^~\n]+)~~/g, "<del>$1</del>")
      .replace(
        /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
        '<img src="$2" alt="$1" loading="lazy">'
      )
      .replace(
        /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
        '<a href="$2">$1</a>'
      )
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2">$2</a>');
  }

  function codeblock(lang, code) {
    var label = lang || "text";
    return (
      '<div class="codeblock"><div class="codeblock-head">' +
      '<span class="codeblock-lang">' +
      escapeHtml(label) +
      "</span>" +
      '<button class="copy-code-btn" type="button" data-copy-code="' +
      escapeHtml(escapeHtml(code)) +
      '">Copy</button></div>' +
      "<pre><code>" +
      escapeHtml(code) +
      "</code></pre></div>"
    );
  }

  function parseRow(line) {
    return line
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map(function (c) {
        return c.trim();
      });
  }

  var BLOCK_RE = /^(#{1,6}\s|\s*([-*_]\s*){3,}$|\s*>\s?|\s*[-+*]\s+|\s*\d+[.)]\s+)/;

  function markdownToHtml(src) {
    src = String(src || "").replace(/\r\n/g, "\n");

    // Extract fenced code blocks first so their contents stay raw.
    var blocks = {};
    var counter = 0;
    src = src.replace(/```([^\n]*)\n?([\s\S]*?)(?:```|$)/g, function (m, lang, body) {
      var key = "\u0000C" + counter++ + "\u0000";
      blocks[key] = codeblock(lang.trim(), body.replace(/\n+$/, ""));
      return key;
    });

    var lines = src.split("\n");
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();

      // Blank
      if (!trimmed) {
        i++;
        continue;
      }

      // Restore extracted code block
      if (blocks[trimmed]) {
        out.push(blocks[trimmed]);
        i++;
        continue;
      }

      // Heading
      var heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        var lvl = heading[1].length;
        out.push("<h" + lvl + ">" + inline(heading[2]) + "</h" + lvl + ">");
        i++;
        continue;
      }

      // Horizontal rule
      if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
        out.push("<hr>");
        i++;
        continue;
      }

      // Blockquote
      if (/^\s*>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        out.push("<blockquote>" + markdownToHtml(quote.join("\n")) + "</blockquote>");
        continue;
      }

      // Unordered list
      var ul = line.match(/^\s*[-+*]\s+(.*)$/);
      if (ul) {
        var items = [];
        while (i < lines.length) {
          var m = lines[i].match(/^\s*[-+*]\s+(.*)$/);
          if (!m) break;
          items.push("<li>" + inline(m[1]) + "</li>");
          i++;
        }
        out.push("<ul>" + items.join("") + "</ul>");
        continue;
      }

      // Ordered list
      var ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ol) {
        var oitems = [];
        while (i < lines.length) {
          var om = lines[i].match(/^\s*\d+[.)]\s+(.*)$/);
          if (!om) break;
          oitems.push("<li>" + inline(om[1]) + "</li>");
          i++;
        }
        out.push("<ol>" + oitems.join("") + "</ol>");
        continue;
      }

      // Table (header + delimiter row)
      if (
        line.includes("|") &&
        i + 1 < lines.length &&
        /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
        lines[i + 1].includes("-")
      ) {
        var headers = parseRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].includes("|")) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        var thead = headers
          .map(function (h) {
            return "<th>" + inline(h) + "</th>";
          })
          .join("");
        var tbody = rows
          .map(function (r) {
            return (
              "<tr>" +
              r
                .map(function (c) {
                  return "<td>" + inline(c) + "</td>";
                })
                .join("") +
              "</tr>"
            );
          })
          .join("");
        out.push(
          '<div class="table-wrap"><table><thead><tr>' +
            thead +
            "</tr></thead><tbody>" +
            tbody +
            "</tbody></table></div>"
        );
        continue;
      }

      // Paragraph: collect until a blank line or new block
      var para = [];
      while (i < lines.length) {
        var l = lines[i];
        var t = l.trim();
        if (
          !t ||
          blocks[t] ||
          BLOCK_RE.test(l) ||
          (l.includes("|") &&
            i + 1 < lines.length &&
            /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]))
        ) {
          break;
        }
        para.push(l);
        i++;
      }
      if (para.length) {
        out.push("<p>" + inline(para.join(" ")) + "</p>");
      }
    }

    return out.join("\n");
  }

  // Strip YAML front matter ("---" ... "---") so metadata stays in index.json
  // while keeping the raw .md self-describing for agents.
  function stripFrontMatter(src) {
    var s = String(src || "").replace(/^\uFEFF/, "");
    if (/^---[\s\S]*?---/.test(s)) {
      var rest = s.replace(/^---[\s\S]*?---/, "");
      return rest.replace(/^\n+/, "");
    }
    return s;
  }

  /* ------------------------------------------------------------------------
   * State
   * ---------------------------------------------------------------------- */

  var state = {
    skills: [],
    query: "",
    category: "All",
    loaded: false,
  };

  function normalizeSlug(slug) {
    return String(slug || "").replace(/\/+$/, "");
  }

  function findSkill(slug) {
    var target = normalizeSlug(slug);
    for (var k = 0; k < state.skills.length; k++) {
      if (state.skills[k].slug === target) return state.skills[k];
    }
    return null;
  }

  function getCategories() {
    var map = {};
    state.skills.forEach(function (s) {
      if (s.category) map[s.category] = true;
    });
    return Object.keys(map).sort();
  }

  /* ------------------------------------------------------------------------
   * Router
   * ---------------------------------------------------------------------- */

  function currentRoute() {
    var hash = location.hash || "#/";
    var m = hash.match(/^#\/skills\/([^/?#]+)/);
    if (m) return { view: "skill", slug: decodeURIComponent(m[1]) };
    return { view: "list" };
  }

  function router() {
    var route = currentRoute();
    window.scrollTo({ top: 0, behavior: "auto" });
    if (route.view === "skill") {
      renderSkill(route.slug);
    } else {
      renderList();
    }
  }

  window.addEventListener("hashchange", router);

  /* ------------------------------------------------------------------------
   * List view
   * ---------------------------------------------------------------------- */

  function filteredSkills() {
    var q = state.query.trim().toLowerCase();
    return state.skills.filter(function (s) {
      var inCategory =
        state.category === "All" || s.category === state.category;
      if (!inCategory) return false;
      if (!q) return true;
      var haystack = [
        s.name,
        s.description,
        s.category,
        s.version,
        (s.tags || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }

  function buildCard(s) {
    var card = el("article", "card");

    var top = el("div", "card-top");
    var badge = el("span", "badge", s.category || "General");
    top.appendChild(badge);
    card.appendChild(top);

    var h3 = el("h3");
    var link = el("a", null, s.name);
    link.href = "#/skills/" + s.slug;
    h3.appendChild(link);
    card.appendChild(h3);

    card.appendChild(el("p", "desc", s.description || ""));

    if (s.tags && s.tags.length) {
      var tags = el("div", "tags");
      s.tags.forEach(function (t) {
        tags.appendChild(el("span", "tag", t));
      });
      card.appendChild(tags);
    }

    var actions = el("div", "card-actions");
    var viewBtn = el("a", "btn btn-primary", "View Skill");
    viewBtn.href = "#/skills/" + s.slug;
    var copyBtn = el("button", "btn btn-ghost", "Copy URL");
    copyBtn.type = "button";
    copyBtn.setAttribute("data-copy", absoluteUrl(s.path));
    copyBtn.addEventListener("click", function () {
      copyText(absoluteUrl(s.path), "Skill URL copied");
    });

    actions.appendChild(viewBtn);
    actions.appendChild(copyBtn);

    if (s.source) {
      var srcBtn = el("a", "icon-btn-sm", null);
      srcBtn.href = s.source;
      srcBtn.title = "Open source on GitHub";
      srcBtn.setAttribute("aria-label", "Open source on GitHub");
      srcBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
      actions.appendChild(srcBtn);
    }

    card.appendChild(actions);
    return card;
  }

  function renderList() {
    app.innerHTML = "";

    var hero = el("section", "hero");
    hero.innerHTML =
      '<span class="eyebrow">AI agent skills</span>' +
      '<h1>Skill <span>Shelf</span></h1>' +
      "<p>Reusable <code>SKILL.md</code> files for AI agents. Browse, copy, and drop them straight into your agent's workflow.</p>";
    app.appendChild(hero);

    var toolbar = el("div", "toolbar");

    var searchWrap = el("div", "search-wrap");
    searchWrap.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
    var input = el("input", null);
    input.id = "search-input";
    input.type = "search";
    input.placeholder = "Search skills by name, description, category or tag…";
    input.autocomplete = "off";
    input.value = state.query;
    input.addEventListener("input", function () {
      state.query = input.value;
      renderResults();
    });
    searchWrap.appendChild(input);
    toolbar.appendChild(searchWrap);

    var chips = el("div", "chips");
    var cats = ["All"].concat(getCategories());
    cats.forEach(function (c) {
      var chip = el("button", "chip", c);
      chip.type = "button";
      if (c === state.category) chip.classList.add("active");
      chip.addEventListener("click", function () {
        state.category = c;
        renderResults();
      });
      chips.appendChild(chip);
    });
    toolbar.appendChild(chips);

    app.appendChild(toolbar);

    var results = el("div");
    results.id = "results";
    app.appendChild(results);

    renderResults();
  }

  function renderResults() {
    var results = document.getElementById("results");
    if (!results) return;

    var skills = filteredSkills();
    var meta = el("div", "results-meta");
    var count = el("p", null, skills.length + " skill" + (skills.length === 1 ? "" : "s"));
    var regLink = el("a", null, "Discover via index.json →");
    regLink.href = resolve("index.json");
    meta.appendChild(count);
    meta.appendChild(regLink);

    results.innerHTML = "";
    results.appendChild(meta);

    if (!skills.length) {
      var empty = el("div", "empty");
      empty.innerHTML = "<h3>No skills found</h3><p>Try a different search term or category.</p>";
      var reset = el("button", "btn btn-ghost", "Reset filters");
      reset.type = "button";
      reset.addEventListener("click", function () {
        state.query = "";
        state.category = "All";
        renderList();
        document.getElementById("search-input").focus();
      });
      empty.appendChild(reset);
      results.appendChild(empty);
      return;
    }

    var grid = el("div", "grid");
    skills.forEach(function (s) {
      grid.appendChild(buildCard(s));
    });
    results.appendChild(grid);
  }

  /* ------------------------------------------------------------------------
   * Skill detail view
   * ---------------------------------------------------------------------- */

  function renderSkill(slug) {
    app.innerHTML = "";
    var skill = findSkill(slug);

    if (!skill) {
      var empty = el("div", "empty");
      empty.innerHTML =
        "<h3>Skill not found</h3><p>The skill you are looking for does not exist in the registry.</p>";
      var back = el("a", "btn btn-primary", "← Back to library");
      back.href = "#/";
      empty.appendChild(back);
      app.appendChild(empty);
      return;
    }

    var bread = el("div", "breadcrumbs");
    bread.innerHTML =
      '<a href="#/"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> All skills</a>';
    app.appendChild(bread);

    var head = el("header", "skill-head");
    head.appendChild(el("h1", "skill-title", skill.name));
    head.appendChild(el("p", "skill-desc", skill.description || ""));

    var meta = el("div", "skill-meta");
    meta.appendChild(el("span", "badge", skill.category || "General"));
    if (skill.tags && skill.tags.length) {
      skill.tags.forEach(function (t) {
        meta.appendChild(el("span", "tag", t));
      });
    }
    head.appendChild(meta);

    var rawUrl = absoluteUrl(skill.path);

    var actions = el("div", "skill-actions");
    var copyBtn = el("button", "btn btn-primary", "Copy skill URL");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", function () {
      copyText(rawUrl, "Skill URL copied");
    });
    var rawBtn = el("a", "btn btn-ghost", "Raw .md file");
    rawBtn.href = rawUrl;
    actions.appendChild(copyBtn);
    actions.appendChild(rawBtn);
    if (skill.source) {
      var srcBtn = el("a", "btn btn-ghost", "Source");
      srcBtn.href = skill.source;
      actions.appendChild(srcBtn);
    }
    head.appendChild(actions);

    var note = el("div", "agent-note");
    note.innerHTML =
      '<div class="agent-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>For AI agents</div>' +
      '<div class="agent-url"><code>' +
      escapeHtml(rawUrl) +
      '</code><button class="btn btn-ghost" type="button" data-copy="' +
      escapeHtml(rawUrl) +
      '">Copy</button></div>';
    head.appendChild(note);

    app.appendChild(head);

    var article = el("article", "md");
    article.id = "skill-md";
    article.appendChild(el("div", "loading"));
    app.appendChild(article);

    fetch(resolve(skill.path))
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        article.innerHTML = markdownToHtml(stripFrontMatter(text));
        document.title = skill.name + " · Skill Shelf";
        attachCodeCopy(article);
      })
      .catch(function () {
        article.innerHTML =
          '<div class="empty"><h3>Could not load skill</h3>' +
          "<p>The markdown file could not be fetched.</p>" +
          '<a class="btn btn-primary" href="' +
          escapeHtml(rawUrl) +
          '">Open raw file</a></div>';
      });
  }

  function attachCodeCopy(container) {
    var btns = container.querySelectorAll(".copy-code-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var code = btn.getAttribute("data-copy-code");
        copyText(code, "Code copied");
      });
    });
  }

  // Global delegation for "data-copy" buttons rendered after the fact.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    copyText(btn.getAttribute("data-copy"), "Copied to clipboard");
  });

  /* ------------------------------------------------------------------------
   * Bootstrap
   * ---------------------------------------------------------------------- */

  function loadRegistry() {
    return fetch(resolve("index.json"))
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        state.skills = Array.isArray(data.skills) ? data.skills : [];
        state.loaded = true;
        router();
      })
      .catch(function (err) {
        app.innerHTML =
          '<div class="empty"><h3>Failed to load registry</h3>' +
          "<p>Could not fetch <code>index.json</code>. Make sure it exists in the repository root.</p>" +
          '<p style="font-family:var(--font-mono);font-size:12px;color:var(--muted)">' +
          escapeHtml(String(err && err.message)) +
          "</p></div>";
      });
  }

  loadRegistry();
})();