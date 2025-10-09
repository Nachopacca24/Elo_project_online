// Funciones de registro/login

// --- Función para cargar ranking ---
async function loadRanking() {
  try {
    const res = await fetch("/get-users"); 
    const users = await res.json();

    // Ordenar por ELO descendente
    users.sort((a, b) => b.elo - a.elo);

    const rankingList = document.getElementById("rankingList");
    rankingList.innerHTML = "";

    users.forEach((user, index) => {
      const li = document.createElement("li");
      li.textContent = `${index + 1}. ${user.username} - 🏅: ${user.elo}`;
      rankingList.appendChild(li);
    });

  } catch (err) {
    console.error("Error loading Ranking:", err);
  }
}

// Limpiar localStorage de jugadores al cargar la página de login
localStorage.removeItem("player1");
localStorage.removeItem("player2");
localStorage.removeItem("player1Elo");
localStorage.removeItem("player2Elo");

// Cargar ranking al abrir la página
loadRanking();

async function registerUser(username, password) {
  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return await res.json();
}

async function loginUser(username, password) {
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return await res.json();
}

// Mostrar mensajes
function showMessage(targetElement, message, color = "green") {
  let container = targetElement.querySelector(".msg");
  if (!container) {
    container = document.createElement("div");
    container.className = "msg";
    container.style.marginTop = "5px";
    container.style.padding = "8px";
    container.style.borderRadius = "5px";
    container.style.fontWeight = "bold";
    container.style.textAlign = "center";
    targetElement.appendChild(container);
  }
  container.textContent = message;
  container.style.color = color;
  container.style.backgroundColor = color === "red" ? "rgba(255,0,0,0.2)" : "rgba(0,255,0,0.2)";
}

// Player 1
const p1Container = document.getElementById("player1Container");
document.getElementById("btnRegister1").addEventListener("click", async () => {
  const username = document.getElementById("username1").value.trim();
  const password = document.getElementById("password1").value.trim();
  const result = await registerUser(username, password);
  showMessage(p1Container, result.error || `P1 ${username} registrado!`, result.error ? "red" : "green");
});

document.getElementById("btnLogin1").addEventListener("click", async () => {
  const username = document.getElementById("username1").value.trim();
  const password = document.getElementById("password1").value.trim();
  
  // Verificar si Player 2 ya está usando este usuario
  const player2 = JSON.parse(localStorage.getItem("player2"));
  if (player2 && player2.username === username) {
    return showMessage(p1Container, "This user is already logged in as Player 2!", "red");
  }
  
  const result = await loginUser(username, password);
  if (result.error) return showMessage(p1Container, result.error, "red");

  // Guardar el username del input y el elo del resultado
  localStorage.setItem("player1", JSON.stringify({ username: username, elo: result.elo }));
  showMessage(p1Container, `P1 ${username} Ready!`, "green");
});

// Player 2
const p2Container = document.getElementById("player2Container");
document.getElementById("btnRegister2").addEventListener("click", async () => {
  const username = document.getElementById("username2").value.trim();
  const password = document.getElementById("password2").value.trim();
  const result = await registerUser(username, password);
  showMessage(p2Container, result.error || `P2 ${username} Registred!`, result.error ? "red" : "green");
});

document.getElementById("btnLogin2").addEventListener("click", async () => {
  const username = document.getElementById("username2").value.trim();
  const password = document.getElementById("password2").value.trim();
  
  // Verificar si Player 1 ya está usando este usuario
  const player1 = JSON.parse(localStorage.getItem("player1"));
  if (player1 && player1.username === username) {
    return showMessage(p2Container, "This user is already logged in as Player 1!", "red");
  }
  
  const result = await loginUser(username, password);
  if (result.error) return showMessage(p2Container, result.error, "red");

  localStorage.setItem("player2", JSON.stringify({ username: username, elo: result.elo }));
  showMessage(p2Container, `P2 ${username} Ready!`, "green");
});

// Botón jugar
const playContainer = document.getElementById("playContainer");
document.getElementById("btnPlay").addEventListener("click", () => {
  const p1 = JSON.parse(localStorage.getItem("player1"));
  const p2 = JSON.parse(localStorage.getItem("player2"));
  if (!p1 || !p2) return showMessage(playContainer, "Both players have to Login", "red");

  // Doble verificación antes de iniciar el juego
  if (p1.username === p2.username) {
    return showMessage(playContainer, "Players must be different!", "red");
  }

  localStorage.setItem("player1Elo", p1.elo);
  localStorage.setItem("player2Elo", p2.elo);

  window.location.href = "game.html";
});

loadRanking();