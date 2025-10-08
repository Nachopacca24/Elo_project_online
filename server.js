const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

// Escuchar en todas las interfaces para que otros puedan conectarse
app.listen(PORT, "192.168.10.144", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
