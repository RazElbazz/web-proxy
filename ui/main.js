let currentId = null;       // current pending flow id
let currentHistoryId = null; // current history id
let historyCache = {};      // id -> entry

async function fetchFlows() {
  try {
    const res = await fetch("/api/flows");
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById("flows-list");
    list.innerHTML = "";
    data.forEach((f) => {
      const div = document.createElement("div");
      div.className = "flow-item";
      div.textContent = "#" + f.id + " " + f.method + " " + f.url;
      div.onclick = () => loadFlow(f.id);
      list.appendChild(div);
    });
  } catch (e) {
    console.error("fetchFlows error", e);
  }
}

async function fetchHistory() {
  try {
    const res = await fetch("/api/history");
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById("history-list");
    list.innerHTML = "";
    historyCache = {};

    data.forEach((h) => {
      historyCache[h.id] = h;
      const div = document.createElement("div");
      div.className = "history-item";

      const url = h.scheme + "://" + h.host + (h.path || "");
      const status = h.status_code != null ? h.status_code : "-";
      const action = h.action || "";

      div.innerHTML =
        "#" +
        h.id +
        " " +
        h.method +
        " " +
        url +
        ' <span class="status">[' +
        action +
        " " +
        status +
        "]</span>";

      div.onclick = () => loadHistory(h.id);
      list.appendChild(div);
    });
  } catch (e) {
    console.error("fetchHistory error", e);
  }
}

async function loadFlow(id) {
  currentId = id;
  currentHistoryId = null;

  const res = await fetch("/api/flows/" + id);
  if (!res.ok) {
    alert("Flow " + id + " not found or already decided.");
    return;
  }
  const f = await res.json();
  renderPendingDetails(f);
}

function renderPendingDetails(f) {
  const details = document.getElementById("details");
  const actions = document.getElementById("actions");

  details.innerHTML = "";
  actions.innerHTML = "";

  const html = [];

  html.push('<div class="small">PENDING | Client: ' + escapeHtml(f.client) + "</div>");
  html.push("<label>Method</label>");
  html.push(
    '<input type="text" id="method" value="' + escapeHtml(f.method) + '">'
  );

  html.push("<label>Scheme</label>");
  html.push(
    '<input type="text" id="scheme" value="' + escapeHtml(f.scheme) + '">'
  );

  html.push("<label>Host</label>");
  html.push('<input type="text" id="host" value="' + escapeHtml(f.host) + '">');

  html.push("<label>Path</label>");
  html.push('<input type="text" id="path" value="' + escapeHtml(f.path) + '">');

  html.push("<label>Headers (one per line: Name: Value)</label>");
  html.push(
    '<textarea id="headers">' + escapeHtml(f.headers || "") + "</textarea>"
  );

  html.push("<label>Body</label>");
  html.push('<textarea id="body">' + escapeHtml(f.body || "") + "</textarea>");

  html.push(
    '<label><input type="checkbox" id="strip_sec"> Strip security headers on response</label>'
  );

  details.innerHTML = html.join("\n");

  const btnAllow = document.createElement("button");
  btnAllow.textContent = "Allow";
  btnAllow.onclick = () => sendDecision("allow");

  const btnBlock = document.createElement("button");
  btnBlock.textContent = "Block";
  btnBlock.onclick = () => sendDecision("block");

  actions.appendChild(btnAllow);
  actions.appendChild(btnBlock);
}

function loadHistory(id) {
  currentId = null;
  currentHistoryId = id;

  const h = historyCache[id];
  if (!h) return;

  const details = document.getElementById("details");
  const actions = document.getElementById("actions");

  details.innerHTML = "";
  actions.innerHTML = "";

  const html = [];

  const url = h.scheme + "://" + h.host + (h.path || "");
  const status = h.status_code != null ? h.status_code : "-";
  const action = h.action || "";

  html.push(
    '<div class="small">HISTORY | Action: ' +
      escapeHtml(action) +
      " | Status: " +
      escapeHtml(String(status)) +
      " | Client: " +
      escapeHtml(h.client) +
      "</div>"
  );

  html.push("<label>Method</label>");
  html.push(
    '<input type="text" value="' +
      escapeHtml(h.method) +
      '" disabled readonly>'
  );

  html.push("<label>URL</label>");
  html.push('<input type="text" value="' + escapeHtml(url) + '" disabled readonly>');

  html.push("<label>Headers</label>");
  html.push(
    '<textarea disabled readonly>' +
      escapeHtml(h.headers || "") +
      "</textarea>"
  );

  html.push("<label>Body</label>");
  html.push(
    '<textarea disabled readonly>' +
      escapeHtml(h.body || "") +
      "</textarea>"
  );

  details.innerHTML = html.join("\n");
  actions.innerHTML = "";
}

async function sendDecision(action) {
  if (currentId === null) return;

  const payload = {
    action: action,
    method: document.getElementById("method").value,
    scheme: document.getElementById("scheme").value,
    host: document.getElementById("host").value,
    path: document.getElementById("path").value,
    headers: document.getElementById("headers").value,
    body: document.getElementById("body").value,
    strip_security_headers: document.getElementById("strip_sec").checked,
  };

  const res = await fetch("/api/flows/" + currentId + "/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    alert("Failed to send decision");
  } else {
    document.getElementById(
      "details"
    ).innerHTML = `<p>Decision sent for #${currentId}.</p>`;
    currentId = null;
    fetchFlows();
    fetchHistory();
  }
}

/* Intercept toggle */

async function fetchSettings() {
  try {
    const res = await fetch("/api/settings");
    if (!res.ok) return;
    const data = await res.json();
    const select = document.getElementById("intercept-toggle");
    if (!select) return;
    select.value = data.intercept ? "on" : "off";
  } catch (e) {
    console.error("fetchSettings error", e);
  }
}

async function setIntercept(on) {
  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intercept: on }),
    });
    if (!res.ok) {
      console.error("setIntercept failed");
    }
  } catch (e) {
    console.error("setIntercept error", e);
  }
}

function setupInterceptToggle() {
  const select = document.getElementById("intercept-toggle");
  if (!select) return;

  select.addEventListener("change", () => {
    const on = select.value === "on";
    setIntercept(on);
  });

  fetchSettings();
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Init */

setupInterceptToggle();
setInterval(fetchFlows, 1000);
setInterval(fetchHistory, 2000);
fetchFlows();
fetchHistory();
