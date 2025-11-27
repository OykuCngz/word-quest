const ADMIN_PASSWORD = "695802";        
const ADMIN_STORAGE_KEY = "wordquest_admin_auth";

const form = document.getElementById("admin-login-form");
const passInput = document.getElementById("admin-password-input");
const statusEl = document.getElementById("admin-login-status");


if (localStorage.getItem(ADMIN_STORAGE_KEY) === "yes") {
  window.location.href = "/admin.html";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const value = passInput.value.trim();

  if (!value) {
    statusEl.textContent = "Please enter the password.";
    statusEl.className = "feedback-pill error";
    return;
  }

  if (value === ADMIN_PASSWORD) {

    localStorage.setItem(ADMIN_STORAGE_KEY, "yes");
    statusEl.textContent = "Login successful. Redirecting...";
    statusEl.className = "feedback-pill success";

    setTimeout(() => {
      window.location.href = "/admin.html";
    }, 500);
  } else {
   
    statusEl.textContent = "Wrong password.";
    statusEl.className = "feedback-pill error";
  }
});
