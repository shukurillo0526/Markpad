import sys
from rembg import remove
from PIL import Image

input_path = "d:\\dev\\projects\\Markpad\\markpad\\v2\\src-tauri\\icons\\icon.png"
output_path = "d:\\dev\\projects\\Markpad\\markpad\\v2\\src-tauri\\icons\\icon.png"

try:
    print(f"Loading {input_path}...")
    input_image = Image.open(input_path)
    print("Removing background...")
    output_image = remove(input_image)
    
    # Check if the output has an alpha channel
    if output_image.mode != 'RGBA':
        output_image = output_image.convert('RGBA')
        
    output_image.save(output_path)
    print(f"Background successfully removed. Saved to {output_path}")
except Exception as e:
    print(f"Error: {e}")
