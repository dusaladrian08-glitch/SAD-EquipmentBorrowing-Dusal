const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

async function checkExistingSession() {
    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error.message);
        return;
    }

    if (data.session) {
        window.location.href = "index.html";
    }
}

if (loginForm) {
    checkExistingSession();

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        loginMessage.textContent = "";
        loginMessage.className = "login-message";

        loginButton.disabled = true;
        loginButton.textContent = "Signing in...";

        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
           loginMessage.textContent =
    "Login failed: " + error.message;

console.error("Supabase login error:", error);

            loginMessage.classList.add("error");

            loginButton.disabled = false;
            loginButton.textContent = "Sign In";
            return;
        }

        loginMessage.textContent = "Login successful.";
        loginMessage.classList.add("success");

        window.location.href = "index.html";
    });
}

async function logout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Logout failed: " + error.message);
        return;
    }

    window.location.href = "login.html";
}

async function requireLogin() {
    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error || !data.session) {
        window.location.href = "login.html";
        return null;
    }

    return data.session;
}