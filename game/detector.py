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

        # In mirrored frame:
        # Left wrist is to the left of left shoulder (lsx - lwx is positive)
        # Right wrist is to the right of right shoulder (rwx - rsx is positive)
        l_extended   = (lsx - lwx) / shoulder_width
        r_extended   = (rwx - rsx) / shoulder_width
        l_reach      = np.sqrt((lwx - lsx)**2 + (lwy - lsy)**2) / shoulder_width
        r_reach      = np.sqrt((rwx - rsx)**2 + (rwy - rsy)**2) / shoulder_width
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

    def check_move(self, target_move, landmarks, w, h):
        def px(i):
            return landmarks[i][0] / w, landmarks[i][1] / h

        lwx, lwy = px(L_WRIST)
        rwx, rwy = px(R_WRIST)
        lsx, lsy = px(L_SHOULDER)
        rsx, rsy = px(R_SHOULDER)
        lex, ley = px(L_ELBOW)
        rex, rey = px(R_ELBOW)

        if lwx == 0 or rwx == 0 or lsx == 0 or rsx == 0:
            return False

        shoulder_width = max(0.10, abs(rsx - lsx))
        shoulder_y = (lsy + rsy) / 2
        body_height = max(0.25, abs(lsy - px(L_HIP)[1]))

        l_reach = np.sqrt((lwx - lsx)**2 + (lwy - lsy)**2) / shoulder_width
        r_reach = np.sqrt((rwx - rsx)**2 + (rwy - rsy)**2) / shoulder_width

        l_elbow_angle = angle_between((lsx, lsy), (lex, ley), (lwx, lwy))
        r_elbow_angle = angle_between((rsx, rsy), (rex, rey), (rwx, rwy))

        ldx, ldy = self.wrist_velocity(self.l_wrist_history)
        rdx, rdy = self.wrist_velocity(self.r_wrist_history)
        l_speed = np.sqrt(ldx**2 + ldy**2)
        r_speed = np.sqrt(rdx**2 + rdy**2)

        has_l_speed = l_speed > 0.0025
        has_r_speed = r_speed > 0.0025
        l_moving_up = ldy < -0.002
        r_moving_up = rdy < -0.002

        if target_move == 1:  # Jab (Left Straight)
            return (l_reach > 0.50 and l_elbow_angle > 90) or (has_l_speed and l_reach > 0.40)
        elif target_move == 2:  # Cross (Right Straight)
            return (r_reach > 0.50 and r_elbow_angle > 90) or (has_r_speed and r_reach > 0.40)
        elif target_move == 3:  # Lead Hook (Left Hook)
            return (60 < l_elbow_angle < 145) and (has_l_speed or abs(ldx) > 0.002)
        elif target_move == 4:  # Rear Hook (Right Hook)
            return (60 < r_elbow_angle < 145) and (has_r_speed or abs(rdx) > 0.002)
        elif target_move == 5:  # Lead Uppercut (Left Uppercut)
            return (l_elbow_angle < 140) and (l_moving_up or (lwy < lsy + 0.15 * body_height and ldy < 0))
        elif target_move == 6:  # Rear Uppercut (Right Uppercut)
            return (r_elbow_angle < 140) and (r_moving_up or (rwy < rsy + 0.15 * body_height and rdy < 0))
        return False

    def detect_move(self, landmarks, w, h):
        for m in range(1, 7):
            if self.check_move(m, landmarks, w, h):
                return m
        return None
