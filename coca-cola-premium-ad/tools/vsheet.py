import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
w, h, cols = 240, 427, 6
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), 'black'); d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS); x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y)); d.text((x + 4, y + 4), f.split('/')[-1], fill=(255, 255, 0))
sheet.save(out, quality=90)
