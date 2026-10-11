const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { spawn } = require("node:child_process");

const PORT = 4321;

test("multi-page website serves main pages and supports API health", async () => {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: __dirname + "/..",
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    await once(child.stdout, "data");

    const fetchPage = async (path) => {
      const res = await fetch(`http://localhost:${PORT}${path}`);
      return { status: res.status, text: await res.text() };
    };

    const home = await fetchPage("/");
    const about = await fetchPage("/about");
    const join = await fetchPage("/join");
    const health = await fetchPage("/api/health");

    assert.equal(home.status, 200);
    assert.equal(about.status, 200);
    assert.equal(join.status, 200);
    assert.equal(health.status, 200);
    assert.match(health.text, /"ok":true/);
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit").catch(() => {});
  }
});

test("admin credentials can be configured via environment variables and member forms persist", async () => {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: __dirname + "/..",
    env: {
      ...process.env,
      PORT: String(PORT + 1),
      ADMIN_USERNAME: "root",
      ADMIN_PASSWORD: "SuperSecret123!",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await once(child.stdout, "data");

    const loginResponse = await fetch(
      `http://localhost:${PORT + 1}/api/admin/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "root", password: "SuperSecret123!" }),
      },
    );

    const memberResponse = await fetch(
      `http://localhost:${PORT + 1}/api/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Alice",
          lastName: "Brown",
          email: "alice@example.com",
          phone: "555-123-4567",
          interest: "Volunteering",
        }),
      },
    );

    const memberBody = await memberResponse.json();
    const listResponse = await fetch(
      `http://localhost:${PORT + 1}/api/members`,
    );
    const listBody = await listResponse.json();

    assert.equal(loginResponse.status, 200);
    assert.equal(memberResponse.status, 201);
    assert.equal(memberBody.ok, true);
    assert.ok(Array.isArray(listBody.members));
    assert.ok(
      listBody.members.some((member) => member.email === "alice@example.com"),
    );
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit").catch(() => {});
  }
});
