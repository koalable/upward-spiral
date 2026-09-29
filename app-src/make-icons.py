# Draws the app icon: the day's four rings on a dark tile. Run once; the PNGs are committed.
from PIL import Image, ImageDraw
COLORS = ["#86b66f", "#6aa6de", "#ec9860", "#a894ec"]  # Garden, Tide, Ember, Dusk
FILL = [0.95, 0.8, 0.65, 0.5]
def icon(size, pad=0.0):
    S = size * 4
    im = Image.new("RGB", (S, S), "#09090b")
    d = ImageDraw.Draw(im)
    c = S / 2
    inner = S * (0.5 - pad)
    width = inner * 0.12
    for i, (col, f) in enumerate(zip(COLORS, FILL)):
        r = inner * (0.78 - i * 0.17)
        box = [c - r, c - r, c + r, c + r]
        d.arc(box, 0, 360, fill="#1f1f23", width=int(width))
        d.arc(box, -90, -90 + 360 * f, fill=col, width=int(width))
        for ang in (-90, -90 + 360 * f):  # round caps
            import math
            x = c + r * math.cos(math.radians(ang)) - 0 ; y = c + r * math.sin(math.radians(ang))
            rr = width / 2 - 1
            # arc stroke is drawn inward from the box edge; centre of stroke sits at r - width/2
            rc = r - width / 2
            x = c + rc * math.cos(math.radians(ang)); y = c + rc * math.sin(math.radians(ang))
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=col)
    return im.resize((size, size), Image.LANCZOS)
for name, size, pad in [("icon-180.png", 180, 0), ("icon-192.png", 192, 0), ("icon-512.png", 512, 0), ("icon-maskable-512.png", 512, 0.1)]:
    icon(size, pad).save(f"app-src/{name}")
