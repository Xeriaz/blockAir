#!/usr/bin/env python3
"""
Generate PWA icon suite for BlockAir from Concept 1 (B-Monogram):
- public/icon.svg (Standard vector wrapper)
- public/icon-maskable.svg (Android maskable vector wrapper)
- public/icon-512.png (512x512 standard raster)
- public/icon-maskable-512.png (512x512 maskable raster)
- public/icon-192.png (192x192 standard raster)
- public/apple-touch-icon.png (180x180 iOS raster)
"""

import os
import subprocess
import zlib
import struct
import base64
import shutil

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(REPO_ROOT, "public")
CONCEPT_SRC = os.path.join(PUBLIC_DIR, "concepts", "b-monogram.jpg")

def save_rgba_png(path, width, height, rgba_data):
    raw_lines = bytearray()
    for y in range(height):
        raw_lines.append(0)
        raw_lines.extend(rgba_data[y * width * 4 : (y + 1) * width * 4])

    compressed = zlib.compress(bytes(raw_lines), 9)
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)

    def chunk(chunk_type, chunk_data):
        c = chunk_type + chunk_data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(chunk_data)) + c + crc

    out = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr_data)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(out)

def main():
    tmp_dir = "/tmp/blockair_icon_gen"
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_png_1024 = os.path.join(tmp_dir, "b-1024.png")

    subprocess.run(["sips", "-s", "format", "png", CONCEPT_SRC, "--out", tmp_png_1024], check=True)

    with open(tmp_png_1024, "rb") as f:
        data = f.read()

    w, h, depth, colortype = struct.unpack(">IIBB", data[16:26])
    bpp = 3 if colortype == 2 else 4

    idat = b""
    idx = 8
    while idx < len(data):
        length = struct.unpack(">I", data[idx : idx + 4])[0]
        if data[idx + 4 : idx + 8] == b"IDAT":
            idat += data[idx + 8 : idx + 8 + length]
        idx += 12 + length

    raw = zlib.decompress(idat)
    stride = 1 + w * bpp
    unfiltered = bytearray(w * h * bpp)

    def paeth(a, b, c):
        p = a + b - c
        pa = abs(p - a)
        pb = abs(p - b)
        pc = abs(p - c)
        if pa <= pb and pa <= pc:
            return a
        elif pb <= pc:
            return b
        else:
            return c

    for y in range(h):
        filter_type = raw[y * stride]
        scanline = raw[y * stride + 1 : (y + 1) * stride]
        out_offset = y * w * bpp
        prior_offset = (y - 1) * w * bpp if y > 0 else None

        for x in range(w * bpp):
            val = scanline[x]
            left = unfiltered[out_offset + x - bpp] if x >= bpp else 0
            up = unfiltered[prior_offset + x] if prior_offset is not None else 0
            upleft = (
                unfiltered[prior_offset + x - bpp]
                if (prior_offset is not None and x >= bpp)
                else 0
            )

            if filter_type == 0:
                res = val
            elif filter_type == 1:
                res = (val + left) & 0xFF
            elif filter_type == 2:
                res = (val + up) & 0xFF
            elif filter_type == 3:
                res = (val + ((left + up) >> 1)) & 0xFF
            elif filter_type == 4:
                res = (val + paeth(left, up, upleft)) & 0xFF
            else:
                res = val
            unfiltered[out_offset + x] = res

    # 1. Standard squircle crop [128:896, 128:896]
    crop_dim = 768
    standard_rgba = bytearray(crop_dim * crop_dim * 4)
    for cy in range(crop_dim):
        sy = 128 + cy
        for cx in range(crop_dim):
            sx = 128 + cx
            in_off = (sy * w + sx) * bpp
            out_off = (cy * crop_dim + cx) * 4
            standard_rgba[out_off] = unfiltered[in_off]
            standard_rgba[out_off + 1] = unfiltered[in_off + 1]
            standard_rgba[out_off + 2] = unfiltered[in_off + 2]
            standard_rgba[out_off + 3] = 255

    tmp_std_768 = os.path.join(tmp_dir, "standard_768.png")
    save_rgba_png(tmp_std_768, crop_dim, crop_dim, standard_rgba)

    # 2. Maskable full-bleed with seamless background
    maskable_rgba = bytearray(w * h * 4)
    bg_r, bg_g, bg_b = 10, 18, 34

    for y in range(h):
        dy = y - 511.5
        for x in range(w):
            dx = x - 514.0
            dist = (dx * dx + dy * dy) ** 0.5
            in_off = (y * w + x) * bpp
            out_off = (y * w + x) * 4
            r = unfiltered[in_off]
            g = unfiltered[in_off + 1]
            b = unfiltered[in_off + 2]

            if dist > 360:
                t = min(1.0, max(0.0, (dist - 360.0) / 60.0))
                r = int(r * (1 - t) + bg_r * t)
                g = int(g * (1 - t) + bg_g * t)
                b = int(b * (1 - t) + bg_b * t)

            maskable_rgba[out_off] = r
            maskable_rgba[out_off + 1] = g
            maskable_rgba[out_off + 2] = b
            maskable_rgba[out_off + 3] = 255

    tmp_msk_1024 = os.path.join(tmp_dir, "maskable_1024.png")
    save_rgba_png(tmp_msk_1024, w, h, maskable_rgba)

    # Downscale to PWA target dimensions
    icon_512_path = os.path.join(PUBLIC_DIR, "icon-512.png")
    icon_maskable_path = os.path.join(PUBLIC_DIR, "icon-maskable-512.png")
    icon_192_path = os.path.join(PUBLIC_DIR, "icon-192.png")
    apple_touch_path = os.path.join(PUBLIC_DIR, "apple-touch-icon.png")

    subprocess.run(["sips", "-s", "format", "png", "-z", "512", "512", tmp_std_768, "--out", icon_512_path], check=True)
    subprocess.run(["sips", "-s", "format", "png", "-z", "512", "512", tmp_msk_1024, "--out", icon_maskable_path], check=True)
    subprocess.run(["sips", "-s", "format", "png", "-z", "192", "192", tmp_std_768, "--out", icon_192_path], check=True)
    subprocess.run(["sips", "-s", "format", "png", "-z", "180", "180", tmp_std_768, "--out", apple_touch_path], check=True)

    # Generate SVGs
    with open(icon_512_path, "rb") as f:
        b64_std = base64.b64encode(f.read()).decode("ascii")
    with open(icon_maskable_path, "rb") as f:
        b64_msk = base64.b64encode(f.read()).decode("ascii")

    with open(os.path.join(PUBLIC_DIR, "icon.svg"), "w", encoding="utf-8") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n  <image width="512" height="512" href="data:image/png;base64,{b64_std}" />\n</svg>')

    with open(os.path.join(PUBLIC_DIR, "icon-maskable.svg"), "w", encoding="utf-8") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n  <image width="512" height="512" href="data:image/png;base64,{b64_msk}" />\n</svg>')

    shutil.rmtree(tmp_dir, ignore_errors=True)
    print("All PWA icons successfully generated from Concept 1!")

if __name__ == "__main__":
    main()
