import cv2
import time
import random
from game.detector import PoseDetector
from game.moves import MOVES
from game.ui import (
    Target,
    draw_move_prompt, draw_score,
    draw_countdown, draw_game_over, draw_round_timer,
)

# --- Settings ---
CAMERA_INDEX   = 0
FRAME_WIDTH    = 1280
FRAME_HEIGHT   = 720
ROUND_DURATION = 60
TIME_PER_MOVE  = 2.5
BASE_POINTS    = 100

def run_game():
    detector = PoseDetector()
    cap = cv2.VideoCapture(CAMERA_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    if not cap.isOpened():
        print("Camera not found!")
        return

    high_score = 0

    while True:
        # --- Countdown ---
        for i in range(3, 0, -1):
            deadline = time.time() + 1.0
            while time.time() < deadline:
                ret, frame = cap.read()
                if not ret:
                    continue
                frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
                frame = cv2.flip(frame, 1)
                draw_countdown(frame, i)
                cv2.imshow('Just Box', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    cap.release()
                    cv2.destroyAllWindows()
                    return

        # --- Round state ---
        score        = 0
        combo        = 0
        round_start  = time.time()
        move_keys    = list(MOVES.keys())

        # pick first move
        current_move = random.choice(move_keys)
        target       = None
        last_detected     = None
        last_detect_time  = 0
        DEBOUNCE          = 0.5

        print(f"\nRound started! Move: {MOVES[current_move]['name']}")

        def spawn_target(w, h):
            return Target(current_move, TIME_PER_MOVE, w, h)

        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
            frame = cv2.flip(frame, 1)  # mirror so it feels natural
            h, w, _ = frame.shape
            now = time.time()

            # spawn target if we don't have one
            if target is None:
                target = spawn_target(w, h)

            round_remaining = ROUND_DURATION - (now - round_start)

            # --- Round over ---
            if round_remaining <= 0:
                break

            # --- Target expired (missed) ---
            if target.is_expired() and not target.hit:
                combo = 0
                current_move = random.choice(move_keys)
                target = spawn_target(w, h)
                last_detected = None
                print(f"MISS — next: {MOVES[current_move]['name']}")

            # --- After hit animation finishes, next move ---
            if target.hit and target.is_expired():
                current_move = random.choice(move_keys)
                target = spawn_target(w, h)
                last_detected = None
                print(f"Next: {MOVES[current_move]['name']}")

            # --- Pose detection ---
            landmarks = detector.get_landmarks(frame)
            if landmarks is not None and not target.hit:
                detector.draw_landmarks(frame, landmarks)
                detected = detector.detect_move(landmarks, w, h)

                if (detected is not None and
                    (detected != last_detected or
                     now - last_detect_time > DEBOUNCE)):

                    last_detected    = detected
                    last_detect_time = now

                    if detected == current_move:
                        combo  += 1
                        points  = BASE_POINTS * combo
                        score  += points
                        target.trigger_hit()
                        print(f"HIT! {MOVES[current_move]['name']} +{points}pts (x{combo})")

            # --- Draw everything ---
            target.draw(frame)
            time_left = max(TIME_PER_MOVE - (now - target.start_time), 0)
            draw_move_prompt(frame, current_move, time_left, TIME_PER_MOVE)
            draw_score(frame, score, combo)
            draw_round_timer(frame, max(round_remaining, 0))

            cv2.imshow('Just Box', frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                cap.release()
                cv2.destroyAllWindows()
                return

        # --- Game over screen ---
        high_score = max(score, high_score)
        print(f"\nRound over! Score: {score} | Best: {high_score}")

        while True:
            ret, frame = cap.read()
            if not ret:
                continue
            frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
            frame = cv2.flip(frame, 1)
            draw_game_over(frame, score, high_score)
            cv2.imshow('Just Box', frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('r'):
                break
            if key == ord('q'):
                cap.release()
                cv2.destroyAllWindows()
                return

if __name__ == "__main__":
    run_game()