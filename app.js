/**
 * Just Box 🥊 — Universal Web & Mobile Motion Boxing Game
 * Built with HTML5 Canvas, Web Audio API, and MediaPipe Pose
 */

// --- Audio Synthesizer (Web Audio API) ---
class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPunchHit() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Low punch thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);

    // Impact crack noise
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
  }

  playCountdown(isStart = false) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isStart ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isStart ? 880 : 440, now);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (isStart ? 0.35 : 0.15));
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + (isStart ? 0.35 : 0.15));
  }

  playBell() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [1200, 2400];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    });
  }

  playMiss() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }
}

// --- Moves Definition ---
const MOVES = {
  1: { id: 1, name: "Jab", hint: "Lead Hand (Left) • Straight Strike", hand: "left", color: "#00f0ff", start: [0.25, 0.35], end: [0.35, 0.45] },
  2: { id: 2, name: "Cross", hint: "Rear Hand (Right) • Power Straight", hand: "right", color: "#ffd000", start: [0.75, 0.35], end: [0.65, 0.45] },
  3: { id: 3, name: "Lead Hook", hint: "Left Hand • Wide Horizontal Swing", hand: "left", color: "#ff8800", start: [0.12, 0.35], end: [0.28, 0.45] },
  4: { id: 4, name: "Rear Hook", hint: "Right Hand • Wide Power Swing", hand: "right", color: "#ff3366", start: [0.88, 0.35], end: [0.72, 0.45] },
  5: { id: 5, name: "Lead Uppercut", hint: "Left Hand • Upward Chin Strike", hand: "left", color: "#b026ff", start: [0.32, 0.18], end: [0.40, 0.32] },
  6: { id: 6, name: "Rear Uppercut", hint: "Right Hand • Upward Power Punch", hand: "right", color: "#e040fb", start: [0.68, 0.18], end: [0.60, 0.32] },
};

// --- Leaderboard Manager ---
const LEADERBOARD_KEY = 'just_box_leaderboard';
const DEFAULT_SCORES = [
  { name: "Iron Mike", score: 4200, combo: 18, date: "2026-10-25" },
  { name: "Muhammad A.", score: 3800, combo: 16, date: "2026-10-26" },
  { name: "Canelo S.", score: 2900, combo: 12, date: "2026-10-28" },
  { name: "Sugar Ray", score: 2100, combo: 9, date: "2026-10-29" },
  { name: "Apollo C.", score: 1400, combo: 6, date: "2026-10-30" },
];

class Leaderboard {
  static getScores() {
    try {
      const data = localStorage.getItem(LEADERBOARD_KEY);
      if (!data) {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(DEFAULT_SCORES));
        return DEFAULT_SCORES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_SCORES;
    }
  }

  static addScore(name, score, combo) {
    const list = this.getScores();
    const entry = {
      name: name.trim() || "Challenger",
      score: Number(score),
      combo: Number(combo),
      date: new Date().toISOString().split('T')[0]
    };
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const top10 = list.slice(0, 10);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top10));
    return top10;
  }

  static reset() {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(DEFAULT_SCORES));
  }
}

