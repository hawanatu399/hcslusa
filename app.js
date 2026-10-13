$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.currentTarget;
  const formData = Object.fromEntries(new FormData(form).entries());
  const loginError = $("#loginError");

  // Static Netlify hosting does not run server.js
  // or provide the /api/admin/login endpoint.
  // This is for demonstration purposes only.

  if (
    formData.username === ADMIN_USERNAME &&
    formData.password === ADMIN_PASSWORD
  ) {
    adminLoggedIn = true;

    loginError.hidden = true;
    closeModals();

    $("#adminScreen").hidden = false;
    document.body.style.overflow = "hidden";

    showAdminView("dashboard");
    renderAdmin();

    toast("Admin login successful (offline demo).");
    form.reset();
  } else {
    loginError.textContent = "Username or password is incorrect.";
    loginError.hidden = false;
  }
});
