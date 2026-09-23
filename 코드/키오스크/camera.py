import subprocess

def capture_image(save_path="snapshot.jpg"):
    subprocess.run([
        "rpicam-still",
        "-o",
        save_path,
        "-n"
    ], check=True)

    return save_path