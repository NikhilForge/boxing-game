# Just Box 🥊 — The Complete Player & Trainer Guide

Welcome to the official **Just Box** training and gameplay manual. This comprehensive guide covers setup, proper boxing mechanics, motion-tracking tips, scoring strategies, and troubleshooting to help you get the best workout and highest scores.

---

## 📋 Table of Contents
1. [Camera & Room Setup](#1-camera--room-setup)
2. [Boxing Stance & Guard Fundamentals](#2-boxing-stance--guard-fundamentals)
3. [The 6 Punches: Form & Execution](#3-the-6-punches-form--execution)
4. [How the AI Motion Tracking Works](#4-how-the-ai-motion-tracking-works)
5. [Scoring, Combos & Game Modes](#5-scoring-combos--game-modes)
6. [Troubleshooting & Pro Tips](#6-troubleshooting--pro-tips)
7. [Running & Hosting](#7-running--hosting)

---

## 1. Camera & Room Setup

To ensure 100% punch registration accuracy, set up your space with these recommendations:

| Factor | Ideal Setting | Why It Matters |
| :--- | :--- | :--- |
| **Distance** | **5 to 8 feet (1.5 – 2.5 meters)** | The camera needs to see your head, shoulders, elbows, and wrists clearly. |
| **Camera Height** | **Chest to eye level** | Placing the camera too low (on the floor) or too high distorts 2D elbow angles. |
| **Lighting** | **Front-lit, well-lit room** | Avoid standing with a bright window behind you (backlighting). Front lighting ensures clear joint detection. |
| **Clothing** | **Contrasting, fitted workout clothes** | Loose, baggy hoodies can obscure your elbow joints from the vision model. |

---

## 2. Boxing Stance & Guard Fundamentals

Just Box uses standard **Orthodox boxing stance** (the most common boxing stance worldwide):

```
       [ CAMERA / OPPONENT ]
                 ▲
                 │
       (L) Left Fist (Forward / Jab)
             \
              \
               (R) Right Fist (Chin / Power)
                 │
           [ Left Foot Forward ]
                 │
           [ Right Foot Back at 45° ]
```

### The Basic Guard Position:
1. **Feet**: Stand with your **left foot forward** and **right foot back** at a 45-degree angle, about shoulder-width apart.
2. **Knees**: Keep knees slightly bent with weight evenly distributed on the balls of your feet.
3. **Hands (The Guard)**:
   - **Left Hand**: Held out slightly in front at cheek level (ready to jab).
   - **Right Hand**: Tucked tight against your right jawline/cheek to protect your chin.
   - **Elbows**: Tucked in against your ribs.
4. **Chin**: Tucked down toward your chest.

> [!TIP]
> **Always return to your guard between punches!** The AI punch validator measures the acceleration of your fist springing out from your guard. Returning to guard resets your kinetic velocity for the next strike.

---

## 3. The 6 Punches: Form & Execution

### 1 — The Jab (Lead / Left Straight)
- **Target**: Left shoulder / chin zone on screen.
- **Form**:
  - Push off your back foot and snap your **left fist straight forward** into the camera lens.
  - Rotate your wrist so your palm faces downward upon extension.
  - Keep your right hand glued to your cheek to protect your chin.
  - Snap your left hand back immediately to your face.
- **AI Signature**: Forward 3D Z-depth thrust (`shoulder.z - wrist.z > 0.12`) with arm extension (`elbow > 95°`).

---

### 2 — The Cross (Rear / Right Straight)
- **Target**: Right shoulder / chin zone on screen.
- **Form**:
  - The power punch. Pivot on the ball of your **back (right) foot**, rotating your hips and shoulders forward.
  - Drive your **right fist straight forward** along the center line toward the camera.
  - Keep your left glove up guarding your left cheek.
  - Snap the right hand back to your jaw.
- **AI Signature**: Forward 3D Z-depth thrust with hip/shoulder rotation and straight arm extension.

---

### 3 — The Lead Hook (Left Hook)
- **Target**: Sweeps in horizontally from your left across to your chin.
- **Form**:
  - Shift your weight slightly to your front foot, then pivot your left foot and hips inward to the right.
  - Keep your **left elbow locked at a 90° angle** (do not straighten your arm).
  - Swing your left fist in a horizontal arc across the front of your face as if hitting an opponent's jaw.
- **AI Signature**: Horizontal inward velocity (`dx > 0.003`) with a bent elbow (`60° < elbow < 140°`) at head height.

---

### 4 — The Rear Hook (Right Hook)
- **Target**: Sweeps in horizontally from your right across to your chin.
- **Form**:
  - Pivot forcefully on your back (right) foot, driving your right hip forward.
  - Keep your **right elbow bent at ~90°** and whip your right fist horizontally across into the center.
  - Keep your left glove up to guard against counter-punches.
- **AI Signature**: Horizontal inward arc velocity with a bent elbow (`60° < elbow < 140°`) at head height.

---

### 5 — The Lead Uppercut (Left Uppercut)
- **Target**: Rises vertically from your chest up into your chin.
- **Form**:
  - Drop your left shoulder slightly and dip your knees.
  - Drive upwards through your legs and rotate your torso, scooping your **left fist straight upward** under the imaginary opponent's chin.
  - Palm faces toward your own face; elbow stays bent throughout the motion.
- **AI Signature**: Upward vertical wrist velocity (`dy < -0.003`) rising beneath shoulder/chin level with bent elbow.

---

### 6 — The Rear Uppercut (Right Uppercut)
- **Target**: Rises vertically from your chest up into your chin.
- **Form**:
  - Dip your right shoulder and bend your knees.
  - Drive up off your back foot, rotating your hips and driving your **right fist vertically upward** toward the chin level.
  - Keep your elbow bent at an acute angle; don't swing wildly outward.
- **AI Signature**: Upward vertical wrist velocity (`dy < -0.003`) with power drive and bent elbow.

---

## 4. How the AI Motion Tracking Works

Unlike basic camera games that only check whether pixels changed, **Just Box** uses deep learning computer vision:

```
[Webcam Stream] ➔ [MediaPipe Pose / YOLOv8] ➔ [3D Landmark Extraction]
                                                       │
                                                       ▼
[Kinetic Speed Gate] ◄── [3D Z-Depth + Joint Angles] ◄── [Body-Anchored Targets]
         │
         ▼
[Legitimate Punch Confirmed ➔ HIT!]
```

### 1. 3D Z-Depth (Camera Distance)
When you punch straight toward a camera lens, your arm does not move sideways across the 2D screen. MediaPipe calculates the **Z-coordinate (depth)**. When your fist extends toward the camera, `wrist.z` becomes significantly smaller than `shoulder.z`, allowing straight Jabs and Crosses to register with zero optical foreshortening issues.

### 2. Kinetic Velocity Gate (`PUNCH_MIN_SPEED`)
A resting hand, breathing jitter, or stationary guard stance has near-zero velocity. The game strictly requires **active punch speed** (`speed > 0.004` or rapid `dZ` burst) for any strike to register. This completely eliminates accidental "free hits" while you are just standing in your guard.

### 3. Body-Anchored Adaptive Targets
Targets are not fixed in the corner of your screen. The game reads your shoulder width and head height on every frame:
- If you step left, the targets adjust to your left.
- If you are tall or short, the targets align directly to your chin and chest.

---

## 5. Scoring, Combos & Game Modes

### The Scoring Formula:
$$\text{Points Per Punch} = 100 \times \text{Current Combo Multiplier}$$

- **1st Punch**: $+100\text{ pts}$ (Combo $1\times$)
- **2nd Consecutive Punch**: $+200\text{ pts}$ (Combo $2\times$)
- **5th Consecutive Punch**: $+500\text{ pts}$ (Combo $5\times$)
- **10th Consecutive Punch**: $+1,000\text{ pts}$ (Combo $10\times$)

> [!WARNING]
> **Don't break your streak!** If the target circle expires before you land the punch, your active combo resets to $0\times$!

### Game Modes:
- **30s (Quick Sprint)**: Maximum aerobic intensity test. Great for warm-ups or speed tests.
- **60s (Standard Round)**: Authentic amateur boxing round duration. Tests both speed and cardio endurance.
- **90s (Pro Workout)**: Full cardiovascular conditioning round for experienced fighters.

### Hall of Champions (Leaderboard):
At the end of every round, you can enter your fighter name to save your score to the **persistent local leaderboard**. It records:
- **Final Score**
- **Maximum Combo Streak**
- **Total Punches Landed**
- **Accuracy Percentage**
- **Date Recorded**

---

## 6. Troubleshooting & Pro Tips

| Problem | Likely Cause | Solution |
| :--- | :--- | :--- |
| **Punches aren't registering** | Standing too close to the camera. | Step back until your head, shoulders, and hips are all visible inside the screen. |
| **Jabs/Crosses missing** | Punching too gently or not extending. | Snap your fist forward with intent toward the camera lens. |
| **Hooks aren't registering** | Straightening your arm like a slap. | Keep your elbow bent at ~90° and swing through your hips. |
| **Uppercuts aren't registering** | Swinging outward instead of upward. | Drive your fist straight upward from your ribs toward your chin. |
| **Camera light on, but screen black** | Browser permission blocked. | Click the camera icon in your browser URL bar and click **"Always allow camera"**, then refresh. |
| **Lag / Low FPS on mobile** | Background apps draining GPU. | Close background apps and tabs to free up WebGL acceleration. |

---

## 7. Running & Hosting

### Play Online on Mobile / Desktop (GitHub Pages):
Open the live hosted version directly on any device:
👉 **[https://nikhilforge.github.io/boxing-game/](https://nikhilforge.github.io/boxing-game/)**

### Run Locally (Python Desktop Mode):
```bash
# Clone the repository
git clone https://github.com/NikhilForge/boxing-game.git
cd boxing-game

# Install dependencies
pip install -r requirements.txt

# Launch game
python main.py
```
- Press **`q`** to quit.
- Press **`r`** to restart a round.

### Run Locally (Web App Mode):
```bash
# Start local server in the project folder
python -m http.server 8000
```
Open **`http://localhost:8000`** in Chrome, Edge, or Safari.

---

*Train hard, snap your punches, and become the undisputed Champion! 🥊🏆*
