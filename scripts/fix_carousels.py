import os
import glob
import re

files = glob.glob('frontend-konrad/src/js/*.js')

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the broken gallery initialization:
    # const gal = [p.imagen_principal || '📦', '📦', '🛒']; curImg = 0;
    # const gallery = [mainImg, mainImg, mainImg]; 
    # const gallery = [mainImg, mainImg.replace('w=600', 'w=601'), mainImg.replace('w=600', 'w=602')];
    # We will replace these specific lines using regex or standard replace.
    
    if "const gal = [p.imagen_principal || '📦', '📦', '🛒'];" in content:
        new_logic = """    let the_img = p.imagen_principal || '📦';
    if (p.imagenes && p.imagenes.length > 0 && p.imagenes[0].imagen) the_img = p.imagenes[0].imagen;
    else if (p.descripcion && p.descripcion.includes('||IMG:')) {
        const m = p.descripcion.match(/\\|\\|IMG:(.*?)\\|\\|/);
        if (m) the_img = m[1];
    }
    const gal = [];
    if (p.imagenes && p.imagenes.length > 0) {
        p.imagenes.forEach(i => gal.push(i.imagen));
    }
    if (gal.length === 0) gal.push(the_img);
    curImg = 0;"""
        content = content.replace("    const gal = [p.imagen_principal || '📦', '📦', '🛒']; curImg = 0;", new_logic)
        
    if "const gallery = [mainImg, mainImg, mainImg];" in content:
        new_logic = """    const gallery = [];
    if (p.imagenes && p.imagenes.length > 0) {
        gallery.push(...p.imagenes.map(i => i.imagen));
    }
    if (gallery.length === 0) gallery.push(mainImg);"""
        content = content.replace("    const gallery = [mainImg, mainImg, mainImg];", new_logic)

    if ("const gallery = [mainImg, mainImg.replace('w=600', 'w=601')" in content):
        new_logic = """    const gallery = [];
    if (p.imagenes && p.imagenes.length > 0) {
        gallery.push(...p.imagenes.map(i => i.imagen));
    }
    if (gallery.length === 0) gallery.push(mainImg);"""
        # because the string spans over spaces, regex is better:
        content = re.sub(r"const gallery = \[mainImg, mainImg\.replace[^\]]+\];", new_logic, content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Patched:", path)
