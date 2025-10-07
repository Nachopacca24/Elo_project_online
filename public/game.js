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

  const p1Counter = document.createElement("div");
  p1Counter.style.padding = "10px 20px";
  p1Counter.style.borderRadius = "8px";
  p1Counter.style.backgroundColor = "rgba(0,0,255,0.7)";
  p1Counter.style.color = "white";
  p1Counter.textContent = "Player 1: Ready";
  uiDiv.appendChild(p1Counter);

  const p2Counter = document.createElement("div");
  p2Counter.style.padding = "10px 20px";
  p2Counter.style.borderRadius = "8px";
  p2Counter.style.backgroundColor = "rgba(255,0,0,0.7)";
  p2Counter.style.color = "white";
  p2Counter.textContent = "Player 2: Ready";
  uiDiv.appendChild(p2Counter);

  // --- Clases ---
  class Wall {
    constructor(x, y, w, h) {
      this.x = x; this.y = y;
      this.width = w; this.height = h;
    }
    draw() {
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.strokeStyle = "black";
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }

  class Bullet {
    constructor(x, y, angle) {
      this.x = x;
      this.y = y;
      this.speed = 7;
      this.radius = 5;
      this.destroyed = false;
      this.createdAt = Date.now(); // Para duración de 2.5s

      const rad = (angle - 90) * Math.PI / 180;
      this.vx = this.speed * Math.cos(rad);
      this.vy = this.speed * Math.sin(rad);
    }

    update() {
      // Destruir bala después de 2.5 segundos
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
      for (let i = 0; i < walls.length; i++) {
        const wall = walls[i];

        if (this.x + this.radius > wall.x && this.x - this.radius < wall.x + wall.width &&
            this.y + this.radius > wall.y && this.y - this.radius < wall.y + wall.height) {

          const prevX = this.x - this.vx;
          const prevY = this.y - this.vy;

          if (prevX + this.radius <= wall.x || prevX - this.radius >= wall.x + wall.width) {
            this.vx = -this.vx;
            if (prevX + this.radius <= wall.x) this.x = wall.x - this.radius;
            else this.x = wall.x + wall.width + this.radius;
          } 
          else if (prevY + this.radius <= wall.y || prevY - this.radius >= wall.y + wall.height) {
            this.vy = -this.vy;
            if (prevY + this.radius <= wall.y) this.y = wall.y - this.radius;
            else this.y = wall.y + wall.height + this.radius;
          } 
          else {
            this.vx = -this.vx;
            this.vy = -this.vy;
          }
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
      ctx.fillStyle = "black";
      ctx.fill();
      ctx.closePath();
    }
  }

  class Tank {
    constructor(x, y, sprite, controls, counterElement) {
      this.x = x;
      this.y = y;
      this.sprite = sprite;
      this.controls = controls;
      this.angle = 0;
      this.speed = 3;
      this.bullets = [];
      this.size = 180;
      this.turnSpeed = 2.5;
      this.lastShotTime = 0; // Para limitar disparos cada 1.5s
      this.counterElement = counterElement;
    }

    getCollisionRectVertices() {
      const w = this.size * 0.3;
      const h = this.size * 0.35;
      const rad = this.angle * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      return [
        { x: this.x + (-w/2.3) * cos - (-h/1.5) * sin, y: this.y + (-w/2.3) * sin + (-h/1.3) * cos },
        { x: this.x + (w/2) * cos - (-h/1.5) * sin,  y: this.y + (w/2) * sin + (-h/1.3) * cos },
        { x: this.x + (w/2) * cos - (h/2) * sin,     y: this.y + (w/2) * sin + (h/2.5) * cos },
        { x: this.x + (-w/2.3) * cos - (h/2) * sin,  y: this.y + (-w/2) * sin + (h/2.5) * cos }
      ];
    }

    collidesWith(wall, x = this.x, y = this.y) {
      const verts = this.getCollisionRectVertices();
      const minX = Math.min(...verts.map(v => v.x));
      const maxX = Math.max(...verts.map(v => v.x));
      const minY = Math.min(...verts.map(v => v.y));
      const maxY = Math.max(...verts.map(v => v.y));
      return !(maxX < wall.x || minX > wall.x + wall.width || maxY < wall.y || minY > wall.y + wall.height);
    }

    collidesAny(x = this.x, y = this.y) {
      return walls.some(w => this.collidesWith(w, x, y));
    }

    shoot() {
      const now = Date.now();
      if (now - this.lastShotTime >= 1500) { // 1.5 segundos
        this.bullets.push(new Bullet(this.x, this.y, this.angle));
        this.lastShotTime = now;
      }
    }

    update() {
  if (keys[this.controls.left])  this.angle -= this.turnSpeed;
  if (keys[this.controls.right]) this.angle += this.turnSpeed;

  const rad = (this.angle - 90) * Math.PI / 180;
  let nx = this.x;
  let ny = this.y;
  const moveSpeed = this.speed;

  // Calcular nueva posición
  if (keys[this.controls.up]) {
    nx += moveSpeed * Math.cos(rad);
    ny += moveSpeed * Math.sin(rad);
  }
  if (keys[this.controls.down]) {
    nx -= moveSpeed * Math.cos(rad);
    ny -= moveSpeed * Math.sin(rad);
  }

  // Mover solo si no colisiona
  if (!this.collidesAny(nx, this.y)) this.x = nx;
  if (!this.collidesAny(this.x, ny)) this.y = ny;

  // Mantener dentro del canvas
  const verts = this.getCollisionRectVertices();
  const minX = Math.min(...verts.map(v => v.x));
  const maxX = Math.max(...verts.map(v => v.x));
  const minY = Math.min(...verts.map(v => v.y));
  const maxY = Math.max(...verts.map(v => v.y));
  const padding = 5;
  if (minX < 0 + padding) this.x += (0 + padding - minX);
  if (maxX > canvas.width - padding) this.x -= (maxX - (canvas.width - padding));
  if (minY < 0 + padding) this.y += (0 + padding - minY);
  if (maxY > canvas.height - padding) this.y -= (maxY - (canvas.height - padding));

  // Disparo
  if (keys[this.controls.shoot]) {
    this.shoot();
    keys[this.controls.shoot] = false;
  }

  // Contador de disparo
  const remaining = Math.max(0, 1500 - (Date.now() - this.lastShotTime));
  this.counterElement.textContent = remaining > 0 ? `Player: ${(remaining/1000).toFixed(1)}s` : "Ready to fire";

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
//---------------------------------------------------------
  walls.push(new Wall(590, 310, 100, 100));
  walls.push(new Wall(200, 150, 300, 20));
  walls.push(new Wall(780, 550, 300, 20));
  
  walls.push(new Wall(400, 300, 20, 200));
  walls.push(new Wall(850, 200, 20, 200));
  walls.push(new Wall(150, 500, 80, 20));

  walls.push(new Wall(1050, 200, 80, 20));
  walls.push(new Wall(650, 100, 20, 80));
  walls.push(new Wall(650, 600, 20, 80));

  const p1Controls = { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright", shoot: " " };
  const p2Controls = { up: "w", down: "s", left: "a", right: "d", shoot: "f" };

  const p1 = new Tank(300, 300, tankImgBlue, p1Controls, p1Counter);
  const p2 = new Tank(1000, 500, tankImgRed, p2Controls, p2Counter);

  function ensureValidSpawn(tank) {
    if (!tank.collidesAny()) return;
    const step = 10;
    let attempts = 0;
    while (tank.collidesAny() && attempts < 50) { tank.y -= step; attempts++; }
    attempts = 0;
    while (tank.collidesAny() && attempts < 50) { tank.x -= step; attempts++; }
    attempts = 0;
    while (tank.collidesAny() && attempts < 50) { tank.x += step; attempts++; }
  }

  ensureValidSpawn(p1);
  ensureValidSpawn(p2);

  let keys = {};
  window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
  window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    walls.forEach(w => w.draw());
    p1.update(); p2.update();
    p1.draw(); p2.draw();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
}
