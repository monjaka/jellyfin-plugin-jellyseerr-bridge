(() => {
  "use strict";

  const REQUEST_URL = "/JellyseerrBridge/Page?v=20260614-2305";
  const STYLE_ID = "jellyseerr-bridge-request-entry-style";

  function textOf(node) {
    return [
      node?.textContent,
      node?.getAttribute?.("aria-label"),
      node?.getAttribute?.("title"),
      node?.getAttribute?.("data-title")
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = ".jellyseerr-bridge-request-menu-item{align-items:center;color:inherit;display:flex!important;gap:1rem;min-height:3rem;padding:.75rem 1.25rem;text-decoration:none}.jellyseerr-bridge-request-menu-item:hover,.jellyseerr-bridge-request-menu-item:focus,.jellyseerr-bridge-request-tab:hover,.jellyseerr-bridge-request-tab:focus{color:#00a4dc;text-decoration:none}.jellyseerr-bridge-request-menu-icon{align-items:center;display:inline-flex;font-size:1.45rem;justify-content:center;line-height:1;min-width:1.5rem}.jellyseerr-bridge-request-menu-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.jellyseerr-bridge-request-tab{align-items:center;color:inherit;display:inline-flex;text-decoration:none}";
    document.head.appendChild(style);
  }

  function controlsIn(container) {
    return Array.from(container.querySelectorAll("a, button, [role='button'], [role='menuitem'], [role='link']"));
  }

  function openRequestPage(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    window.location.assign(REQUEST_URL);
  }

  function wireLink(link) {
    link.href = REQUEST_URL;
    link.addEventListener("click", openRequestPage, true);
    return link;
  }

  function sideMenuContainers() {
    const selectors = [
      ".mainDrawer-scrollContainer",
      ".mainDrawer .scrollContainer",
      ".drawerContent",
      ".navMenu",
      ".MuiDrawer-paper"
    ];
    const found = new Set();
    for (const selector of selectors) {
      for (const candidate of document.querySelectorAll(selector)) {
        if (candidate.classList?.contains("mainDrawerHandle")) continue;
        const labels = controlsIn(candidate).map(textOf);
        const hasNormalNav = labels.includes("home")
          || labels.includes("favorites")
          || labels.includes("favourites")
          || labels.some((label) => label.includes("home"));
        if (hasNormalNav) found.add(candidate);
      }
    }
    return Array.from(found);
  }

  function isDrawerElement(node) {
    return Boolean(node?.closest?.(".mainDrawer,.mainDrawer-scrollContainer,.drawerContent,.MuiDrawer-paper"));
  }

  function labelMatches(node, labels) {
    const label = textOf(node);
    return labels.some((value) => label === value || label.includes(value));
  }

  function topNavContainers() {
    const found = new Set();
    const selectors = [
      ".sectionTabs",
      ".emby-tabs",
      ".tabs",
      ".headerTabs",
      ".viewMenuBar",
      ".skinHeader .tabs"
    ];

    for (const selector of selectors) {
      for (const candidate of document.querySelectorAll(selector)) {
        if (isDrawerElement(candidate)) continue;
        const controls = controlsIn(candidate);
        const hasHome = controls.some((item) => labelMatches(item, ["home"]));
        const hasFavorites = controls.some((item) => labelMatches(item, ["favorites", "favourites"]));
        if (hasHome && hasFavorites) found.add(candidate);
      }
    }

    for (const home of controlsIn(document).filter((item) => !isDrawerElement(item) && labelMatches(item, ["home"]))) {
      let candidate = home.parentElement;
      for (let depth = 0; candidate && depth < 4; depth += 1, candidate = candidate.parentElement) {
        const controls = controlsIn(candidate);
        const hasFavorites = controls.some((item) => labelMatches(item, ["favorites", "favourites"]));
        if (hasFavorites && controls.length <= 12) {
          found.add(candidate);
          break;
        }
      }
    }

    return Array.from(found).sort((left, right) => controlsIn(left).length - controlsIn(right).length);
  }

  function createMenuItem(reference) {
    const link = document.createElement("a");
    link.className = "jellyseerr-bridge-request-menu-item";
    link.setAttribute("aria-label", "Requests");
    wireLink(link);

    const icon = document.createElement("span");
    icon.className = "material-icons jellyseerr-bridge-request-menu-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "add_circle_outline";

    const label = document.createElement("span");
    label.className = "jellyseerr-bridge-request-menu-label";
    label.textContent = "Requests";

    link.append(icon, label);

    const referenceClass = reference?.getAttribute("class");
    if (referenceClass) link.setAttribute("class", `${referenceClass} jellyseerr-bridge-request-menu-item`);
    const referenceRole = reference?.getAttribute("role");
    if (referenceRole) link.setAttribute("role", referenceRole);

    return link;
  }

  function createTopTab(reference) {
    const tag = reference?.tagName?.toLowerCase() === "button" ? "button" : "a";
    const link = document.createElement(tag);
    link.className = "jellyseerr-bridge-request-tab";
    link.textContent = "Request";
    link.setAttribute("aria-label", "Request");
    link.setAttribute("data-jellyseerr-bridge", "request-tab");
    if (tag === "button") link.type = "button";
    wireLink(link);

    const referenceClass = reference?.getAttribute("class");
    if (referenceClass) link.setAttribute("class", `${referenceClass} jellyseerr-bridge-request-tab`);
    const referenceRole = reference?.getAttribute("role");
    if (referenceRole) link.setAttribute("role", referenceRole);
    const referenceTabIndex = reference?.getAttribute("tabindex");
    if (referenceTabIndex) link.setAttribute("tabindex", referenceTabIndex);
    link.classList.remove("selected", "active", "is-active", "current");
    link.removeAttribute("aria-selected");

    return link;
  }

  function insertTopTab() {
    ensureStyle();
    const existingTabs = Array.from(document.querySelectorAll(".jellyseerr-bridge-request-tab"));
    existingTabs.slice(1).forEach((node) => node.remove());
    if (existingTabs.length > 0) return;

    for (const container of topNavContainers()) {
      const controls = controlsIn(container);
      const after = controls.find((item) => /^(favorites|favourites)$/i.test(textOf(item)))
        || controls.find((item) => /^home$/i.test(textOf(item)) || textOf(item).includes("home"));
      if (!after) continue;
      const link = createTopTab(after);
      after.insertAdjacentElement("afterend", link);
      return;
    }
  }

  function insertSideMenuItem() {
    ensureStyle();

    for (const container of sideMenuContainers()) {
      if (container.querySelector(".jellyseerr-bridge-request-menu-item")) continue;
      const controls = controlsIn(container);
      const after = controls.find((item) => /^(favorites|favourites)$/i.test(textOf(item)))
        || controls.find((item) => /^home$/i.test(textOf(item)) || textOf(item).includes("home"))
        || controls[0];
      if (!after) continue;
      const link = createMenuItem(after);
      if (after.parentElement === container) after.insertAdjacentElement("afterend", link);
      else after.parentElement?.insertAdjacentElement("afterend", link);
    }
  }

  function insertEntries() {
    insertTopTab();
    insertSideMenuItem();
  }

  insertEntries();
  setInterval(insertEntries, 1000);
  new MutationObserver(insertEntries).observe(document.documentElement, { childList: true, subtree: true });
})();
