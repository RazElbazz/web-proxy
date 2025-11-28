let currentId = null;

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

async function loadFlow(id) {
  currentId = id;
  const res = await fetch("/api/flows/" + id);
  if (!res.ok) {
    alert("Flow " + id + " not found or already decided.");
    return;
  }
  const f = await res.json();
  const details = document.getElementById("details");
  const actions = document.getElementById("actions");

  details.innerHTML = "";
  actions.innerHTML = "";

  const html = [];

  html.push('<div class="small">Client: ' + f.client + "</div>");
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
  }
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Periodically refresh flow list
setInterval(fetchFlows, 1000);
fetchFlows();
