import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readUsers, saveUsers, updateElo } from "./elo.js";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos públicos
app.use(express.static(path.join(__dirname, "public")));

// Registro de usuario
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  if (users[username]) return res.json({ error: "Usuario ya existe" });

  users[username] = { password, elo: 1000 };
  saveUsers(users);
  res.json({ success: true, username, elo: 1000 });
});

// Login de usuario
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  const user = users[username];
  if (!user) return res.json({ error: "Usuario no encontrado" });
  if (user.password !== password) return res.json({ error: "Contraseña incorrecta" });

  res.json({ username, elo: user.elo });
});

// ✅ Ranking global
app.get("/get-users", (req, res) => {
  const usersObj = readUsers(); // { username: { password, elo } }
  const usersArray = Object.keys(usersObj).map(username => ({
    username,
    elo: usersObj[username].elo
  }));
  res.json(usersArray); // Devuelve un array [{ username, elo }, ...]
});

// Actualizar ELO
app.post("/update-elo", (req, res) => {
  const { player1, player2, winner } = req.body;
  try {
    const updated = updateElo(player1, player2, winner);
    res.json({ success: true, updated });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
