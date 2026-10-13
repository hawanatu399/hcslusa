/* HCSL-USA Website V2 — offline demo.
   localStorage is not a secure production database. Never deploy demo credentials online. */
const DB_KEY = "hcslusa_v2_members";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "ChangeMe123!";
let adminLoggedIn = false;
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
function records() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  } catch {
    return [];
  }
}
function store(items) {
  localStorage.setItem(DB_KEY, JSON.stringify(items));
  renderAdminStats();
}
function escapeHTML(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function dateText(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d)
    ? "—"
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 3200);
}
function openModal(id) {
  $("#" + id).hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModals() {
  $$(".modal-backdrop").forEach((m) => (m.hidden = true));
  document.body.style.overflow = "";
}
$$("[data-open]").forEach((b) =>
  b.addEventListener("click", (e) => {
    e.preventDefault();
    const target = b.dataset.open;
    if (target === "login") openModal("loginModal");
    else openRegistration();
  }),
);
$$("[data-close]").forEach((b) => b.addEventListener("click", closeModals));
$$(".modal-backdrop").forEach((m) =>
  m.addEventListener("click", (e) => {
    if (e.target === m) closeModals();
  }),
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModals();
});
$("#year").textContent = new Date().getFullYear();
$("#mobileMenu").addEventListener("click", () =>
  $("#mainNav").classList.toggle("open"),
);
$$(".main-nav a").forEach((a) =>
  a.addEventListener("click", () => {
    $$(".main-nav a").forEach((n) => n.classList.remove("active"));
    a.classList.add("active");
    $("#mainNav").classList.remove("open");
  }),
);
function nextRef(items) {
  const y = new Date().getFullYear();
  let n =
      items.filter((a) => (a.reference || "").startsWith("HCSL-" + y + "-"))
        .length + 1,
    ref;
  do {
    ref = `HCSL-${y}-${String(n++).padStart(4, "0")}`;
  } while (items.some((a) => a.reference === ref));
  return ref;
}
function openRegistration() {
  if ($("#adminScreen").hidden) {
    $("#registrationForm").hidden = false;
    $("#registrationSuccess").hidden = true;
    openModal("registerModal");
  } else {
    showAdminView("members");
    $("#adminScreen").hidden = true;
    openModal("registerModal");
  }
}
$("#registrationForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const data = Object.fromEntries(new FormData(f).entries());
  data.submittedAt = new Date().toISOString();
  data.status = "Pending";
  data.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const items = records();
  const email = String(data.email || "").toLowerCase();
  if (
    items.some(
      (x) =>
        String(x.email || "").toLowerCase() === email &&
        x.status !== "Declined",
    )
  ) {
    toast("An application with this email already exists in this browser.");
    return;
  }
  data.reference = nextRef(items);
  items.push(data);
  store(items);
  f.hidden = true;
  const success = $("#registrationSuccess");
  success.hidden = false;
  success.innerHTML = `<h3>Thank you, ${escapeHTML(data.firstName)}.</h3><p>Your registration has been saved in this browser.</p><p>Your reference number is <strong>${escapeHTML(data.reference)}</strong>.</p><p><strong>Status:</strong> Pending review.</p><p>Keep this reference for your records. This offline demo does not send the application to HCSL-USA.</p><button type="button" class="btn btn-navy" id="registrationDone">Done</button>`;
  $("#registrationDone").addEventListener("click", () => {
    closeModals();
    f.reset();
    f.hidden = false;
    success.hidden = true;
  });
  toast("Registration saved locally: " + data.reference);
});
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const formData = Object.fromEntries(new FormData(form).entries());
  const loginError = $("#loginError");

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.username,
        password: formData.password,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Login failed.");
    }

    adminLoggedIn = true;
    loginError.hidden = true;
    closeModals();
    $("#adminScreen").hidden = false;
    document.body.style.overflow = "hidden";
    showAdminView("dashboard");
    renderAdmin();
    toast("Admin login successful.");
    form.reset();
  } catch (error) {
    loginError.textContent =
      error.message || "Username or password is incorrect.";
    loginError.hidden = false;
  }
});
$("#adminLogout").addEventListener("click", () => {
  adminLoggedIn = false;
  $("#adminScreen").hidden = true;
  document.body.style.overflow = "";
  $("#loginForm").reset();
  toast("Signed out of administration.");
});
$("#adminNewMember").addEventListener("click", () => {
  const screen = $("#adminScreen");
  screen.hidden = true;
  openRegistration();
});
$$("[data-admin-view]").forEach((b) =>
  b.addEventListener("click", () => showAdminView(b.dataset.adminView)),
);
function showAdminView(name) {
  if (!adminLoggedIn && name !== "dashboard") return;
  $$(".admin-view").forEach((v) => {
    v.classList.remove("active");
    v.hidden = true;
  });
  const target = $("#admin-" + name);
  if (target) {
    target.hidden = false;
    target.classList.add("active");
  }
  $$(".admin-nav").forEach((n) =>
    n.classList.toggle("active", n.dataset.adminView === name),
  );
  const titles = {
    dashboard: "Dashboard overview",
    members: "Membership applications",
    content: "Website content checklist",
    activitiesAdmin: "Projects, missions & activities",
  };
  $("#adminPageTitle").textContent = titles[name] || "Admin workspace";
  if (name === "members") renderMembers();
}
function renderAdminStats() {
  const items = records();
  $("#adminTotal").textContent = items.length;
  $("#adminPending").textContent = items.filter(
    (x) => x.status === "Pending",
  ).length;
  $("#adminApproved").textContent = items.filter(
    (x) => x.status === "Approved",
  ).length;
  $("#adminDeclined").textContent = items.filter(
    (x) => x.status === "Declined",
  ).length;
}
function statusBadge(status) {
  return `<span class="badge badge-${escapeHTML(status || "Pending")}">${escapeHTML(status || "Pending")}</span>`;
}
function rowHTML(a) {
  return `<tr><td class="ref">${escapeHTML(a.reference)}</td><td><strong>${escapeHTML(a.firstName)} ${escapeHTML(a.lastName)}</strong><br><span style="color:#8795a2">${escapeHTML(a.email)}</span></td><td>${escapeHTML(a.profession || "—")}</td><td>${escapeHTML(a.membershipType || "—")}</td><td>${dateText(a.submittedAt)}</td><td>${statusBadge(a.status)}</td><td><button class="table-action" data-review="${escapeHTML(a.id)}">Review</button></td></tr>`;
}
function renderAdmin() {
  renderAdminStats();
  const latest = records()
    .slice()
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 7);
  $("#recentMembers").innerHTML = latest.map(rowHTML).join("");
  $("#adminEmpty").hidden = latest.length > 0;
  $$("[data-review]").forEach((b) =>
    b.addEventListener("click", () => reviewMember(b.dataset.review)),
  );
}
function renderMembers() {
  if (!adminLoggedIn) return;
  const q = ($("#memberSearch").value || "").toLowerCase();
  const f = $("#memberStatus").value;
  const items = records()
    .filter(
      (a) =>
        (f === "All statuses" || a.status === f) &&
        [
          a.reference,
          a.firstName,
          a.lastName,
          a.email,
          a.profession,
          a.membershipType,
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q),
        ),
    )
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  $("#allMembers").innerHTML = items.map(rowHTML).join("");
  $("#allMembersEmpty").hidden = items.length > 0;
  $$("[data-review]").forEach((b) =>
    b.addEventListener("click", () => reviewMember(b.dataset.review)),
  );
}
$("#memberSearch").addEventListener("input", renderMembers);
$("#memberStatus").addEventListener("change", renderMembers);
function reviewMember(id) {
  const items = records();
  const a = items.find((x) => x.id === id);
  if (!a) return;
  const name = `${a.firstName || ""} ${a.lastName || ""}`.trim();
  const info = `Reference: ${a.reference}\nName: ${name}\nEmail: ${a.email}\nPhone: ${a.phone}\nProfession: ${a.profession}\nCategory: ${a.membershipType}\nCountry: ${a.country}\nSkills: ${a.skills || "—"}\nMotivation: ${a.motivation || "—"}\nCurrent status: ${a.status}\n\nEnter new status: Pending, Approved, or Declined`;
  const choice = prompt(info, a.status || "Pending");
  if (choice === null) return;
  const status = choice.trim().toLowerCase();
  if (!["pending", "approved", "declined"].includes(status)) {
    toast("Status must be Pending, Approved or Declined.");
    return;
  }
  a.status = status[0].toUpperCase() + status.slice(1);
  a.reviewedAt = new Date().toISOString();
  store(items);
  renderAdmin();
  renderMembers();
  toast("Application status updated locally.");
}
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(v) {
  return '"' + String(v ?? "").replace(/"/g, '""') + '"';
}
function exportCSV() {
  const items = records();
  if (!items.length) {
    toast("No member registrations to export.");
    return;
  }
  const keys = [
    "reference",
    "status",
    "submittedAt",
    "firstName",
    "lastName",
    "email",
    "phone",
    "country",
    "city",
    "profession",
    "membershipType",
    "employer",
    "qualification",
    "skills",
    "motivation",
  ];
  const csv = [
    keys.join(","),
    ...items.map((a) => keys.map((k) => csvCell(a[k])).join(",")),
  ].join("\r\n");
  download(
    "HCSL-USA-members-" + new Date().toISOString().slice(0, 10) + ".csv",
    "\ufeff" + csv,
    "text/csv;charset=utf-8",
  );
}
function backupJSON() {
  download(
    "HCSL-USA-backup-" + new Date().toISOString().slice(0, 10) + ".json",
    JSON.stringify(
      { exportedAt: new Date().toISOString(), version: 2, members: records() },
      null,
      2,
    ),
    "application/json",
  );
}
$("#exportMembers").addEventListener("click", exportCSV);
$("#backupMembers").addEventListener("click", backupJSON);
renderAdminStats();

/* Version 2 content editor. Content is saved in this browser's localStorage. */
const SITE_CONTENT_KEY = "hcslusa_v2_site_content";
const siteContentDefaults = {
  heroTitle: "Healthcare partnerships. Stronger communities.",
  heroText:
    "Connecting healthcare professionals, volunteers and partners to support better healthcare outcomes in Sierra Leone.",
  aboutTitle: "A shared commitment to better healthcare",
  aboutText:
    "Health Care Sierra Leone USA works to strengthen healthcare through strategic partnerships, volunteerism, training, mentorship and community-focused initiatives.",
  presidentMessage:
    "Welcome to Health Care Sierra Leone USA. Together, we can support healthcare professionals, strengthen local capacity and promote compassionate care.",
  presidentName: "President, Health Care Sierra Leone USA",
  news1Title: "Strengthening partnerships for better healthcare",
  news1Text:
    "Share approved updates on collaboration with healthcare institutions and community partners.",
  news1Image: "",
  news2Title: "Celebrating healthcare professionals and volunteers",
  news2Text:
    "Highlight the contributions and experiences of people supporting healthcare in Sierra Leone.",
  news2Image: "",
  news3Title: "Sharing knowledge and building local capacity",
  news3Text:
    "Publish verified programme stories, training updates and measurable results.",
  news3Image: "",
  phone: "",
  email: "",
  facebook: "",
  instagram: "",
  linkedin: "",
  donation: "",
};
function readSiteContent() {
  try {
    return {
      ...siteContentDefaults,
      ...JSON.parse(localStorage.getItem(SITE_CONTENT_KEY) || "{}"),
    };
  } catch {
    return { ...siteContentDefaults };
  }
}
function applySiteContent(v) {
  const heroTitle = $(".hero h1");
  if (heroTitle && v.heroTitle) heroTitle.textContent = v.heroTitle;
  const heroText = $(".hero-content p");
  if (heroText && v.heroText) heroText.textContent = v.heroText;
  const aboutTitle = $("#about h2");
  if (aboutTitle && v.aboutTitle) aboutTitle.textContent = v.aboutTitle;
  const aboutParagraphs = $$("#about p");
  if (aboutParagraphs.length && v.aboutText)
    aboutParagraphs[0].textContent = v.aboutText;
  const presidentText = document.getElementById("presidentMessageText");
  if (presidentText && v.presidentMessage)
    presidentText.textContent = v.presidentMessage;
  const presidentDraft = document.getElementById("presidentDraftNote");
  if (presidentDraft) {
    presidentDraft.textContent = v.presidentMessage
      ? "Approved message for publication — updated locally in this browser."
      : presidentDraft.textContent;
  }
  const presidentRole = document.getElementById("presidentRole");
  if (presidentRole && v.presidentName) presidentRole.textContent = "President";
  const presidentSignature = document.getElementById("presidentSignature");
  if (presidentSignature && v.presidentName)
    presidentSignature.textContent = v.presidentName;
  const cards = $$(".news-card");
  [1, 2, 3].forEach((n, i) => {
    const c = cards[i];
    if (!c) return;
    const h = c.querySelector("h3"),
      p = c.querySelector("p"),
      img = c.querySelector(".news-image");
    if (h && v["news" + n + "Title"]) h.textContent = v["news" + n + "Title"];
    if (p && v["news" + n + "Text"]) p.textContent = v["news" + n + "Text"];
    if (img && v["news" + n + "Image"]) {
      img.style.backgroundImage = `linear-gradient(#092b5020,#092b5020),url("${v["news" + n + "Image"].replace(/"/g, "%22")}")`;
      img.style.backgroundSize = "cover";
      img.style.backgroundPosition = "center";
    }
  });
  const footer = $("footer");
  if (footer) {
    let box = $("#v2ContactSettings");
    if (!box) {
      box = document.createElement("div");
      box.id = "v2ContactSettings";
      box.className = "v2-contact-settings";
      footer.appendChild(box);
    }
    box.innerHTML = `<p>${v.phone ? `Telephone: <a href="tel:${escapeHTML(v.phone)}">${escapeHTML(v.phone)}</a>` : ""} ${v.email ? ` · Email: <a href="mailto:${escapeHTML(v.email)}">${escapeHTML(v.email)}</a>` : ""}</p><div>${[
      ["Facebook", v.facebook],
      ["Instagram", v.instagram],
      ["LinkedIn", v.linkedin],
      ["Donate", v.donation],
    ]
      .filter((x) => x[1])
      .map(
        (x) =>
          `<a class="v2-social-link" href="${escapeHTML(x[1])}" target="_blank" rel="noopener">${x[0]}</a>`,
      )
      .join(" ")}</div>`;
  }
}

(function injectImpactStyles() {
  if (document.getElementById("hcsl-impact-styles")) return;
  const style = document.createElement("style");
  style.id = "hcsl-impact-styles";
  style.textContent = `
    .impact-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:22px 0 28px}
    .impact-item{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:18px 20px}.impact-item span{display:block;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#cfe0ed}.impact-item strong{display:block;font-size:18px;line-height:1.3;margin-top:8px;color:#fff}
    @media(max-width:620px){.impact-grid{grid-template-columns:1fr}.impact-item strong{font-size:16px}}
  `;
  document.head.appendChild(style);
})();
function fillSiteContentForm() {
  const f = $("#websiteContentForm");
  if (!f) return;
  const v = readSiteContent();
  Object.keys(v).forEach((k) => {
    const el = f.elements.namedItem(k);
    if (el) el.value = v[k] || "";
  });
}
function initV2ContentEditor() {
  const saveBtn = $("#saveWebsiteContent"),
    resetBtn = $("#resetWebsiteContent"),
    form = $("#websiteContentForm");
  if (!form || !saveBtn) return;
  saveBtn.addEventListener("click", () => {
    if (!adminLoggedIn) {
      toast("Please sign in first.");
      return;
    }
    const v = {};
    Object.keys(siteContentDefaults).forEach((k) => {
      const el = form.elements.namedItem(k);
      v[k] = el ? String(el.value || "").trim() : siteContentDefaults[k];
    });
    localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(v));
    applySiteContent(v);
    toast("Website content saved in this browser.");
  });
  resetBtn.addEventListener("click", () => {
    if (confirm("Reset editable text to original Version 2 sample content?")) {
      localStorage.removeItem(SITE_CONTENT_KEY);
      fillSiteContentForm();
      applySiteContent(readSiteContent());
      toast("Website content reset.");
    }
  });
  const nav = $('[data-admin-view="content"]');
  if (nav) nav.addEventListener("click", fillSiteContentForm);
  fillSiteContentForm();
  applySiteContent(readSiteContent());
}
document.addEventListener("DOMContentLoaded", initV2ContentEditor);