// --- Target & Particle FX ---
class HitParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = Math.random() * 5 + 3;
    this.life = 1.0;
    this.decay = Math.random() * 0.04 + 0.03;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1.0;
    this.vy = -2.5;
  }

  update() {
    this.y += this.vy;
    this.life -= 0.03;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.font = 'bold 26px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// --- Pose Detector Logic (Biomechanical Heuristics) ---
class PoseAnalyzer {
  constructor() {
    this.lWristHistory = [];
    this.rWristHistory = [];
    this.historySize = 6;
  }

  calculateAngle(a, b, c) {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.hypot(ab.x, ab.y);
    const magCB = Math.hypot(cb.x, cb.y);
    const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB + 1e-6)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  }

  getVelocity(history) {
    if (history.length < 2) return { dx: 0, dy: 0, dz: 0, speed: 0 };
    const last = history[history.length - 1];
    const prev = history[Math.max(0, history.length - 3)];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const dz = (last.z !== undefined && prev.z !== undefined) ? (last.z - prev.z) : 0;
    return { dx, dy, dz, speed: Math.hypot(dx, dy) };
  }

  checkMove(targetMove, landmarks, canvasWidth, canvasHeight) {
    if (!landmarks || landmarks.length < 25) return false;

    const ls = landmarks[11]; // Left Shoulder
    const rs = landmarks[12]; // Right Shoulder
    const le = landmarks[13]; // Left Elbow
    const re = landmarks[14]; // Right Elbow
    const lw = landmarks[15]; // Left Wrist
    const rw = landmarks[16]; // Right Wrist

    // Normalized mirror coordinates
    const lwx = 1.0 - lw.x, lwy = lw.y, lwz = lw.z || 0;
    const rwx = 1.0 - rw.x, rwy = rw.y, rwz = rw.z || 0;
    const lsx = 1.0 - ls.x, lsy = ls.y, lsz = ls.z || 0;
    const rsx = 1.0 - rs.x, rsy = rs.y, rsz = rs.z || 0;
    const lex = 1.0 - le.x, ley = le.y;
    const rex = 1.0 - re.x, rey = re.y;

    this.lWristHistory.push({ x: lwx, y: lwy, z: lwz });
    this.rWristHistory.push({ x: rwx, y: rwy, z: rwz });
    if (this.lWristHistory.length > this.historySize) this.lWristHistory.shift();
    if (this.rWristHistory.length > this.historySize) this.rWristHistory.shift();

    const shoulderWidth = Math.max(0.12, Math.abs(rsx - lsx));
    const bodyHeight = Math.max(0.25, Math.abs(((lsy + rsy) / 2) - ((landmarks[23].y + landmarks[24].y) / 2)));
    const shoulderY = (lsy + rsy) / 2;

    const lVel = this.getVelocity(this.lWristHistory);
    const rVel = this.getVelocity(this.rWristHistory);

    const lElbowAngle = this.calculateAngle({ x: lsx, y: lsy }, { x: lex, y: ley }, { x: lwx, y: lwy });
    const rElbowAngle = this.calculateAngle({ x: rsx, y: rsy }, { x: rex, y: rey }, { x: rwx, y: rwy });

    // 3D forward extension (smaller z means closer to camera)
    const lForwardDepth = lsz - lwz;
    const rForwardDepth = rsz - rwz;

    // 2D distance from shoulder to wrist
    const lReach = Math.hypot(lwx - lsx, lwy - lsy) / shoulderWidth;
    const rReach = Math.hypot(rwx - rsx, rwy - rsy) / shoulderWidth;

    const lMovingUp = lVel.dy < -0.002;
    const rMovingUp = rVel.dy < -0.002;
    const PUNCH_MIN_SPEED = 0.0040;
    const hasLSpeed = lVel.speed > PUNCH_MIN_SPEED;
    const hasRSpeed = rVel.speed > PUNCH_MIN_SPEED;
    const lForwardBurst = lVel.dz < -0.012; // Rapid thrust toward camera
    const rForwardBurst = rVel.dz < -0.012;

    switch (targetMove) {
      case 1: // 1: JAB (Left Straight Punch)
        // Hand MUST be in active motion — cannot be resting still in guard!
        if (!hasLSpeed && !lForwardBurst) return false;
        const lZPunch = lForwardDepth > 0.12;
        const lStraightReach = lReach > 0.55 && lElbowAngle > 95;
        return lZPunch || lStraightReach || lForwardBurst;

      case 2: // 2: CROSS (Right Straight Punch)
        if (!hasRSpeed && !rForwardBurst) return false;
        const rZPunch = rForwardDepth > 0.12;
        const rStraightReach = rReach > 0.55 && rElbowAngle > 95;
        return rZPunch || rStraightReach || rForwardBurst;

      case 3: // 3: LEAD HOOK (Left Hook)
        // Must be in active motion with bent elbow swinging across
        if (!hasLSpeed) return false;
        const lBentElbow = lElbowAngle < 140 && lElbowAngle > 60;
        const lHorizontalArc = Math.abs(lVel.dx) > 0.003 || Math.abs(lwx - lsx) > 0.30 * shoulderWidth;
        const lNearHead = Math.abs(lwy - shoulderY) < 0.45 * bodyHeight;
        return lBentElbow && lHorizontalArc && lNearHead;

      case 4: // 4: REAR HOOK (Right Hook)
        if (!hasRSpeed) return false;
        const rBentElbow = rElbowAngle < 140 && rElbowAngle > 60;
        const rHorizontalArc = Math.abs(rVel.dx) > 0.003 || Math.abs(rwx - rsx) > 0.30 * shoulderWidth;
        const rNearHead = Math.abs(rwy - shoulderY) < 0.45 * bodyHeight;
        return rBentElbow && rHorizontalArc && rNearHead;

      case 5: // 5: LEAD UPPERCUT (Left Uppercut)
        // Must be in active upward motion with bent elbow
        if (lVel.dy >= -0.003 || !hasLSpeed) return false;
        return lElbowAngle < 135;

      case 6: // 6: REAR UPPERCUT (Right Uppercut)
        // Must be in active upward motion with bent elbow
        if (rVel.dy >= -0.003 || !hasRSpeed) return false;
        return rElbowAngle < 135;

      default:
        return false;
    }
  }

  detectMove(landmarks, canvasWidth, canvasHeight) {
    for (let m = 1; m <= 6; m++) {
      if (this.checkMove(m, landmarks, canvasWidth, canvasHeight)) {
        return m;
      }
    }
    return null;
  }
}

