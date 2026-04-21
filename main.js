// TARKISTETAAN KIRJAUTUMISTILA HETI KUN SIVU LATAUTUU
document.addEventListener("DOMContentLoaded", function() {
    paivitaNakymat();
});

// NÄKYMIEN HALLINTA
function avaaRekisterointi() {
    document.getElementById("loginform").style.display = "none";
    document.getElementById("registerform").style.display = "block";
}

function peruutaRekisterointi() {
    document.getElementById("registerform").style.display = "none";
    document.getElementById("loginform").style.display = "block";
}

function peruutaKirjautuminen() {
    document.getElementById("username").value = "";
    document.getElementById("userpassword").value = "";
}

// REKISTERÖITYMINEN
function rekisteroidy() {
    const user = document.getElementById("newUsername").value;
    const email = document.getElementById("email").value;
    const pass = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;
    const errorMsg = document.getElementById("registererror");

    if (!user || !email || !pass) {
        errorMsg.innerText = "Täytä kaikki kentät!";
        return;
    }

    if (pass !== confirm) {
        errorMsg.innerText = "Salasanat eivät täsmää!";
        return;
    }

    // Tallennetaan käyttäjä localStorageen (avain = käyttäjänimi)
    const userData = { username: user, email: email, password: pass };
    localStorage.setItem(user, JSON.stringify(userData));

    alert("Tili luotu onnistuneesti!");
    peruutaRekisterointi();
}

// KIRJAUTUMINEN
function kirjaudu() {
    const userIn = document.getElementById("username").value;
    const passIn = document.getElementById("userpassword").value;
    const errorMsg = document.getElementById("loginerror");

    const storedUser = JSON.parse(localStorage.getItem(userIn));

    if (storedUser && storedUser.password === passIn) {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("currentUser", userIn);
        errorMsg.style.display = "none";
        paivitaNakymat();
    } else {
        errorMsg.style.display = "block";
    }
}

// KIRJAUDU ULOS
function kirjauduUlos() {
    sessionStorage.clear();
    location.reload(); // Päivittää sivun ja nollaa näkymän
}

// NÄKYMIEN PÄIVITYS (Mitä käyttäjä näkee)
function paivitaNakymat() {
    const loggedIn = sessionStorage.getItem("isLoggedIn") === "true";
    const user = sessionStorage.getItem("currentUser");

    if (loggedIn) {
        document.getElementById("loginform").style.display = "none";
        document.getElementById("registerform").style.display = "none";
        document.getElementById("logoutbutton").style.display = "block";
        document.getElementById("welcome-area").style.display = "block";
        document.getElementById("welcome-text").innerText = "Tervetuloa, " + user + "!";
    } else {
        document.getElementById("loginform").style.display = "block";
        document.getElementById("logoutbutton").style.display = "none";
        document.getElementById("welcome-area").style.display = "none";
    }
}