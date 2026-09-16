import sys
from PIL import Image, ImageDraw

input_path = "d:\\dev\\projects\\Markpad\\markpad\\v2\\src-tauri\\icons\\icon.png"
output_path = "d:\\dev\\projects\\Markpad\\markpad\\v2\\src-tauri\\icons\\icon.png"

try:
    img = Image.open(input_path).convert("RGBA")
    
    # We use a unique mask color that shouldn't exist in the icon
    mask_color = (255, 0, 255, 255)
    
    # Flood fill from the four corners to handle gradients near the edge
    # thresh=40 means it will match colors within distance 40 of the starting pixel
    ImageDraw.floodfill(img, xy=(0, 0), value=mask_color, thresh=40)
    ImageDraw.floodfill(img, xy=(img.width - 1, 0), value=mask_color, thresh=40)
    ImageDraw.floodfill(img, xy=(0, img.height - 1), value=mask_color, thresh=40)
    ImageDraw.floodfill(img, xy=(img.width - 1, img.height - 1), value=mask_color, thresh=40)
    
    # Replace the mask color with completely transparent pixels
    data = img.getdata()
    new_data = []
    for item in data:
        if item == mask_color:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print("Background made transparent successfully!")
except Exception as e:
    print(f"Error: {e}")