// --- Main Game Engine ---
class JustBoxGame {
  constructor() {
    this.sound = new SoundController();
    this.analyzer = new PoseAnalyzer();

    // DOM Elements
    this.video = document.getElementById('webcam');
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // UI Badges & Overlays
    this.hud = document.getElementById('game-hud');
    this.moveBanner = document.getElementById('move-banner');
    this.moveNumBadge = document.getElementById('move-number-badge');
    this.moveTitleDisplay = document.getElementById('move-name-display');
    this.moveHintDisplay = document.getElementById('move-hint-display');
    this.targetTimerFill = document.getElementById('target-timer-fill');
    this.roundTimerDisplay = document.getElementById('round-timer-display');
    this.scoreDisplay = document.getElementById('score-display');
    this.comboDisplay = document.getElementById('combo-display');
    this.comboBadge = document.getElementById('combo-badge');
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownText = document.getElementById('countdown-text');

    // Modals
    this.welcomeModal = document.getElementById('welcome-modal');
    this.leaderboardModal = document.getElementById('leaderboard-modal');
    this.gameoverModal = document.getElementById('gameover-modal');
    this.cameraStatusText = document.getElementById('camera-status-text');

    // Game Config & State
    this.roundDuration = 60;
    this.timePerMove = 2.2;
    this.gameState = 'menu'; // 'menu', 'countdown', 'playing', 'paused', 'gameover'
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hitsCount = 0;
    this.totalPunchesPrompted = 0;
    this.roundTimeRemaining = 60;
    this.roundStartTime = 0;

    // Target state
    this.currentMove = 1;
    this.targetStartTime = 0;
    this.targetHit = false;
    this.targetHitTime = 0;
    this.lastDetectedMove = null;
    this.lastDetectTime = 0;
    this.debounceInterval = 450; // ms

    // Animation & FX lists
    this.particles = [];
    this.floatingTexts = [];
    this.poseLandmarks = null;

    // MediaPipe
    this.pose = null;
    this.cameraStream = null;

    this.bindEvents();
    this.setupResize();
    this.renderLeaderboardTable();
  }

