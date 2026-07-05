import cv2
import numpy as np
import time
from game.moves import MOVES

# Colors (BGR)
WHITE  = (255, 255, 255)
BLACK  = (0, 0, 0)
GREEN  = (0, 255, 0)
RED    = (0, 0, 255)
YELLOW = (0, 255, 255)
GRAY   = (50, 50, 50)

# Where each move's target spawns (normalized 0-1)
# (x, y) — x=0 is left edge, x=1 is right edge
MOVE_TARGET_POSITIONS = {
    1: (0.25, 0.35),  # Jab — left, head height
    2: (0.75, 0.35),  # Cross — right, head height
    3: (0.10, 0.35),  # Lead Hook — far left
    4: (0.90, 0.35),  # Rear Hook — far right
    5: (0.30, 0.15),  # Lead Uppercut — center-left, high
    6: (0.70, 0.15),  # Rear Uppercut — center-right, high
}

# Where each target moves TO (the "incoming" position)
MOVE_TARGET_END = {
    1: (0.35, 0.45),
    2: (0.65, 0.45),
    3: (0.25, 0.45),
    4: (0.75, 0.45),
    5: (0.38, 0.30),
    6: (0.62, 0.30),
}

class Target:
    def __init__(self, move_number, total_time, w, h):
        self.move_number = move_number
        self.total_time  = total_time
        self.w = w
        self.h = h
        self.start_time  = time.time()
        self.hit         = False
        self.hit_time    = None
        self.color       = MOVES[move_number]["color"]

        sx, sy = MOVE_TARGET_POSITIONS[move_number]
        ex, ey = MOVE_TARGET_END[move_number]
        self.start_pos = (int(sx * w), int(sy * h))
        self.end_pos   = (int(ex * w), int(ey * h))

        # burst animation particles
        self.particles = []

    def progress(self):
        elapsed = time.time() - self.start_time
        return min(elapsed / self.total_time, 1.0)

    def current_pos(self):
        p = self.progress()
        x = int(self.start_pos[0] + (self.end_pos[0] - self.start_pos[0]) * p)
        y = int(self.start_pos[1] + (self.end_pos[1] - self.start_pos[1]) * p)
        return x, y

    def current_radius(self):
        # grows from 20px to 70px as it approaches
        return int(20 + 50 * self.progress())

    def trigger_hit(self):
        self.hit = True
        self.hit_time = time.time()
        cx, cy = self.current_pos()
        # spawn burst particles
        for i in range(12):
            angle = (i / 12) * 2 * np.pi
            speed = np.random.uniform(4, 10)
            self.particles.append({
                "x": float(cx), "y": float(cy),
                "dx": np.cos(angle) * speed,
                "dy": np.sin(angle) * speed,
                "life": 1.0,
                "color": self.color
            })

    def is_expired(self):
        if self.hit:
            return time.time() - self.hit_time > 0.5
        return self.progress() >= 1.0

    def draw(self, frame):
        if self.hit:
            self._draw_burst(frame)
            return

        cx, cy = self.current_pos()
        r = self.current_radius()
        p = self.progress()

        # danger color shift — goes from move color to red as time runs out
        danger = p  # 0 = safe, 1 = danger
        color = (
            min(255, int(self.color[0] + (0   - self.color[0]) * danger)),
            min(255, int(self.color[1] + (0   - self.color[1]) * danger)),
            min(255, int(self.color[2] + (255 - self.color[2]) * danger)),
        )

        # outer glow ring
        overlay = frame.copy()
        cv2.circle(overlay, (cx, cy), r + 8, color, 3)
        cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)

        # main filled circle with transparency
        overlay2 = frame.copy()
        cv2.circle(overlay2, (cx, cy), r, color, -1)
        cv2.addWeighted(overlay2, 0.35, frame, 0.65, 0, frame)

        # solid border
        cv2.circle(frame, (cx, cy), r, color, 3)

        # move number inside
        num = str(self.move_number)
        font_scale = 1.4 if self.move_number < 10 else 1.0
        tx = cx - (10 if self.move_number < 10 else 16)
        ty = cy + 10
        cv2.putText(frame, num, (tx, ty),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, WHITE, 3)

        # timer arc around the circle
        axes = (r + 14, r + 14)
        angle_sweep = int(360 * (1 - p))
        cv2.ellipse(frame, (cx, cy), axes, -90, 0, angle_sweep, GREEN, 2)

    def _draw_burst(self, frame):
        for p in self.particles:
            p["x"]    += p["dx"]
            p["y"]    += p["dy"]
            p["life"] -= 0.08
            p["dy"]   += 0.3  # gravity
            if p["life"] <= 0:
                continue
            alpha = p["life"]
            px, py = int(p["x"]), int(p["y"])
            radius = max(1, int(6 * p["life"]))
            overlay = frame.copy()
            cv2.circle(overlay, (px, py), radius, p["color"], -1)
            cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

        # HIT flash text
        elapsed = time.time() - self.hit_time
        if elapsed < 0.3:
            cx, cy = self.current_pos()
            alpha = 1.0 - (elapsed / 0.3)
            overlay = frame.copy()
            cv2.putText(overlay, "HIT!", (cx - 40, cy - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, GREEN, 4)
            cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)


