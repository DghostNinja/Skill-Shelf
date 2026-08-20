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

  // Stored skill paths may be absolute ("/skills/web/web-pentesting.md") or relative.
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

  // Unique, stable ids for headings so an auto table of contents can link to
  // them. Shared across recursive markdownToHtml calls (blockquotes).
  var _headingIds = {};

  function slugifyHeading(text) {
    var base =
      String(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";
    var n = (_headingIds[base] = (_headingIds[base] || 0) + 1);
    return n === 1 ? base : base + "-" + n;
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
        out.push(
          "<h" +
            lvl +
            ' id="' +
            slugifyHeading(heading[2]) +
            '">' +
            inline(heading[2]) +
            "</h" +
            lvl +
            ">"
        );
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
    sort: "az",
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
      var t = s.topic || s.category;
      if (t) map[t] = true;
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
    if (/^#\/usage/.test(hash)) return { view: "usage" };
    return { view: "list" };
  }

  // Parse "#/?q=...&c=..." into { q, c } so searches are shareable.
  function parseListHash(hash) {
    var h = String(hash || "").replace(/^#\/?/, "");
    var params = {};
    String(h)
      .replace(/^\?/, "")
      .split("&")
      .forEach(function (pair) {
        if (!pair) return;
        var eq = pair.indexOf("=");
        var k = eq === -1 ? pair : pair.slice(0, eq);
        var v = eq === -1 ? "" : pair.slice(eq + 1);
        try {
          params[decodeURIComponent(k)] = decodeURIComponent(v);
        } catch (e) {
          params[k] = v;
        }
      });
    return { q: params.q || "", c: params.c || "All" };
  }

  // Build the shareable hash for the current list state.
  function listHash() {
    var parts = [];
    if (state.query) parts.push("q=" + encodeURIComponent(state.query));
    if (state.category && state.category !== "All")
      parts.push("c=" + encodeURIComponent(state.category));
    return parts.length ? "#/?" + parts.join("&") : "#/";
  }

  function router() {
    var route = currentRoute();
    window.scrollTo({ top: 0, behavior: "auto" });
    if (route.view === "skill") {
      renderSkill(route.slug);
    } else if (route.view === "usage") {
      renderUsage();
    } else {
      var params = parseListHash(location.hash);
      state.query = params.q;
      state.category = params.c;
      renderList();
    }
  }

  window.addEventListener("hashchange", router);

  /* ------------------------------------------------------------------------
   * List view
   * ---------------------------------------------------------------------- */

  function filteredSkills() {
    var q = state.query.trim().toLowerCase();
    var list = state.skills.filter(function (s) {
      var inCategory =
        state.category === "All" ||
        s.topic === state.category ||
        s.category === state.category;
      if (!inCategory) return false;
      if (!q) return true;
      var haystack = [
        s.name,
        s.description,
        s.topic,
        s.category,
        s.version,
        (s.tags || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(q) !== -1;
    });

    if (state.sort === "newest") {
      list.sort(function (a, b) {
        var da = a.date || "";
        var db = b.date || "";
        if (!da && !db) return a.name.localeCompare(b.name);
        if (!da) return 1;
        if (!db) return -1;
        if (da === db) return a.name.localeCompare(b.name);
        return db.localeCompare(da);
      });
    } else {
      list.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    }
    return list;
  }

  function buildCard(s) {
    var card = el("article", "card");

    var top = el("div", "card-top");
    var badge = el("span", "badge", s.topic || s.category || "General");
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

  // One card per topic folder. Lists the skills inside it; clicking a skill
  // or "Open folder" drills into that folder.
  function buildFolderCard(topic, skills) {
    var card = el("article", "card folder-card");

    var top = el("div", "card-top");
    var badge = el("span", "badge", topic);
    top.appendChild(badge);
    card.appendChild(top);

    var h3 = el("h3");
    var link = el("a", "folder-title", topic);
    link.href = "#/?c=" + encodeURIComponent(topic);
    h3.appendChild(link);
    card.appendChild(h3);

    var count = el("p", "folder-count", skills.length + (skills.length === 1 ? " skill" : " skills"));
    card.appendChild(count);

    var list = el("ul", "folder-list");
    skills.forEach(function (s) {
      var li = el("li", "folder-item");

      var a = el("a", "folder-item-name", s.name);
      a.href = "#/skills/" + s.slug;
      a.title = s.description || "";
      li.appendChild(a);

      if (s.tags && s.tags.length) {
        var tags = el("div", "tags");
        s.tags.forEach(function (t) {
          tags.appendChild(el("span", "tag", t));
        });
        li.appendChild(tags);
      }

      list.appendChild(li);
    });
    card.appendChild(list);

    var actions = el("div", "card-actions");
    var openBtn = el("a", "btn btn-primary", "Open folder");
    openBtn.href = "#/?c=" + encodeURIComponent(topic);
    actions.appendChild(openBtn);
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
      history.replaceState(null, "", listHash());
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
        history.replaceState(null, "", listHash());
      });
      chips.appendChild(chip);
    });
    toolbar.appendChild(chips);

    app.appendChild(toolbar);

    var stats = el("div", "stats");
    stats.innerHTML =
      "<span>" +
      state.skills.length +
      " skill" +
      (state.skills.length === 1 ? "" : "s") +
      "</span>" +
      "<span class=\"stats-dot\">·</span>" +
      "<span>" +
      getCategories().length +
      " folder" +
      (getCategories().length === 1 ? "" : "s") +
      "</span>";
    app.appendChild(stats);

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
    meta.appendChild(count);

    var right = el("div", "meta-right");
    var sortSel = el("select", "sort-select");
    sortSel.id = "sort-select";
    sortSel.setAttribute("aria-label", "Sort skills");
    sortSel.innerHTML =
      '<option value="az">A–Z</option><option value="newest">Newest</option>';
    sortSel.value = state.sort;
    sortSel.addEventListener("change", function () {
      state.sort = sortSel.value;
      renderResults();
    });
    right.appendChild(sortSel);

    var regLink = el("a", null, "Discover via index.json →");
    regLink.href = resolve("index.json");
    right.appendChild(regLink);

    meta.appendChild(right);

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

    // When browsing everything (no filter, no search), show one card per
    // folder instead of one card per skill. Each folder card lists the
    // skills inside it. Adding a new folder under skills/ automatically
    // produces a new folder card here — no code changes needed.
    var folderView =
      state.category === "All" && !state.query.trim();
    if (folderView) {
      var byTopic = {};
      state.skills.forEach(function (s) {
        var t = s.topic || s.category || "General";
        (byTopic[t] = byTopic[t] || []).push(s);
      });
      results.innerHTML = "";
      results.appendChild(meta);
      var folderGrid = el("div", "grid");
      Object.keys(byTopic)
        .sort()
        .forEach(function (t) {
          folderGrid.appendChild(buildFolderCard(t, byTopic[t]));
        });
      results.appendChild(folderGrid);
      return;
    }

    results.appendChild(grid);
  }

  /* ------------------------------------------------------------------------
   * Usage view
   * ---------------------------------------------------------------------- */

  function renderUsage() {
    app.innerHTML = "";

    var registryUrl = resolve("index.json");
    var llmsUrl = resolve("llms.txt");
    var example = findSkill("appsec") || state.skills[0];
    var exampleUrl = example ? absoluteUrl(example.path) : BASE + "skills/<topic>/<skill-name>.md";

    var bread = el("div", "breadcrumbs");
    bread.innerHTML =
      '<a href="#/"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> All skills</a>';
    app.appendChild(bread);

    var head = el("div", "skill-head");
    head.appendChild(el("h1", "skill-title", "Usage"));
    head.appendChild(
      el(
        "p",
        "skill-desc",
        "How to use these skills with a model or agent. Every skill is a plain text file, so no login or app is needed."
      )
    );
    app.appendChild(head);

    var article = el("article", "md");
    article.id = "usage-md";
    app.appendChild(article);

    article.innerHTML =
      "<h2>Step 1: give the model the registry</h2>" +
      "<p>Open a chat with any model that can fetch URLs (ChatGPT, Claude, Gemini, a coding agent, etc.) and paste one of these:</p>" +
      codeblock("text", registryUrl) +
      "<p>or the readable version:</p>" +
      codeblock("text", llmsUrl) +
      "<p>The model reads the list, sees the names and descriptions, and can pick a skill.</p>" +
      "<h2>Step 2: point it at a specific skill</h2>" +
      "<p>The raw file URL for any skill follows this pattern:</p>" +
      codeblock("text", BASE + "skills/<topic>/<skill-name>.md") +
      "<p>For example:</p>" +
      codeblock("text", exampleUrl) +
      "<h2>Step 3: copy the agent snippet</h2>" +
      "<p>Open any skill on this site. Near the top there is a box labelled <strong>For AI agents</strong> with a <strong>Copy agent snippet</strong> button. It copies a short block with the skill name, category, description, and the fetch command.</p>" +
      "<p>Paste that block into your model's prompt.</p>" +
      "<h2>What a ready-to-use prompt looks like</h2>" +
      codeblock(
        "text",
        "Use this skill for the task.\n\n" +
          "Skill: " +
          (example ? example.name : "Skill Name") +
          "\nCategory: " +
          (example ? example.category : "General") +
          "\nDescription: " +
          (example ? example.description : "Short description.") +
          "\n\nFetch the skill file:\ncurl " +
          exampleUrl +
          "\n\nFollow the skill's steps and report your findings."
      ) +
      "<h2>If the model cannot fetch URLs</h2>" +
      "<p>Download the raw .md file using the <strong>Raw .md file</strong> button on the skill page, then attach the file directly to the chat like any document.</p>" +
      "<h2>Command-line check</h2>" +
      codeblock("bash", "curl " + registryUrl + "\ncurl " + exampleUrl);

    document.title = "Usage · Skill Shelf";
    attachCodeCopy(article);
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
    var topic = skill.topic || skill.category || "General";
    bread.innerHTML =
      '<a href="#/"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> All skills</a>' +
      '<span class="crumb-sep">/</span>' +
      '<a href="#/?c=' + encodeURIComponent(topic) + '">' +
      escapeHtml(topic) +
      "</a>";
    app.appendChild(bread);

    var head = el("header", "skill-head");
    head.appendChild(el("h1", "skill-title", skill.name));
    head.appendChild(el("p", "skill-desc", skill.description || ""));

    var meta = el("div", "skill-meta");
    meta.appendChild(el("span", "badge", skill.topic || skill.category || "General"));
    if (skill.category && skill.category !== skill.topic) {
      meta.appendChild(el("span", "tag", skill.category));
    }
    if (skill.tags && skill.tags.length) {
      skill.tags.forEach(function (t) {
        meta.appendChild(el("span", "tag", t));
      });
    }
    if (skill.related && skill.related.length) {
      var relList = [];
      skill.related.forEach(function (slug) {
        var found = findSkill(slug);
        if (found) {
          var a = el("a", "tag related", found.name);
          a.href = "#/skills/" + found.slug;
          relList.push(a);
        }
      });
      if (relList.length) {
        meta.appendChild(el("span", "related-label", "Related:"));
        relList.forEach(function (a) {
          meta.appendChild(a);
        });
      }
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

    // Prev / next navigation within the same folder.
    var siblings = state.skills
      .filter(function (s) {
        return (s.topic || s.category || "General") === topic;
      })
      .slice()
      .sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    var idx = -1;
    siblings.forEach(function (s, i) {
      if (s.slug === skill.slug) idx = i;
    });
    if (siblings.length > 1 && idx !== -1) {
      var nav = el("div", "skill-nav");
      if (idx > 0) {
        var prev = el("a", "btn btn-ghost", "← " + siblings[idx - 1].name);
        prev.href = "#/skills/" + siblings[idx - 1].slug;
        nav.appendChild(prev);
      }
      if (idx < siblings.length - 1) {
        var next = el("a", "btn btn-ghost", siblings[idx + 1].name + " →");
        next.href = "#/skills/" + siblings[idx + 1].slug;
        nav.appendChild(next);
      }
      app.appendChild(nav);
    }

    var snippet =
      "Skill: " + skill.name +
      (skill.category ? "\nCategory: " + skill.category : "") +
      (skill.description ? "\nDescription: " + skill.description : "") +
      "\n\nFetch the skill file:\ncurl " + rawUrl;

    var note = el("div", "agent-note");
    note.innerHTML =
      '<div class="agent-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>For AI agents</div>' +
      '<div class="agent-url"><code>curl ' +
      escapeHtml(rawUrl) +
      '</code><button class="btn btn-ghost" type="button" data-copy="' +
      escapeHtml(snippet) +
      '">Copy agent snippet</button></div>';
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
        _headingIds = {};
        article.innerHTML = markdownToHtml(stripFrontMatter(text));
        var toc = buildToc(article);
        if (toc) article.insertAdjacentHTML("afterbegin", toc);
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

  // Build an in-page table of contents from the rendered headings. Uses
  // buttons (not #hash links) so it never interferes with hash routing.
  function buildToc(container) {
    var heads = container.querySelectorAll("h2, h3");
    if (heads.length < 3) return "";
    var items = [];
    heads.forEach(function (h) {
      if (!h.id) return;
      items.push(
        '<li class="toc-' +
          h.tagName.toLowerCase() +
          '"><button type="button" class="toc-link" data-target="' +
          escapeHtml(h.id) +
          '">' +
          escapeHtml(h.textContent) +
          "</button></li>"
      );
    });
    if (!items.length) return "";
    return (
      '<nav class="toc"><p class="toc-title">Contents</p><ul>' +
      items.join("") +
      "</ul></nav>"
    );
  }

  // Global delegation for "data-copy" buttons rendered after the fact.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    copyText(btn.getAttribute("data-copy"), "Copied to clipboard");
  });

  // TOC navigation (buttons, not hash links).
  document.addEventListener("click", function (e) {
    var t = e.target.closest(".toc-link");
    if (!t) return;
    var target = document.getElementById(t.getAttribute("data-target"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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