  setupResize() {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  bindEvents() {
    // Sound Toggle
    document.getElementById('btn-toggle-sound').addEventListener('click', () => {
      this.sound.muted = !this.sound.muted;
      document.getElementById('sound-icon').textContent = this.sound.muted ? '🔇' : '🔊';
    });

    // Duration selection
    document.querySelectorAll('#round-duration-select .toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#round-duration-select .toggle-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.roundDuration = parseInt(e.target.dataset.duration, 10);
      });
    });

    // Difficulty selection
    document.querySelectorAll('#difficulty-select .toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#difficulty-select .toggle-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.timePerMove = parseFloat(e.target.dataset.time);
      });
    });

    // Start Button
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.sound.init();
      this.initCameraAndStart();
    });

    // Scoreboard Dialog Triggers
    const openBoard = () => {
      this.renderLeaderboardTable();
      this.leaderboardModal.showModal();
    };
    document.getElementById('btn-open-leaderboard').addEventListener('click', openBoard);
    document.getElementById('btn-show-scores-menu').addEventListener('click', openBoard);
    document.getElementById('btn-view-board-gameover').addEventListener('click', openBoard);

    document.getElementById('btn-close-leaderboard').addEventListener('click', () => this.leaderboardModal.close());
    document.getElementById('btn-dismiss-leaderboard').addEventListener('click', () => this.leaderboardModal.close());
    
    document.getElementById('btn-reset-scores').addEventListener('click', () => {
      if (confirm('Reset leaderboard to default champion scores?')) {
        Leaderboard.reset();
        this.renderLeaderboardTable();
      }
    });

    // Play Again
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.gameoverModal.close();
      this.startCountdown();
    });

    // Save Score
    document.getElementById('btn-save-score').addEventListener('click', () => {
      const input = document.getElementById('player-name-input');
      const name = input.value.trim() || 'Contender';
      Leaderboard.addScore(name, this.score, this.maxCombo);
      document.getElementById('save-feedback').classList.remove('hidden');
      document.getElementById('btn-save-score').disabled = true;
      this.renderLeaderboardTable();
    });

    // Pause button
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.gameState = 'menu';
      this.hud.classList.add('hidden');
      this.moveBanner.classList.add('hidden');
      this.welcomeModal.classList.remove('hidden');
    });

    // Keyboard shortcut (Q to pause/exit)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'q' || e.key === 'Q') {
        if (this.gameState === 'playing') {
          this.gameState = 'menu';
          this.welcomeModal.classList.remove('hidden');
          this.hud.classList.add('hidden');
          this.moveBanner.classList.add('hidden');
        }
      }
    });
  }

  async initCameraAndStart() {
    this.cameraStatusText.textContent = 'Requesting camera access...';
    try {
      if (!this.cameraStream) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        this.video.srcObject = stream;
        this.cameraStream = stream;
        await new Promise((resolve) => (this.video.onloadedmetadata = resolve));
        await this.video.play();
      }

      this.cameraStatusText.textContent = 'Loading MediaPipe Pose AI...';
      if (!this.pose) {
        this.pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        this.pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.pose.onResults((results) => {
          this.poseLandmarks = results.poseLandmarks;
        });

        // Start processing video frames
        this.startPoseLoop();
      }

      this.welcomeModal.classList.add('hidden');
      this.startCountdown();
    } catch (err) {
      console.error(err);
      this.cameraStatusText.textContent = 'Camera error: ' + (err.message || 'Permission denied');
      alert('Camera permission is required to play motion boxing. Please enable your camera in browser settings.');
    }
  }

  startPoseLoop() {
    const process = async () => {
      if (this.video.readyState >= 2 && this.pose) {
        try {
          await this.pose.send({ image: this.video });
        } catch (e) {
          // Catch occasional frame drops
        }
      }
      requestAnimationFrame(process);
    };
    requestAnimationFrame(process);
  }

  startCountdown() {
    this.gameState = 'countdown';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hitsCount = 0;
    this.totalPunchesPrompted = 0;
    this.updateHUD();

    this.countdownOverlay.classList.remove('hidden');
    let count = 3;
    this.countdownText.textContent = count;
    this.sound.playCountdown(false);

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownText.textContent = count;
        this.sound.playCountdown(false);
      } else if (count === 0) {
        this.countdownText.textContent = 'FIGHT!';
        this.sound.playCountdown(true);
      } else {
        clearInterval(timer);
        this.countdownOverlay.classList.add('hidden');
        this.startRound();
      }
    }, 1000);
  }

  startRound() {
    this.gameState = 'playing';
    this.roundStartTime = performance.now();
    this.roundTimeRemaining = this.roundDuration;
    this.hud.classList.remove('hidden');
    this.moveBanner.classList.remove('hidden');
    this.sound.playBell();

    this.pickNextMove();
    this.gameLoop();
  }

  pickNextMove() {
    const moveIds = Object.keys(MOVES).map(Number);
    // Don't repeat the exact same punch twice in a row
    const nextOptions = moveIds.filter(id => id !== this.currentMove);
    this.currentMove = nextOptions[Math.floor(Math.random() * nextOptions.length)];
    this.totalPunchesPrompted++;

    const move = MOVES[this.currentMove];
    this.moveNumBadge.textContent = move.id;
    this.moveTitleDisplay.textContent = move.name;
    this.moveTitleDisplay.style.color = move.color;
    this.moveHintDisplay.textContent = move.hint;
    this.moveBanner.style.borderColor = move.color;

    this.targetStartTime = performance.now();
    this.targetHit = false;
    this.lastDetectedMove = null;
  }

  triggerHit(targetX, targetY) {
    this.targetHit = true;
    this.targetHitTime = performance.now();
    this.hitsCount++;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const points = 100 * this.combo;
    this.score += points;

    this.sound.playPunchHit();

    // Spawn visual feedback
    const move = MOVES[this.currentMove];
    for (let i = 0; i < 24; i++) {
      this.particles.push(new HitParticle(targetX, targetY, move.color));
    }
    this.floatingTexts.push(new FloatingText(targetX, targetY - 20, `+${points} (${this.combo}x)`, '#ffd000'));

    // Combo pulse animation
    this.comboBadge.classList.add('pulse');
    setTimeout(() => this.comboBadge.classList.remove('pulse'), 200);

    this.updateHUD();
  }

  triggerMiss() {
    this.combo = 0;
    this.sound.playMiss();
    this.updateHUD();
    this.pickNextMove();
  }

  updateHUD() {
    this.scoreDisplay.textContent = this.score;
    this.comboDisplay.textContent = `${this.combo}x`;
    const mins = Math.floor(this.roundTimeRemaining / 60);
    const secs = Math.floor(this.roundTimeRemaining % 60);
    this.roundTimerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  gameLoop() {
    if (this.gameState !== 'playing') return;

    const now = performance.now();
    const elapsedRound = (now - this.roundStartTime) / 1000;
    this.roundTimeRemaining = Math.max(0, this.roundDuration - elapsedRound);
    this.updateHUD();

    // Check round complete
    if (this.roundTimeRemaining <= 0) {
      this.finishRound();
      return;
    }

    // Check target timeout
    const moveElapsed = (now - this.targetStartTime) / 1000;
    const progress = Math.min(1.0, moveElapsed / this.timePerMove);
    this.targetTimerFill.style.width = `${Math.max(0, (1 - progress) * 100)}%`;

    if (progress >= 1.0 && !this.targetHit) {
      this.triggerMiss();
    } else if (this.targetHit && (now - this.targetHitTime > 350)) {
      this.pickNextMove();
    }

    // Clear Canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render Targets & Visuals
    const targetPos = this.calculateTargetPosition(progress);
    if (!this.targetHit) {
      this.drawTarget(targetPos.x, targetPos.y, progress);
    }

    // Pose Detection & Skeleton Overlay
    if (this.poseLandmarks) {
      this.drawSkeleton(this.poseLandmarks);

      if (!this.targetHit) {
        const move = MOVES[this.currentMove];
        const lw = this.poseLandmarks[15];
        const rw = this.poseLandmarks[16];

        // Strike hand coordinates (mirrored to match screen)
        let strikeX = null;
        let strikeY = null;
        if (move.hand === 'left' && lw && (!lw.visibility || lw.visibility > 0.3)) {
          strikeX = (1.0 - lw.x) * this.canvas.width;
          strikeY = lw.y * this.canvas.height;
        } else if (move.hand === 'right' && rw && (!rw.visibility || rw.visibility > 0.3)) {
          strikeX = (1.0 - rw.x) * this.canvas.width;
          strikeY = rw.y * this.canvas.height;
        }

        let isHit = false;

        const strikingVel = move.hand === 'left'
          ? this.analyzer.getVelocity(this.analyzer.lWristHistory)
          : this.analyzer.getVelocity(this.analyzer.rWristHistory);
        const hasPunchMotion = strikingVel.speed > 0.0038 || strikingVel.dz < -0.012;

        // Condition 1: Direct Target Strike (fist must be moving with punch speed into target zone)
        if (strikeX !== null && strikeY !== null && hasPunchMotion) {
          const dist = Math.hypot(strikeX - targetPos.x, strikeY - targetPos.y);
          const hitRadius = Math.max(85, Math.min(this.canvas.width, this.canvas.height) * 0.125);
          if (dist <= hitRadius) {
            isHit = true;
          }
        }

        // Condition 2: Dedicated Physical Punch Check for the Prompted Move
        if (!isHit) {
          if (this.analyzer.checkMove(this.currentMove, this.poseLandmarks, this.canvas.width, this.canvas.height)) {
            isHit = true;
          }
        }

        if (isHit) {
          const timeSinceLast = now - this.lastDetectTime;
          if (timeSinceLast > this.debounceInterval) {
            this.lastDetectTime = now;
            this.triggerHit(targetPos.x, targetPos.y);
          }
        }
      }
    }

    // Render Particles & Text
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => { p.update(); p.draw(this.ctx); });

    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
    this.floatingTexts.forEach(t => { t.update(); t.draw(this.ctx); });

    requestAnimationFrame(() => this.gameLoop());
  }

  calculateTargetPosition(progress) {
    const move = MOVES[this.currentMove];
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Default fallback coordinates
    let centerX = w * 0.5;
    let shoulderW = w * 0.26;
    let headY = h * 0.32;
    let bodyH = h * 0.45;

    // Dynamically anchor targets directly to player's detected skeleton!
    if (this.poseLandmarks && this.poseLandmarks.length >= 25) {
      const ls = this.poseLandmarks[11];
      const rs = this.poseLandmarks[12];
      if (ls && rs) {
        const lsx = (1.0 - ls.x) * w;
        const rsx = (1.0 - rs.x) * w;
        centerX = (lsx + rsx) / 2;
        shoulderW = Math.max(w * 0.16, Math.abs(rsx - lsx));
        const avgShoulderY = ((ls.y + rs.y) / 2) * h;
        headY = avgShoulderY - (shoulderW * 0.35);
        if (this.poseLandmarks[23]) {
          bodyH = Math.max(h * 0.3, Math.abs(this.poseLandmarks[23].y * h - avgShoulderY));
        }
      }
    }

    let sx, sy, ex, ey;

    switch (this.currentMove) {
      case 1: // Jab (Left straight) - In front of Left chin / shoulder
        ex = centerX - shoulderW * 0.35;
        ey = headY;
        sx = ex - shoulderW * 0.35;
        sy = headY;
        break;

      case 2: // Cross (Right straight) - In front of Right chin / shoulder
        ex = centerX + shoulderW * 0.35;
        ey = headY;
        sx = ex + shoulderW * 0.35;
        sy = headY;
        break;

      case 3: // Lead Hook (Left hook - coming in horizontally from wide left)
        ex = centerX - shoulderW * 0.25;
        ey = headY + 15;
        sx = centerX - shoulderW * 1.05;
        sy = headY + 15;
        break;

      case 4: // Rear Hook (Right hook - coming in horizontally from wide right)
        ex = centerX + shoulderW * 0.25;
        ey = headY + 15;
        sx = centerX + shoulderW * 1.05;
        sy = headY + 15;
        break;

      case 5: // Lead Uppercut (Left uppercut - rising vertically from chest to chin)
        ex = centerX - shoulderW * 0.22;
        ey = headY + 15;
        sx = ex;
        sy = headY + bodyH * 0.55;
        break;

      case 6: // Rear Uppercut (Right uppercut - rising vertically from chest to chin)
        ex = centerX + shoulderW * 0.22;
        ey = headY + 15;
        sx = ex;
        sy = headY + bodyH * 0.55;
        break;

      default:
        sx = move.start[0] * w;
        sy = move.start[1] * h;
        ex = move.end[0] * w;
        ey = move.end[1] * h;
    }

    return {
      x: sx + (ex - sx) * progress,
      y: sy + (ey - sy) * progress
    };
  }

  drawTarget(x, y, progress) {
    const move = MOVES[this.currentMove];
    const baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.085;
    const radius = baseRadius * (1.1 - 0.15 * progress);

    this.ctx.save();

    // Outer glow
    this.ctx.shadowColor = move.color;
    this.ctx.shadowBlur = 24;

    // Outer shrinking countdown ring
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius + 14, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - progress)));
    this.ctx.strokeStyle = move.color;
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    // Target Bubble Background
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(10, 14, 24, 0.75)';
    this.ctx.fill();
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = move.color;
    this.ctx.stroke();

    // Target Move Number / Icon
    this.ctx.font = `bold ${Math.round(radius * 0.9)}px Orbitron, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(move.id, x, y);

    this.ctx.restore();
  }

  drawSkeleton(landmarks) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const connections = [
      [11, 12], // shoulders
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [11, 23], [12, 24], // torso
      [23, 24]  // hips
    ];

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = 'rgba(0, 240, 255, 0.7)';
    this.ctx.shadowBlur = 6;

    // Draw Bones
    connections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && (!p1.visibility || p1.visibility > 0.35) && (!p2.visibility || p2.visibility > 0.35)) {
        const x1 = (1.0 - p1.x) * w, y1 = p1.y * h;
        const x2 = (1.0 - p2.x) * w, y2 = p2.y * h;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
    });

    // Draw Glowing Boxing Gloves on Wrists
    // 15 = Left Hand (Cyan), 16 = Right Hand (Gold)
    [15, 16].forEach(wristIdx => {
      const p = landmarks[wristIdx];
      if (p && (!p.visibility || p.visibility > 0.35)) {
        const x = (1.0 - p.x) * w, y = p.y * h;
        const isLeft = wristIdx === 15;
        const gloveColor = isLeft ? '#00f0ff' : '#ffd000';

        // Outer Aura
        this.ctx.beginPath();
        this.ctx.arc(x, y, 22, 0, Math.PI * 2);
        this.ctx.fillStyle = isLeft ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 208, 0, 0.3)';
        this.ctx.fill();

        // Inner Glove Core
        this.ctx.beginPath();
        this.ctx.arc(x, y, 14, 0, Math.PI * 2);
        this.ctx.fillStyle = gloveColor;
        this.ctx.shadowColor = gloveColor;
        this.ctx.shadowBlur = 18;
        this.ctx.fill();

        // Glove Label (L or R)
        this.ctx.font = 'bold 11px Orbitron, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(isLeft ? 'L' : 'R', x, y);
      }
    });

    this.ctx.restore();
  }

  finishRound() {
    this.gameState = 'gameover';
    this.sound.playBell();

    this.hud.classList.add('hidden');
    this.moveBanner.classList.add('hidden');

    const accuracy = this.totalPunchesPrompted > 0
      ? Math.round((this.hitsCount / this.totalPunchesPrompted) * 100)
      : 0;

    document.getElementById('result-final-score').textContent = this.score;
    document.getElementById('result-max-combo').textContent = `${this.maxCombo}x`;
    document.getElementById('result-hits-count').textContent = this.hitsCount;
    document.getElementById('result-accuracy').textContent = `${accuracy}%`;

    // Reset input
    document.getElementById('save-feedback').classList.add('hidden');
    const saveBtn = document.getElementById('btn-save-score');
    saveBtn.disabled = false;
    document.getElementById('player-name-input').value = '';

    this.gameoverModal.showModal();
  }

  renderLeaderboardTable() {
    const list = Leaderboard.getScores();
    const tbody = document.getElementById('leaderboard-rows');
    tbody.innerHTML = '';

    list.forEach((item, index) => {
      const rank = index + 1;
      const tr = document.createElement('tr');
      tr.className = `rank-${rank}`;
      tr.innerHTML = `
        <td class="col-rank"><span class="rank-badge">${rank}</span></td>
        <td class="col-fighter fighter-cell">${escapeHtml(item.name)}</td>
        <td class="col-score score-cell">${item.score.toLocaleString()}</td>
        <td class="col-combo">${item.combo}x</td>
        <td class="col-date">${item.date || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.justBoxApp = new JustBoxGame();
});