def draw_move_prompt(frame, move_number, time_left, total_time):
    h, w, _ = frame.shape
    move = MOVES[move_number]

    cv2.rectangle(frame, (0, 0), (w, 100), (20, 20, 20), -1)

    # move number
    cv2.putText(frame, str(move_number), (25, 75),
                cv2.FONT_HERSHEY_SIMPLEX, 2.5, move["color"], 5)

    # move name
    cv2.putText(frame, move["name"], (110, 45),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, WHITE, 2)

    # hand label
    hand_label = "LEFT HAND" if move["hand"] == "left" else "RIGHT HAND"
    hand_color = (100, 255, 100) if move["hand"] == "left" else (100, 100, 255)
    cv2.putText(frame, hand_label, (110, 80),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, hand_color, 2)

    # timer bar
    bar_w = int((time_left / total_time) * (w - 40))
    bar_color = GREEN if time_left > total_time * 0.5 else YELLOW if time_left > total_time * 0.25 else RED
    cv2.rectangle(frame, (20, 90), (20 + bar_w, 98), bar_color, -1)


def draw_score(frame, score, combo):
    h, w, _ = frame.shape
    cv2.putText(frame, f"Score: {score}", (w - 230, 45),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, WHITE, 2)
    if combo > 1:
        combo_color = YELLOW if combo < 5 else (0, 165, 255) if combo < 10 else RED
        cv2.putText(frame, f"x{combo} COMBO!", (w - 230, 82),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, combo_color, 2)


def draw_round_timer(frame, time_remaining):
    h, w, _ = frame.shape
    seconds = int(time_remaining)
    color = WHITE if seconds > 10 else RED
    cv2.putText(frame, f"{seconds}s", (w // 2 - 25, 45),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)


def draw_countdown(frame, number):
    h, w, _ = frame.shape
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, h), BLACK, -1)
    cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)
    cv2.putText(frame, str(number), (w // 2 - 40, h // 2 + 40),
                cv2.FONT_HERSHEY_SIMPLEX, 6.0, YELLOW, 10)
    cv2.putText(frame, "GET READY", (w // 2 - 130, h // 2 - 80),
                cv2.FONT_HERSHEY_SIMPLEX, 1.5, WHITE, 3)


def draw_game_over(frame, score, high_score):
    h, w, _ = frame.shape
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, h), BLACK, -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    cv2.putText(frame, "ROUND OVER", (w // 2 - 190, h // 2 - 100),
                cv2.FONT_HERSHEY_SIMPLEX, 2.0, WHITE, 4)
    cv2.putText(frame, f"Score:  {score}", (w // 2 - 130, h // 2 - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 1.3, GREEN, 3)
    cv2.putText(frame, f"Best:   {high_score}", (w // 2 - 130, h // 2 + 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, YELLOW, 2)
    cv2.putText(frame, "R — Restart     Q — Quit", (w // 2 - 200, h // 2 + 110),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, WHITE, 2)