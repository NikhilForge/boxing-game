# Just Box 🥊

Just Box is a real-time boxing training game built with Python, OpenCV, and MediaPipe Pose Landmarker. Inspired by *Just Dance*, players perform boxing punches that are recognized by computer vision and pose estimation to score points, build combos, and improve reaction time.

## Features

- 🥊 Real-time pose tracking using MediaPipe
- 🎮 Random boxing move prompts
- ⚡ Combo and scoring system
- ⏱️ Timed rounds
- 📹 Webcam-based gameplay (supports Continuity Camera on macOS)

## Supported Moves (Current)

- 1 – Jab (Lead Hand)
- 2 – Cross (Rear Hand)
- 3 – Lead Hook
- 4 – Rear Hook
- 5 – Lead Uppercut
- 6 – Rear Uppercut

## Installation

1. Clone the repository.

```bash
git clone <repo-url>
cd just-box
```

2. Create and activate a virtual environment.

```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies.

```bash
pip install -r requirements.txt
```

4. Download the MediaPipe Pose Landmarker model:

https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

Place the file in the project root as:

```
pose_landmarker.task
```

5. Run the game.

```bash
python main.py
```

## Tech Stack

- Python
- OpenCV
- MediaPipe
- NumPy

## Roadmap

- [ ] Improve punch detection accuracy
- [ ] Body shots
- [ ] Combo recognition
- [ ] Multiple difficulty levels
- [ ] Sound effects
- [ ] Statistics and leaderboard
- [ ] Improved UI/animations
