import os
import glob

html_files = glob.glob('frontend-konrad/pages/*.html')

new_link = """            <a href="/pages/favorites.html" class="sidebar-item">
                <span class="icon">❤️</span> Favoritos
            </a>"""

target = """            <a href="/pages/my-orders.html" class="sidebar-item">
                <span class="icon">🛍️</span> Mis Compras
            </a>"""

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    if "favorites.html" not in content and target in content:
        # Prevent catalog.html which I already manually edited from getting duplicated
        if file.endswith('catalog.html'):
            continue
        print(f"Adding to {file}")
        content = content.replace(target, target + "\n" + new_link)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
