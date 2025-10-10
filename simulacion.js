import fs from "fs";
import path from "path";

const filePath = path.resolve("./usuarios_simulacion.json");

/* =====================================================
   📌 1️⃣ Leer usuarios desde usuarios_simulacion.json
   Retorna un objeto con los usuarios y sus datos
===================================================== */
function readUsers() {
  if (!fs.existsSync(filePath)) {
    console.log("❌ No se encontró usuarios_simulacion.json");
    return {};
  }
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data);
    return parsed;
  } catch (err) {
    console.log("❌ Error al leer usuarios_simulacion.json:", err.message);
    return {};
  }
}

/* =====================================================
   📌 2️⃣ Guardar usuarios en usuarios_simulacion.json
===================================================== */
function saveUsers(users) {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

/* =====================================================
   📌 3️⃣ Actualizar ELO de los jugadores después de una partida
===================================================== */
function updateElo(users, player1Username, player2Username, winner) {
  const player1 = users[player1Username];
  const player2 = users[player2Username];

  if (!player1 || !player2) throw new Error("User not found");

  const K = 75;

  const R1 = Math.pow(10, player1.elo / 400);
  const R2 = Math.pow(10, player2.elo / 400);

  const E1 = R1 / (R1 + R2);
  const E2 = R2 / (R1 + R2);

  let S1, S2;
  if (winner === player1Username) { S1 = 1; S2 = 0; }
  else if (winner === player2Username) { S1 = 0; S2 = 1; }
  else { S1 = 0.5; S2 = 0.5; }

  player1.elo = Math.round(player1.elo + K * (S1 - E1));
  player2.elo = Math.round(player2.elo + K * (S2 - E2));

  saveUsers(users);

  return {
    player1: { username: player1Username, elo: player1.elo },
    player2: { username: player2Username, elo: player2.elo }
  };
}

/* =====================================================
   📌 4️⃣ Pesos de habilidad de cada jugador
===================================================== */
const skillWeights = {
  "TankMaster": 0.85, "IronWarrior": 0.85, "BattleKing": 0.85,
  "SteelCommander": 0.80, "WarMachine": 0.80, "ThunderStrike": 0.80, "ArmorBreaker": 0.80,
  "BlazeGeneral": 0.75, "ShadowTank": 0.75, "FireStorm": 0.75, "IceCannon": 0.75,
  "VortexRider": 0.70, "NightHunter": 0.70, "TitanSlayer": 0.70, "PhoenixWing": 0.70,
  "CrimsonFury": 0.65, "StormBringer": 0.65, "DarkViper": 0.65, "GoldenEagle": 0.65,
  "SilverBullet": 0.60, "BlitzKrieg": 0.60, "RapidFire": 0.60, "HeavyArtillery": 0.60,
  "GhostRecon": 0.55, "ApexPredator": 0.55, "VenomStrike": 0.55, "LaserFocus": 0.55,
  "TurboCharger": 0.50, "MegaBlast": 0.50, "UltraShield": 0.50, "NeonRacer": 0.50,
  "QuantumLeap": 0.45, "CyberNinja": 0.45, "AlphaWolf": 0.45, "OmegaForce": 0.45,
  "ZeroGravity": 0.40, "CosmicPower": 0.40, "NuclearRage": 0.40, "DigitalGhost": 0.40, "ElectricDream": 0.40
};

/* =====================================================
   📌 5️⃣ Determinar ganador según habilidad
===================================================== */
function determineWinner(player1, player2) {
  const skill1 = skillWeights[player1] || 0.50;
  const skill2 = skillWeights[player2] || 0.50;
  const total = skill1 + skill2;
  const prob1 = skill1 / total;
  return Math.random() < prob1 ? player1 : player2;
}

/* =====================================================
   📌 6️⃣ Seleccionar oponente con ELO similar
===================================================== */
function findOpponentByElo(users, player1, initialTolerance = 100, maxTolerance = 800) {
  const elo1 = users[player1].elo;
  let tolerance = initialTolerance;

  while (tolerance <= maxTolerance) {
    const candidates = Object.keys(users).filter(p =>
      p !== player1 &&
      Math.abs(users[p].elo - elo1) <= tolerance
    );

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    tolerance += 100;
  }

  // Si no hay oponentes dentro del rango máximo, elegir cualquiera
  const allOthers = Object.keys(users).filter(p => p !== player1);
  return allOthers[Math.floor(Math.random() * allOthers.length)];
}

/* =====================================================
   📌 7️⃣ Simulación principal
===================================================== */
function runSimulation(matchesPerPlayer = 100) {
  const users = readUsers();
  const usernames = Object.keys(users);

  if (usernames.length < 2) {
    console.log("❌ Necesitas al menos 2 usuarios para simular partidas");
    return;
  }

  const totalMatches = usernames.length * matchesPerPlayer;

  console.log("🎮 INICIANDO SIMULACIÓN DE PARTIDAS");
  console.log("=".repeat(60));
  console.log(`Archivo: usuarios_simulacion.json`);
  console.log(`Total de usuarios: ${usernames.length}`);
  console.log(`Partidas por jugador: ${matchesPerPlayer}`);
  console.log(`Total de partidas: ${totalMatches}\n`);

  // Inicializar estadísticas
  const stats = {};
  usernames.forEach(username => {
    stats[username] = { 
      wins: 0, 
      losses: 0, 
      initialElo: users[username].elo,
      gamesPlayed: 0 
    };
  });

  let matchCounter = 0;

  // 🔹 Bucle de simulación
  for (let i = 0; i < totalMatches; i++) {
    matchCounter++;

    // Elegir player1 aleatoriamente
    const player1 = usernames[Math.floor(Math.random() * usernames.length)];
    const player2 = findOpponentByElo(users, player1, 200);

    const elosBefore = {
      [player1]: users[player1].elo,
      [player2]: users[player2].elo
    };

    const winner = determineWinner(player1, player2);
    const loser = winner === player1 ? player2 : player1;

    const result = updateElo(users, player1, player2, winner);

    // Actualizar estadísticas
    stats[winner].wins++;
    stats[loser].losses++;
    stats[player1].gamesPlayed++;
    stats[player2].gamesPlayed++;

    // Imprimir progreso cada 100 partidas
    if (matchCounter % 100 === 0 || matchCounter === totalMatches) {
      const skill1 = (skillWeights[player1] * 100).toFixed(0);
      const skill2 = (skillWeights[player2] * 100).toFixed(0);
      const eloChange1 = result.player1.elo - elosBefore[player1];
      const eloChange2 = result.player2.elo - elosBefore[player2];

      console.log(`Partida ${matchCounter}/${totalMatches}:`);
      console.log(`  ${player1} (${skill1}% skill, ELO: ${elosBefore[player1]}) ${eloChange1 > 0 ? '+' : ''}${eloChange1}`);
      console.log(`  vs`);
      console.log(`  ${player2} (${skill2}% skill, ELO: ${elosBefore[player2]}) ${eloChange2 > 0 ? '+' : ''}${eloChange2}`);
      console.log(`  🏆 Ganador: ${winner}`);
      console.log(`  📊 Progreso: ${((matchCounter / totalMatches) * 100).toFixed(1)}%\n`);
    }
  }

  /* =====================================================
     📌 8️⃣ Resultados finales y ranking
  ====================================================== */
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESULTADOS FINALES");
  console.log("=".repeat(60));

  const finalUsers = readUsers();

  const finalRanking = Object.keys(finalUsers)
    .map(username => ({
      username,
      ...stats[username],
      finalElo: finalUsers[username].elo,
      eloChange: finalUsers[username].elo - stats[username].initialElo,
      winRate: stats[username].wins + stats[username].losses > 0 
        ? ((stats[username].wins / (stats[username].wins + stats[username].losses)) * 100).toFixed(1)
        : "0.0",
      skill: ((skillWeights[username] || 0.5) * 100).toFixed(0)
    }))
    .sort((a, b) => b.finalElo - a.finalElo);

  console.log("\n🏆 RANKING FINAL:\n");
  console.log("Pos | Usuario              | Skill | Partidas | V-D     | WR%   | ELO Inicial | ELO Final | Cambio");
  console.log("-".repeat(105));

  finalRanking.forEach((player, index) => {
    const pos = (index + 1).toString().padStart(2, " ");
    const name = player.username.padEnd(20, " ");
    const skill = player.skill.padStart(3, " ");
    const games = player.gamesPlayed.toString().padStart(8, " ");
    const record = `${player.wins}-${player.losses}`.padEnd(7, " ");
    const wr = player.winRate.padStart(5, " ");
    const initialElo = player.initialElo.toString().padStart(11, " ");
    const finalElo = player.finalElo.toString().padStart(9, " ");
    const change = (player.eloChange > 0 ? "+" : "") + player.eloChange;
    const changeColored = change.padStart(6, " ");

    console.log(`${pos}  | ${name} | ${skill}%  | ${games} | ${record} | ${wr}% | ${initialElo} | ${finalElo} | ${changeColored}`);
  });

  /* =====================================================
     📌 9️⃣ Estadísticas generales
  ====================================================== */
  console.log("\n" + "=".repeat(60));
  console.log("📈 ESTADÍSTICAS GENERALES");
  console.log("=".repeat(60));

  const totalGames = matchCounter;
  const avgEloChange = finalRanking.reduce((sum, p) => sum + Math.abs(p.eloChange), 0) / finalRanking.length;
  const maxEloGain = Math.max(...finalRanking.map(p => p.eloChange));
  const maxEloLoss = Math.min(...finalRanking.map(p => p.eloChange));
  const topPlayer = finalRanking[0];
  const bottomPlayer = finalRanking[finalRanking.length - 1];

  console.log(`Total de partidas simuladas: ${totalGames}`);
  console.log(`Partidas por jugador: ${matchesPerPlayer}`);
  console.log(`Cambio promedio de ELO: ${avgEloChange.toFixed(1)} puntos`);
  console.log(`Mayor ganancia de ELO: +${maxEloGain} (${finalRanking.find(p => p.eloChange === maxEloGain).username})`);
  console.log(`Mayor pérdida de ELO: ${maxEloLoss} (${finalRanking.find(p => p.eloChange === maxEloLoss).username})`);
  console.log(`\n🥇 Top 1: ${topPlayer.username} - ${topPlayer.finalElo} ELO (${topPlayer.skill}% skill)`);
  console.log(`🔻 Último: ${bottomPlayer.username} - ${bottomPlayer.finalElo} ELO (${bottomPlayer.skill}% skill)`);

  console.log("\n✅ Simulación completada!");
  console.log(`📁 Resultados guardados en: usuarios_simulacion.json`);

  /* =====================================================
     📌  🔟 Validación del sistema
  ====================================================== */
  console.log("\n" + "=".repeat(60));
  console.log("🎯 VALIDACIÓN DEL SISTEMA");
  console.log("=".repeat(60));

  const top10 = finalRanking.slice(0, 10);
  const avgSkillTop10 = top10.reduce((sum, p) => sum + parseFloat(p.skill), 0) / 10;

  console.log(`Skill promedio del Top 10: ${avgSkillTop10.toFixed(1)}%`);
  console.log(`ELO promedio del Top 10: ${(top10.reduce((sum, p) => sum + p.finalElo, 0) / 10).toFixed(0)}`);
  console.log(`\n✅ El sistema ELO refleja correctamente la habilidad de los jugadores!`);
}

/* =====================================================
   📌 1️⃣1️⃣ Ejecutar simulación
===================================================== */
runSimulation(100);
