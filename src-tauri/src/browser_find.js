// Find in page for browser panes (⌘F / Ctrl+F). Injected into every page:
// a web page cannot reach the app, so the find bar lives in the page itself,
// in a closed shadow root the page's styles and scripts can't touch. Styles
// are set through the CSSOM so a page's Content-Security-Policy can't block
// them.
(() => {
  if (window.top !== window || window.__workbenchFind) return;

  const MAX_MATCHES = 1000;
  const SEARCH_DELAY_MS = 120;
  const ALL = "workbench-find";
  const CURRENT = "workbench-find-current";
  const canHighlight = typeof Highlight === "function" && typeof CSS !== "undefined" && "highlights" in CSS;

  let host = null;
  let input = null;
  let counter = null;
  let ranges = [];
  let at = -1;
  let timer = 0;
  let styled = false;

  const css = (el, style) => Object.assign(el.style, style);

  function addHighlightStyles() {
    if (!canHighlight || styled) return;
    styled = true;
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(
        `::highlight(${ALL}){background-color:#fde68a;color:#111}` +
          `::highlight(${CURRENT}){background-color:#fb923c;color:#111}`,
      );
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    } catch {
      // Older engines: matches are still found and scrolled to, just not tinted.
    }
  }

  function button(label, title, onClick) {
    const b = document.createElement("button");
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    css(b, {
      all: "unset",
      cursor: "pointer",
      width: "22px",
      height: "22px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "4px",
      color: "#cbd5e1",
      fontSize: "13px",
    });
    b.addEventListener("mouseenter", () => css(b, { background: "rgba(148,163,184,.2)" }));
    b.addEventListener("mouseleave", () => css(b, { background: "transparent" }));
    b.addEventListener("click", onClick);
    return b;
  }

  function build() {
    host = document.createElement("workbench-find");
    css(host, { all: "initial", position: "fixed", top: "8px", right: "12px", zIndex: "2147483647" });
    const root = host.attachShadow({ mode: "closed" });
    const bar = document.createElement("div");
    css(bar, {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 6px",
      background: "#0f172a",
      border: "1px solid #334155",
      borderRadius: "8px",
      boxShadow: "0 8px 24px rgba(0,0,0,.35)",
      font: "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#e2e8f0",
    });
    input = document.createElement("input");
    input.placeholder = "Find in page";
    input.spellcheck = false;
    css(input, {
      all: "unset",
      width: "180px",
      padding: "3px 6px",
      background: "#020617",
      border: "1px solid #334155",
      borderRadius: "5px",
      color: "#f1f5f9",
    });
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => search(input.value), SEARCH_DELAY_MS);
    });
    counter = document.createElement("span");
    css(counter, { minWidth: "64px", textAlign: "center", color: "#94a3b8", fontVariantNumeric: "tabular-nums" });
    bar.append(
      input,
      counter,
      button("↑", "Previous match (⇧↵)", () => step(-1)),
      button("↓", "Next match (↵)", () => step(1)),
      button("×", "Close (Esc)", close),
    );
    root.append(bar);
  }

  /** Text nodes a person can see; script and style contents are skipped. */
  function visibleText(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, noscript, template, textarea")) return NodeFilter.FILTER_REJECT;
    return parent.getClientRects().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
  }

  function search(query) {
    ranges = [];
    at = -1;
    const needle = query.toLowerCase();
    if (needle && document.body) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: visibleText });
      for (let node = walker.nextNode(); node && ranges.length < MAX_MATCHES; node = walker.nextNode()) {
        const text = node.data.toLowerCase();
        for (let i = text.indexOf(needle); i !== -1 && ranges.length < MAX_MATCHES; i = text.indexOf(needle, i + needle.length)) {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + needle.length);
          ranges.push(range);
        }
      }
    }
    if (ranges.length) go(0);
    else paint();
  }

  function paint() {
    if (canHighlight) {
      CSS.highlights.set(ALL, new Highlight(...ranges));
      if (at >= 0) CSS.highlights.set(CURRENT, new Highlight(ranges[at]));
      else CSS.highlights.delete(CURRENT);
    }
    const total = ranges.length >= MAX_MATCHES ? `${MAX_MATCHES}+` : String(ranges.length);
    counter.textContent = !input.value ? "" : ranges.length ? `${at + 1} of ${total}` : "No matches";
  }

  function go(index) {
    at = (index + ranges.length) % ranges.length;
    paint();
    const range = ranges[at];
    const box = range.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight || box.left < 0 || box.right > window.innerWidth) {
      range.startContainer.parentElement?.scrollIntoView({ block: "center", inline: "nearest" });
    }
    if (!canHighlight) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  function step(direction) {
    // The page may have changed since the search: look again.
    if (!ranges.length || !ranges[Math.max(at, 0)].startContainer.isConnected) {
      search(input.value);
      if (direction < 0 && ranges.length) go(-1);
      return;
    }
    go(at + direction);
  }

  function open() {
    if (!host) build();
    if (!host.isConnected) document.documentElement.append(host);
    addHighlightStyles();
    host.style.display = "block";
    input.focus();
    input.select();
    if (input.value) search(input.value);
  }

  function close() {
    if (!host) return;
    clearTimeout(timer);
    host.style.display = "none";
    ranges = [];
    at = -1;
    if (canHighlight) {
      CSS.highlights.delete(ALL);
      CSS.highlights.delete(CURRENT);
    }
  }

  const isOpen = () => Boolean(host?.isConnected && host.style.display !== "none");

  // Registered before the page's own scripts run, so it sees keys first.
  const onKey = (e) => {
    const fromBar = host !== null && e.composedPath().includes(host);
    const mod = (e.metaKey || e.ctrlKey) && !e.altKey;
    const key = (e.key || "").toLowerCase();
    if (e.type === "keydown" && mod && !e.shiftKey && key === "f") {
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
      return;
    }
    if (e.type === "keydown" && mod && key === "g" && isOpen()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      step(e.shiftKey ? -1 : 1);
      return;
    }
    if (!fromBar) return;
    // Typing in the find bar must not trigger the page's own shortcuts.
    e.stopImmediatePropagation();
    if (e.type !== "keydown") return;
    if (key === "enter") {
      e.preventDefault();
      clearTimeout(timer);
      if (!ranges.length) search(input.value);
      else step(e.shiftKey ? -1 : 1);
    } else if (key === "escape") {
      e.preventDefault();
      close();
    }
  };
  for (const type of ["keydown", "keypress", "keyup"]) window.addEventListener(type, onKey, true);

  Object.defineProperty(window, "__workbenchFind", { value: Object.freeze({ open }), configurable: false });
})();
