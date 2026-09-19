import os
import math
from PIL import Image, ImageDraw, ImageFilter

# Android mipmap densities and dimensions
# Adaptive icon foreground (108x108 at mdpi, up to 432x432 at xxxhdpi)
FOREGROUND_SIZES = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
}

# Legacy launcher icons (48x48 at mdpi, up to 192x192 at xxxhdpi)
LEGACY_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

BASE_RES_DIR = r'd:\projects\GATERevisionTrackerWebsite\tracker-app\android\app\src\main\res'

def create_master_graphic(size=2048, with_background=False, is_round=False):
    """
    Renders a high-resolution vector-like master graphic.
    Concept: A stylized, modern Graduation Cap merged with an Upward Exponential Progress Curve and Star/Node.
    Colors: Electric Cyan (#38BDF8), Vibrant Indigo/Violet (#6366F1, #8B5CF6), and Gold accent.
    """
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = size / 2, size / 2

    # If with_background, draw deep navy gradient background
    if with_background:
        # Radial / vertical gradient for rich depth
        for y in range(size):
            factor = y / size
            r = int(11 + factor * 8)
            g = int(19 + factor * 8)
            b = int(41 + factor * 35)
            draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
        
        # Draw subtle outer glow ring
        glow_radius = size * 0.44
        draw.ellipse([cx - glow_radius, cy - glow_radius, cx + glow_radius, cy + glow_radius],
                     outline=(99, 102, 241, 40), width=int(size * 0.015))

    # Center scaling: when with_background (legacy icon), use 78% scale. For adaptive foreground, use 62% scale (safe zone).
    scale = (size * 0.72) if with_background else (size * 0.58)

    # 1. Background soft glow behind emblem
    glow_size = int(scale * 0.9)
    glow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.ellipse([cx - glow_size/2, cy - glow_size/2, cx + glow_size/2, cy + glow_size/2],
                      fill=(99, 102, 241, 70))
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(int(size * 0.08)))
    img = Image.alpha_composite(img, glow_img)
    draw = ImageDraw.Draw(img)

    # 2. Stylized Graduation Cap Diamond (Rhombus)
    # Apex at top, wings at sides, lower point below
    cap_cy = cy - scale * 0.08
    rhombus_top = (cx, cap_cy - scale * 0.32)
    rhombus_right = (cx + scale * 0.44, cap_cy - scale * 0.05)
    rhombus_bottom = (cx, cap_cy + scale * 0.20)
    rhombus_left = (cx - scale * 0.44, cap_cy - scale * 0.05)

    # Top Cap Diamond with rich modern gradient shading (split into left/right facet)
    # Left facet (Violet to Indigo)
    draw.polygon([rhombus_top, rhombus_left, rhombus_bottom, (cx, cap_cy - scale * 0.06)], fill=(129, 140, 248, 255))
    # Right facet (Cyan to Electric Indigo)
    draw.polygon([rhombus_top, rhombus_right, rhombus_bottom, (cx, cap_cy - scale * 0.06)], fill=(56, 189, 248, 255))

    # Cap Rim / Skullcap underneath
    rim_left = cx - scale * 0.24
    rim_right = cx + scale * 0.24
    rim_bottom = cap_cy + scale * 0.38
    draw.polygon([
        (rim_left, cap_cy + scale * 0.08),
        (rim_right, cap_cy + scale * 0.08),
        (cx + scale * 0.18, rim_bottom),
        (cx - scale * 0.18, rim_bottom)
    ], fill=(49, 46, 129, 255))

    # 3. Dynamic Upward Exponential Growth Curve & Bar Elements
    # Representing study progress, revision tracking, and score ascent
    bars_y_base = cy + scale * 0.42
    bar_width = scale * 0.08
    
    # 3 Progress pillars
    # Bar 1 (Novice)
    b1_x = cx - scale * 0.28
    b1_h = scale * 0.20
    draw.rounded_rectangle([b1_x - bar_width/2, bars_y_base - b1_h, b1_x + bar_width/2, bars_y_base],
                           radius=int(bar_width/3), fill=(99, 102, 241, 200))

    # Bar 2 (Revision)
    b2_x = cx - scale * 0.12
    b2_h = scale * 0.32
    draw.rounded_rectangle([b2_x - bar_width/2, bars_y_base - b2_h, b2_x + bar_width/2, bars_y_base],
                           radius=int(bar_width/3), fill=(129, 140, 248, 230))

    # Bar 3 (Mastery)
    b3_x = cx + scale * 0.04
    b3_h = scale * 0.48
    draw.rounded_rectangle([b3_x - bar_width/2, bars_y_base - b3_h, b3_x + bar_width/2, bars_y_base],
                           radius=int(bar_width/3), fill=(56, 189, 248, 255))

    # 4. Exponential Swoosh Vector (Growth arrow surging diagonally up and right)
    points = []
    num_steps = 30
    x_start = cx - scale * 0.38
    x_end = cx + scale * 0.38
    for i in range(num_steps + 1):
        t = i / num_steps
        px = x_start + t * (x_end - x_start)
        # exponential curve
        py = (bars_y_base + scale * 0.02) - (math.pow(t, 2.2) * (scale * 0.88))
        points.append((px, py))

    # Draw smooth thick antialiased line for the trendline
    line_width = int(scale * 0.05)
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i + 1]
        t = i / len(points)
        # Color transition from deep violet to electric cyan
        r = int(139 - t * (139 - 56))
        g = int(92 + t * (189 - 92))
        b = int(246 + t * (248 - 246))
        draw.line([p1, p2], fill=(r, g, b, 255), width=line_width)

    # 5. Glowing Apex Star / Target Node at the peak of the curve
    apex = points[-1]
    apex_r = scale * 0.09
    draw.ellipse([apex[0] - apex_r, apex[1] - apex_r, apex[0] + apex_r, apex[1] + apex_r],
                 fill=(255, 255, 255, 255))
    draw.ellipse([apex[0] - apex_r*1.4, apex[1] - apex_r*1.4, apex[0] + apex_r*1.4, apex[1] + apex_r*1.4],
                 outline=(56, 189, 248, 180), width=int(scale * 0.025))

    # 6. Graduation Tassel / Golden Milestone Accent
    tassel_origin = (cx, cap_cy - scale * 0.06)
    tassel_mid = (cx + scale * 0.28, cap_cy + scale * 0.05)
    tassel_end = (cx + scale * 0.30, cap_cy + scale * 0.22)
    draw.line([tassel_origin, tassel_mid, tassel_end], fill=(251, 191, 36, 255), width=int(scale * 0.025))
    draw.rounded_rectangle([tassel_end[0] - scale * 0.025, tassel_end[1], tassel_end[0] + scale * 0.025, tassel_end[1] + scale * 0.07],
                           radius=int(scale * 0.015), fill=(245, 158, 11, 255))

    # If round icon requested, apply circular mask
    if is_round:
        mask = Image.new('L', (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([0, 0, size, size], fill=255)
        img.putalpha(mask)

    return img

def generate_all():
    print("[ICON] Generating high-resolution master icons...")
    master_foreground = create_master_graphic(size=2048, with_background=False)
    master_legacy_square = create_master_graphic(size=2048, with_background=True, is_round=False)
    master_legacy_round = create_master_graphic(size=2048, with_background=True, is_round=True)

    print("[ICON] Exporting Android adaptive and legacy mipmaps...")

    for folder, dim in FOREGROUND_SIZES.items():
        folder_path = os.path.join(BASE_RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # 1. ic_launcher_foreground.png
        fg_resized = master_foreground.resize((dim, dim), Image.Resampling.LANCZOS)
        fg_path = os.path.join(folder_path, 'ic_launcher_foreground.png')
        fg_resized.save(fg_path, 'PNG', optimize=True)
        print(f"  [OK] {folder}/ic_launcher_foreground.png ({dim}x{dim})")

    for folder, dim in LEGACY_SIZES.items():
        folder_path = os.path.join(BASE_RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        # 2. ic_launcher.png (Square / Squircle)
        sq_resized = master_legacy_square.resize((dim, dim), Image.Resampling.LANCZOS)
        sq_path = os.path.join(folder_path, 'ic_launcher.png')
        sq_resized.save(sq_path, 'PNG', optimize=True)
        print(f"  [OK] {folder}/ic_launcher.png ({dim}x{dim})")

        # 3. ic_launcher_round.png (Round)
        rd_resized = master_legacy_round.resize((dim, dim), Image.Resampling.LANCZOS)
        rd_path = os.path.join(folder_path, 'ic_launcher_round.png')
        rd_resized.save(rd_path, 'PNG', optimize=True)
        print(f"  [OK] {folder}/ic_launcher_round.png ({dim}x{dim})")

    print("\n[SUCCESS] All Android icons successfully generated and saved!")

if __name__ == '__main__':
    generate_all()
