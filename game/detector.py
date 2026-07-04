from ultralytics import YOLO
import cv2
import numpy as np

# YOLOv8 pose keypoint indices
L_SHOULDER = 5
R_SHOULDER = 6
L_ELBOW    = 7
R_ELBOW    = 8
L_WRIST    = 9
R_WRIST    = 10
L_HIP      = 11
R_HIP      = 12
NOSE       = 0

def angle_between(a, b, c):
    ab = np.array([a[0] - b[0], a[1] - b[1]])
    cb = np.array([c[0] - b[0], c[1] - b[1]]) 
    cos_angle = np.dot(ab, cb) / (np.linalg.norm(ab) * np.linalg.norm(cb) + 1e-6)
    return np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0)))

class PoseDetector:
    def __init__(self):
        # downloads automatically on first run (~7MB)
        self.model = YOLO("yolov8n-pose.pt")
        self.l_wrist_history = []
        self.r_wrist_history = []
        self.history_size = 6

    def get_landmarks(self, frame):
        results = self.model(frame, verbose=False)
        if results and len(results[0].keypoints.xy) > 0:
            kpts = results[0].keypoints.xy[0].cpu().numpy()
            if kpts.shape[0] >= 13:
                return kpts
        return None

    def draw_landmarks(self, frame, landmarks):
        connections = [
            (L_SHOULDER, R_SHOULDER),
            (L_SHOULDER, L_ELBOW), (L_ELBOW, L_WRIST),
            (R_SHOULDER, R_ELBOW), (R_ELBOW, R_WRIST),
            (L_SHOULDER, L_HIP),  (R_SHOULDER, R_HIP),
            (L_HIP, R_HIP),
        ]
        for a, b in connections:
            if a < len(landmarks) and b < len(landmarks):
                pt1 = (int(landmarks[a][0]), int(landmarks[a][1]))
                pt2 = (int(landmarks[b][0]), int(landmarks[b][1]))
                if pt1 != (0, 0) and pt2 != (0, 0):
                    cv2.line(frame, pt1, pt2, (0, 200, 0), 2)
        for i, pt in enumerate(landmarks):
            x, y = int(pt[0]), int(pt[1])
            if x > 0 and y > 0:
                cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)

    def wrist_velocity(self, history):
        if len(history) < 2:
            return 0.0, 0.0
        dx = history[-1][0] - history[-min(3, len(history))][0]
        dy = history[-1][1] - history[-min(3, len(history))][1]
        return dx, dy

    def detect_move(self, landmarks, w, h):
        def px(i):
            # return normalized coords from pixel coords
            return landmarks[i][0] / w, landmarks[i][1] / h

        lwx, lwy = px(L_WRIST)
        rwx, rwy = px(R_WRIST)
        lsx, lsy = px(L_SHOULDER)
        rsx, rsy = px(R_SHOULDER)
        lex, ley = px(L_ELBOW)
        rex, rey = px(R_ELBOW)
        lhx, lhy = px(L_HIP)
        rhx, rhy = px(R_HIP)

        # skip if keypoints missing (zeros mean undetected)
        if lwx == 0 or rwx == 0 or lsx == 0 or rsx == 0:
            return None

        self.l_wrist_history.append((lwx, lwy))
        self.r_wrist_history.append((rwx, rwy))
        if len(self.l_wrist_history) > self.history_size:
            self.l_wrist_history.pop(0)
        if len(self.r_wrist_history) > self.history_size:
            self.r_wrist_history.pop(0)

        shoulder_width = abs(rsx - lsx)
        body_height    = abs(((lsy + rsy) / 2) - ((lhy + rhy) / 2))
        shoulder_y     = (lsy + rsy) / 2

        if shoulder_width < 0.01 or body_height < 0.01:
            return None

        l_extended   = (lwx - lsx) / shoulder_width
        r_extended   = (rsx - rwx) / shoulder_width
        l_wrist_high = (lsy - lwy) / body_height
        r_wrist_high = (rsy - rwy) / body_height
        l_wide       = abs(lwx - lsx) / shoulder_width
        r_wide       = abs(rwx - rsx) / shoulder_width
        l_at_head    = abs(lwy - shoulder_y) / body_height
        r_at_head    = abs(rwy - shoulder_y) / body_height

        l_elbow_angle = angle_between(
            (lsx, lsy), (lex, ley), (lwx, lwy))
        r_elbow_angle = angle_between(
            (rsx, rsy), (rex, rey), (rwx, rwy))

        ldx, ldy = self.wrist_velocity(self.l_wrist_history)
        rdx, rdy = self.wrist_velocity(self.r_wrist_history)
        l_speed  = np.sqrt(ldx**2 + ldy**2)
        r_speed  = np.sqrt(rdx**2 + rdy**2)

        MIN_SPEED = 0.006

        # 1: Jab — left wrist forward, elbow straight, head height
        if (l_extended > 0.45 and
            l_elbow_angle > 130 and
            l_at_head < 0.3 and
            l_speed > MIN_SPEED):
            return 1

        # 2: Cross — right wrist forward, elbow straight, head height
        if (r_extended > 0.45 and
            r_elbow_angle > 130 and
            r_at_head < 0.3 and
            r_speed > MIN_SPEED):
            return 2

        # 5: Left Uppercut — wrist above shoulder, elbow bent, moving up
        if (l_wrist_high > 0.3 and
            l_elbow_angle < 110 and
            l_wide < 0.4 and
            ldy < -MIN_SPEED):
            return 5

        # 6: Right Uppercut — wrist above shoulder, elbow bent, moving up
        if (r_wrist_high > 0.3 and
            r_elbow_angle < 110 and
            r_wide < 0.4 and
            rdy < -MIN_SPEED):
            return 6

        # 3: Left Hook — wrist wide, elbow bent, head height, not extended
        if (l_wide > 0.7 and
            l_elbow_angle < 120 and
            l_at_head < 0.25 and
            l_extended < 0.25 and
            l_speed > MIN_SPEED):
            return 3

        # 4: Right Hook — wrist wide, elbow bent, head height, not extended
        if (r_wide > 0.7 and
            r_elbow_angle < 120 and
            r_at_head < 0.25 and
            r_extended < 0.25 and
            r_speed > MIN_SPEED):
            return 4

        return None
