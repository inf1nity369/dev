import sys, glob, os
from PIL import Image, ImageDraw
files = sys.argv[2:]
cols = 3; w, h = 640, 360
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), 'black')
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y))
    d.text((x + 8, y + 6), os.path.basename(f), fill=(255, 255, 0))
sheet.save(sys.argv[1], quality=90)
