import fs from "fs";
import path from "path";

const filePath = path.resolve("./usuarios_simulacion.json");

// Leer usuarios desde JSON
function readUsers() {
  if (!fs.existsSync(filePath)) {
    console.log("❌ No se encontró usuarios_simulacion.json");
    return [];
  }
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

// Guardar usuarios en JSON
function saveUsers(users) {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

// Actualizar ELO después de una partida
function updateElo(users, player1Username, player2Username, winner) {
  const player1 = users.find(u => u.username === player1Username);
  const player2 = users.find(u => u.username === player2Username);

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

  // Guardar cambios inmediatamente
  saveUsers(users);

  return {
    player1: { username: player1Username, elo: player1.elo },
    player2: { username: player2Username, elo: player2.elo }
  };
}

// Asignar pesos de habilidad a los usuarios (probabilidad de ganar)
const skillWeights = {
  // Top tier - 85% probabilidad
  "TankMaster": 0.85,
  "IronWarrior": 0.85,
  "BattleKing": 0.85,
  
  // Alto - 80%
  "SteelCommander": 0.80,
  "WarMachine": 0.80,
  "ThunderStrike": 0.80,
  "ArmorBreaker": 0.80,
  
  // Bueno - 75%
  "BlazeGeneral": 0.75,
  "ShadowTank": 0.75,
  "FireStorm": 0.75,
  "IceCannon": 0.75,
  
  // Arriba del promedio - 70%
  "VortexRider": 0.70,
  "NightHunter": 0.70,
  "TitanSlayer": 0.70,
  "PhoenixWing": 0.70,
  
  // Promedio alto - 65%
  "CrimsonFury": 0.65,
  "StormBringer": 0.65,
  "DarkViper": 0.65,
  "GoldenEagle": 0.65,
  
  // Promedio - 60%
  "SilverBullet": 0.60,
  "BlitzKrieg": 0.60,
  "RapidFire": 0.60,
  "HeavyArtillery": 0.60,
  
  // Promedio bajo - 55%
  "GhostRecon": 0.55,
  "ApexPredator": 0.55,
  "VenomStrike": 0.55,
  "LaserFocus": 0.55,
  
  // Debajo del promedio - 50%
  "TurboCharger": 0.50,
  "MegaBlast": 0.50,
  "UltraShield": 0.50,
  "NeonRacer": 0.50,
  
  // Bajo - 45%
  "QuantumLeap": 0.45,
  "CyberNinja": 0.45,
  "AlphaWolf": 0.45,
  "OmegaForce": 0.45,
  
  // Muy bajo - 40%
  "ZeroGravity": 0.40,
  "CosmicPower": 0.40,
  "NuclearRage": 0.40,
  "DigitalGhost": 0.40
};

// Función para determinar ganador basado en habilidad
function determineWinner(player1, player2) {
  const skill1 = skillWeights[player1] || 0.50;
  const skill2 = skillWeights[player2] || 0.50;
  
  // Normalizar probabilidades para que sumen 1
  const total = skill1 + skill2;
  const prob1 = skill1 / total;
  
  // Random con peso
  const random = Math.random();
  return random < prob1 ? player1 : player2;
}

// Función principal de simulación
function runSimulation(matchesPerPlayer = 100) {
  const users = readUsers();
  
  if (users.length < 2) {
    console.log("❌ Necesitas al menos 2 usuarios para simular partidas");
    return;
  }
  
  const totalMatches = users.length * matchesPerPlayer;
  
  console.log("🎮 INICIANDO SIMULACIÓN DE PARTIDAS");
  console.log("=".repeat(60));
  console.log(`Archivo: usuarios_simulacion.json`);
  console.log(`Total de usuarios: ${users.length}`);
  console.log(`Partidas por jugador: ${matchesPerPlayer}`);
  console.log(`Total de partidas: ${totalMatches}\n`);
  
  // Estadísticas
  const stats = {};
  users.forEach(user => {
    stats[user.username] = { wins: 0, losses: 0, initialElo: user.elo, gamesPlayed: 0 };
  });
  
  let matchCounter = 0;
  
  // Simular partidas - cada jugador juega matchesPerPlayer veces
  for (let i = 0; i < users.length; i++) {
    const player1Username = users[i].username;
    
    for (let j = 0; j < matchesPerPlayer; j++) {
      matchCounter++;
      
      // Seleccionar oponente aleatorio (diferente al jugador actual)
      let player2Username;
      do {
        const randomIndex = Math.floor(Math.random() * users.length);
        player2Username = users[randomIndex].username;
      } while (player2Username === player1Username);
      
      // Determinar ganador basado en habilidad
      const winner = determineWinner(player1Username, player2Username);
      const loser = winner === player1Username ? player2Username : player1Username;
      
      // Obtener ELO antes de actualizar
      const player1 = users.find(u => u.username === player1Username);
      const player2 = users.find(u => u.username === player2Username);
      const elosBefore = {
        [player1Username]: player1.elo,
        [player2Username]: player2.elo
      };
      
      // Actualizar ELO (esto guarda automáticamente en el JSON)
      const result = updateElo(users, player1Username, player2Username, winner);
      
      // Actualizar estadísticas
      stats[winner].wins++;
      stats[loser].losses++;
      stats[player1Username].gamesPlayed++;
      stats[player2Username].gamesPlayed++;
      
      // Mostrar resultado cada 100 partidas para no saturar la consola
      if (matchCounter % 100 === 0 || matchCounter === totalMatches) {
        const skill1 = (skillWeights[player1Username] * 100).toFixed(0);
        const skill2 = (skillWeights[player2Username] * 100).toFixed(0);
        const eloChange1 = result.player1.elo - elosBefore[player1Username];
        const eloChange2 = result.player2.elo - elosBefore[player2Username];
        
        console.log(`Partida ${matchCounter}/${totalMatches}:`);
        console.log(`  ${player1Username} (${skill1}% skill, ELO: ${elosBefore[player1Username]}) ${eloChange1 > 0 ? '+' : ''}${eloChange1}`);
        console.log(`  vs`);
        console.log(`  ${player2Username} (${skill2}% skill, ELO: ${elosBefore[player2Username]}) ${eloChange2 > 0 ? '+' : ''}${eloChange2}`);
        console.log(`  🏆 Ganador: ${winner}`);
        console.log(`  📊 Progreso: ${((matchCounter / totalMatches) * 100).toFixed(1)}%\n`);
      }
    }
  }
  
  // Mostrar resultados finales
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESULTADOS FINALES");
  console.log("=".repeat(60));
  
  // Recargar usuarios actualizados del JSON
  const updatedUsers = readUsers();
  
  // Ordenar por ELO final
  const finalRanking = updatedUsers
    .map(user => ({
      username: user.username,
      ...stats[user.username],
      finalElo: user.elo,
      eloChange: user.elo - stats[user.username].initialElo,
      winRate: stats[user.username].wins + stats[user.username].losses > 0 
        ? ((stats[user.username].wins / (stats[user.username].wins + stats[user.username].losses)) * 100).toFixed(1)
        : "0.0",
      skill: ((skillWeights[user.username] || 0.5) * 100).toFixed(0)
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
  
  // Estadísticas generales
  console.log("\n" + "=".repeat(60));
  console.log("📈 ESTADÍSTICAS GENERALES");
  console.log("=".repeat(60));
  
  const totalGames = matchCounter;
  const avgEloChange = finalRanking.reduce((sum, p) => sum + Math.abs(p.eloChange), 0) / finalRanking.length;
  const maxEloGain = Math.max(...finalRanking.map(p => p.eloChange));
  const maxEloLoss = Math.min(...finalRanking.map(p => p.eloChange));
  
  console.log(`Total de partidas simuladas: ${totalGames}`);
  console.log(`Partidas por jugador: ${matchesPerPlayer}`);
  console.log(`Cambio promedio de ELO: ${avgEloChange.toFixed(1)} puntos`);
  console.log(`Mayor ganancia de ELO: +${maxEloGain} (${finalRanking.find(p => p.eloChange === maxEloGain).username})`);
  console.log(`Mayor pérdida de ELO: ${maxEloLoss} (${finalRanking.find(p => p.eloChange === maxEloLoss).username})`);
  
  console.log("\n✅ Simulación completada!");
  console.log(`📁 Resultados guardados en: ${filePath}`);
}

// Ejecutar simulación
runSimulation(100);