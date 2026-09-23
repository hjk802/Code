from ultralytics import YOLO

# 모델 로드
model1 = YOLO("first_model_best.pt")
model2 = YOLO("second_model_best.pt")


def classify(image_path):

    # ---------- 1차 모델 ----------
    result1 = model1.predict(
        source=image_path,
        verbose=False
    )[0]

    if len(result1.boxes) > 0:
        cls_id1 = int(result1.boxes.cls[0])
        first_class = result1.names[cls_id1]
        first_score = float(result1.boxes.conf[0])
    else:
        first_class = "unknown"
        first_score = 0.0


    # ---------- 2차 모델 ----------
    result2 = model2.predict(
        source=image_path,
        verbose=False
    )[0]

    if len(result2.boxes) > 0:
        cls_id2 = int(result2.boxes.cls[0])
        second_class = result2.names[cls_id2]
        second_score = float(result2.boxes.conf[0])
    else:
        second_class = "unknown"
        second_score = 0.0


    return {
        "first_class": first_class,
        "second_class": second_class
    }