import qrcode
import os
import json
from io import BytesIO
import base64
from datetime import datetime

def generate_qr_code(booking_number: str, slot_data: dict) -> str:
    """Generate QR code for a slot booking. Returns base64 encoded image."""
    qr_data = json.dumps({
        "booking": booking_number,
        "checkpoint": slot_data.get("checkpoint"),
        "time": slot_data.get("slot_time"),
        "order": slot_data.get("order_id"),
        "issued": datetime.utcnow().isoformat()
    })

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()

    # Also save to disk
    static_path = "static/qr"
    os.makedirs(static_path, exist_ok=True)
    file_path = f"{static_path}/{booking_number}.png"
    with open(file_path, "wb") as f:
        f.write(buffered.getvalue())

    return img_str

def get_qr_path(booking_number: str) -> str:
    return f"/static/qr/{booking_number}.png"
