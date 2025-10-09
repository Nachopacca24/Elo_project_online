const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Sprites de tanques
const tankImgBlue = new Image();
tankImgBlue.src = "assets/tank_blue.png";
const tankImgRed = new Image();
tankImgRed.src = "assets/tank_red.png";

// Esperar que se carguen
let imagesLoaded = 0;
[tankImgBlue, tankImgRed].forEach(img => {
  img.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === 2) initGame();
  };
});

function initGame() {
  // --- Obtener nombres de jugadores desde localStorage ---
  const player1 = JSON.parse(localStorage.getItem("player1")) || { username: "Player 1" };
  const player2 = JSON.parse(localStorage.getItem("player2")) || { username: "Player 2" };

  const player1Name = player1.username;
  const player2Name = player2.username;

  // --- Contadores fuera del canvas ---
  const uiDiv = document.createElement("div");
  uiDiv.style.position = "absolute";
  uiDiv.style.top = "10px";
  uiDiv.style.left = "50%";
  uiDiv.style.transform = "translateX(-50%)";
  uiDiv.style.display = "flex";
  uiDiv.style.gap = "50px";
  uiDiv.style.fontFamily = "Arial, sans-serif";
  uiDiv.style.fontSize = "20px";
  document.body.appendChild(uiDiv);

  function createPlayerUI(name, color) {
    const counter = document.createElement("div");
    counter.style.padding = "10px 20px";
    counter.style.borderRadius = "8px";
    counter.style.backgroundColor = color;
    counter.style.color = "white";
    counter.style.display = "flex";
    counter.style.alignItems = "center";
    counter.textContent = `${name}: Ready`;

    const hearts = document.createElement("span");
    hearts.textContent = "❤️❤️❤️";
    hearts.style.marginLeft = "10px";
    counter.appendChild(hearts);

    uiDiv.appendChild(counter);
    return { counter, hearts };
  }

  const { counter: p1Counter, hearts: p1Hearts } = createPlayerUI(player1Name, "rgba(0,0,255,0.7)");
  const { counter: p2Counter, hearts: p2Hearts } = createPlayerUI(player2Name, "rgba(255,0,0,0.7)");

  // --- Clases ---
  class Wall {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
    }

    draw() {
      // 🎨 Degradado metálico
      const gradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
      gradient.addColorStop(0, "#4a4a4a");
      gradient.addColorStop(0.5, "#9e9e9e");
      gradient.addColorStop(1, "#3d3d3d");

      ctx.fillStyle = gradient;
      ctx.fillRect(this.x, this.y, this.width, this.height);

      // 💡 Borde verde suave
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00ff6699";
      ctx.shadowBlur = 4;
      ctx.shadowColor = "#00ff6699";
      ctx.strokeRect(this.x, this.y, this.width, this.height);

      // 🔧 Desactivar sombra para no afectar otros elementos
      ctx.shadowBlur = 0;
    }
  }

  class Bullet {
    constructor(x, y, angle) {
      this.x = x;
      this.y = y;
      this.speed = 7;
      this.radius = 5;
      this.destroyed = false;
      this.createdAt = Date.now();
      this.canHitAfter = 100;

      const rad = (angle - 90) * Math.PI / 180;
      this.vx = this.speed * Math.cos(rad);
      this.vy = this.speed * Math.sin(rad);
    }

    update() {
      if (Date.now() - this.createdAt > 2500) {
        this.destroyed = true;
        return;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Rebote bordes
      if (this.x - this.radius <= 0) { this.x = this.radius; this.vx = -this.vx; }
      if (this.x + this.radius >= canvas.width) { this.x = canvas.width - this.radius; this.vx = -this.vx; }
      if (this.y - this.radius <= 0) { this.y = this.radius; this.vy = -this.vy; }
      if (this.y + this.radius >= canvas.height) { this.y = canvas.height - this.radius; this.vy = -this.vy; }

      // Rebote muros
      for (let wall of walls) {
        if (this.x + this.radius > wall.x && this.x - this.radius < wall.x + wall.width &&
            this.y + this.radius > wall.y && this.y - this.radius < wall.y + wall.height) {
          const prevX = this.x - this.vx;
          const prevY = this.y - this.vy;
          if (prevX + this.radius <= wall.x || prevX - this.radius >= wall.x + wall.width) {
            this.vx = -this.vx;
            this.x = prevX;
          } else if (prevY + this.radius <= wall.y || prevY - this.radius >= wall.y + wall.height) {
            this.vy = -this.vy;
            this.y = prevY;
          } else {
            this.vx = -this.vx;
            this.vy = -this.vy;
          }
        }
      }
    }

    draw() {
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
      gradient.addColorStop(0, "#ff8800");
      gradient.addColorStop(0.6, "#ff3300");
      gradient.addColorStop(1, "#660000");

      ctx.fillStyle = gradient;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ff3300";
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();

      ctx.shadowBlur = 0;
    }
  }

  class Tank {
    constructor(x, y, sprite, controls, counterElement, heartsElement) {
      this.x = x;
      this.y = y;
      this.sprite = sprite;
      this.controls = controls;
      this.angle = 0;
      this.speed = 3;
      this.bullets = [];
      this.size = 180;
      this.turnSpeed = 2.5;
      this.lastShotTime = 0;
      this.counterElement = counterElement;
      this.heartsElement = heartsElement;
      this.lives = 3;
    }

    // Obtener vértices en una posición específica
    getCollisionRectVerticesAt(x, y) {
      const w = this.size * 0.3;
      const h = this.size * 0.35;
      const rad = this.angle * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      return [
        { x: x + (-w/2.3)*cos - (-h/1.5)*sin, y: y + (-w/2.3)*sin + (-h/1.3)*cos },
        { x: x + (w/2)*cos - (-h/1.5)*sin, y: y + (w/2)*sin + (-h/1.3)*cos },
        { x: x + (w/2)*cos - (h/2)*sin, y: y + (w/2)*sin + (h/2.5)*cos },
        { x: x + (-w/2.3)*cos - (h/2)*sin, y: y + (-w/2)*sin + (h/2.5)*cos }
      ];
    }

    // Obtener vértices en la posición actual
    getCollisionRectVertices() {
      return this.getCollisionRectVerticesAt(this.x, this.y);
    }

    // Verificar colisión con un muro en una posición específica
    collidesWithAt(wall, x, y) {
      const verts = this.getCollisionRectVerticesAt(x, y);
      const minX = Math.min(...verts.map(v => v.x));
      const maxX = Math.max(...verts.map(v => v.x));
      const minY = Math.min(...verts.map(v => v.y));
      const maxY = Math.max(...verts.map(v => v.y));

      return !(maxX < wall.x || minX > wall.x + wall.width || 
               maxY < wall.y || minY > wall.y + wall.height);
    }

    // Verificar colisión con cualquier muro en una posición específica
    collidesAnyAt(x, y) {
      return walls.some(w => this.collidesWithAt(w, x, y));
    }

    shoot() {
      const now = Date.now();
      if (now - this.lastShotTime >= 1500) {
        this.bullets.push(new Bullet(this.x, this.y, this.angle));
        this.lastShotTime = now;
      }
    }

    takeHit() {
      this.lives--;
      this.heartsElement.textContent = "❤️".repeat(this.lives);
      if (this.lives <= 0) {
        const winner = this === p1 ? player2Name : player1Name;
        gameOver(winner);
      }
    }

    update() {
      // Rotación
      if (keys[this.controls.left]) this.angle -= this.turnSpeed;
      if (keys[this.controls.right]) this.angle += this.turnSpeed;

      const rad = (this.angle - 90) * Math.PI / 180;
      const moveSpeed = this.speed;

      // Calcular nueva posición
      let nx = this.x;
      let ny = this.y;

      if (keys[this.controls.up]) {
        nx += moveSpeed * Math.cos(rad);
        ny += moveSpeed * Math.sin(rad);
      }
      if (keys[this.controls.down]) {
        nx -= moveSpeed * Math.cos(rad);
        ny -= moveSpeed * Math.sin(rad);
      }

      // Intentar mover en X primero
      if (!this.collidesAnyAt(nx, this.y)) {
        this.x = nx;
      }

      // Intentar mover en Y después
      if (!this.collidesAnyAt(this.x, ny)) {
        this.y = ny;
      }

      // Verificar límites del canvas
      const verts = this.getCollisionRectVertices();
      const minX = Math.min(...verts.map(v => v.x));
      const maxX = Math.max(...verts.map(v => v.x));
      const minY = Math.min(...verts.map(v => v.y));
      const maxY = Math.max(...verts.map(v => v.y));

      const padding = 5;

      // Ajustar si se sale de los bordes
      if (minX < 0 + padding) this.x += (0 + padding - minX);
      if (maxX > canvas.width - padding) this.x -= (maxX - (canvas.width - padding));
      if (minY < 0 + padding) this.y += (0 + padding - minY);
      if (maxY > canvas.height - padding) this.y -= (maxY - (canvas.height - padding));

      // Disparo
      if (keys[this.controls.shoot]) {
        this.shoot();
        keys[this.controls.shoot] = false;
      }

      // Actualizar contador de recarga
      const remaining = Math.max(0, 1500 - (Date.now() - this.lastShotTime));
      this.counterElement.textContent = remaining > 0 
        ? `${this === p1 ? player1Name : player2Name}: ${(remaining/1000).toFixed(1)}s` 
        : "Ready to fire";
      this.counterElement.appendChild(this.heartsElement);

      // Actualizar balas
      this.bullets.forEach(b => b.update());
      this.bullets = this.bullets.filter(b => !b.destroyed);
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle * Math.PI / 180);
      ctx.drawImage(this.sprite, -this.size/2, -this.size/2, this.size, this.size);
      ctx.restore();
      this.bullets.forEach(b => b.draw());
    }
  }

  // --- Muros ---
  let walls = [];
  walls.push(new Wall(0, 0, 1280, 20));
  walls.push(new Wall(0, 700, 1280, 20));
  walls.push(new Wall(0, 0, 20, 720));
  walls.push(new Wall(1260, 0, 20, 720));
  walls.push(new Wall(590, 310, 100, 100));
  walls.push(new Wall(200, 150, 300, 20));
  walls.push(new Wall(780, 550, 300, 20));
  walls.push(new Wall(400, 300, 20, 200));
  walls.push(new Wall(850, 200, 20, 200));
  walls.push(new Wall(150, 500, 80, 20));
  walls.push(new Wall(1050, 200, 80, 20));
  walls.push(new Wall(650, 100, 20, 80));
  walls.push(new Wall(650, 600, 20, 80));

  const p1Controls = { up: "w", down: "s", left: "a", right: "d", shoot: "f" };
  const p2Controls = { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright", shoot: " " };

  const p1 = new Tank(300, 300, tankImgBlue, p1Controls, p1Counter, p1Hearts);
  const p2 = new Tank(1000, 500, tankImgRed, p2Controls, p2Counter, p2Hearts);

  function ensureValidSpawn(tank) {
    if (!tank.collidesAnyAt(tank.x, tank.y)) return;
    const step = 10;
    let attempts = 0;
    while (tank.collidesAnyAt(tank.x, tank.y) && attempts < 50) { tank.y -= step; attempts++; }
    attempts = 0;
    while (tank.collidesAnyAt(tank.x, tank.y) && attempts < 50) { tank.x -= step; attempts++; }
    attempts = 0;
    while (tank.collidesAnyAt(tank.x, tank.y) && attempts < 50) { tank.x += step; attempts++; }
  }

  ensureValidSpawn(p1);
  ensureValidSpawn(p2);

  let keys = {};
  window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
  window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

  function checkBulletHits() {
    const now = Date.now();
    for (let bullet of [...p1.bullets, ...p2.bullets]) {
      if (now - bullet.createdAt < bullet.canHitAfter) continue;
      for (let tank of [p1, p2]) {
        const verts = tank.getCollisionRectVertices();
        const minX = Math.min(...verts.map(v => v.x));
        const maxX = Math.max(...verts.map(v => v.x));
        const minY = Math.min(...verts.map(v => v.y));
        const maxY = Math.max(...verts.map(v => v.y));
        if (bullet.x > minX && bullet.x < maxX && bullet.y > minY && bullet.y < maxY) {
          tank.takeHit();
          bullet.destroyed = true;
          break;
        }
      }
    }
  }

  // --- Game Over ---
  let gameEnded = false;
  let winnerText = "";

  async function gameOver(winner) {
    if (gameEnded) return;
    gameEnded = true;
    winnerText = `${winner} WINS!`;

    // --- Obtener nombres ---
    const player1 = JSON.parse(localStorage.getItem("player1"));
    const player2 = JSON.parse(localStorage.getItem("player2"));

    try {
      const res = await fetch("/update-elo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1: player1.username,
          player2: player2.username,
          winner
        })
      });

      const data = await res.json();

      if (data.success) {
        // Guardar ELOs actualizados en localStorage
        localStorage.setItem("player1", JSON.stringify(data.updated.player1));
        localStorage.setItem("player2", JSON.stringify(data.updated.player2));
        console.log("ELO actualizado desde servidor:", data.updated);
      } else {
        console.error("Error al actualizar ELO:", data.error);
      }
    } catch (err) {
      console.error("Error de red al actualizar ELO:", err);
    }

    setTimeout(() => {
      localStorage.removeItem("player1");
      localStorage.removeItem("player2");
      window.location.href = "login.html";
    }, 3000);
  }

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    walls.forEach(w => w.draw());
    p1.update();
    p2.update();
    checkBulletHits();
    p1.draw();
    p2.draw();

    if (gameEnded) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "white";
      ctx.font = "bold 80px Arial";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);

      ctx.font = "bold 60px Arial";
      ctx.fillText(winnerText, canvas.width / 2, canvas.height / 2 + 40);
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  gameLoop();
}