import fs from "fs";
import path from "path";

const filePath = path.resolve("./users.json");

// Leer usuarios desde JSON
export function readUsers() {
  if (!fs.existsSync(filePath)) return {};
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

// Guardar usuarios en JSON
export function saveUsers(users) {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

// Actualizar ELO después de una partida
export function updateElo(player1, player2, winner) {
  const users = readUsers();

  if (!users[player1] || !users[player2]) throw new Error("Jugador no encontrado");

  const K = 30;

  const R1 = Math.pow(10, users[player1].elo / 400);
  const R2 = Math.pow(10, users[player2].elo / 400);

  const E1 = R1 / (R1 + R2);
  const E2 = R2 / (R1 + R2);

  let S1, S2;
  if (winner === player1) { S1 = 1; S2 = 0; }
  else if (winner === player2) { S1 = 0; S2 = 1; }
  else { S1 = 0.5; S2 = 0.5; }

  users[player1].elo = Math.round(users[player1].elo + K * (S1 - E1));
  users[player2].elo = Math.round(users[player2].elo + K * (S2 - E2));

  saveUsers(users);

  return {
    player1: { username: player1, elo: users[player1].elo },
    player2: { username: player2, elo: users[player2].elo }
  };
}
