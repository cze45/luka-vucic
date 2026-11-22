"""Builds the static GitHub Pages site from the Design artifact pages (*.dc.html)."""
import os, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'src')
OUT = os.path.dirname(os.path.abspath(__file__))

PAGES = {
    'Landing-v4.dc.html': ('index.html', 'Fotograf i videograf u Novom Sadu. Fotografisanje 18. rođendana i proslava od 150 €, video za kreatore i brendove.'),
    'Foto.dc.html': ('foto.html', 'Fotografisanje 18. rođendana i proslava u Novom Sadu, od 150 €. Najmanje 150 obrađenih fotografija u roku od par dana.'),
    'Video.dc.html': ('video.html', 'Kamerman za kreatore i brendove u Novom Sadu. Reklame, kratki video za Instagram i TikTok, događaji i predavanja.'),
    'O-meni.dc.html': ('o-meni.html', 'Luka Vučić, fotograf i videograf iz Novog Sada. 2 godine u marketingu i 300+ snimljenih short form videa.'),
    'Kontakt.dc.html': ('kontakt.html', 'Zakaži fotografisanje ili snimanje u Novom Sadu. Pozovi ili pošalji upit, a cenu ti javljam u što kraćem roku.'),
}

# design asset store url -> file committed in img/
ASSETS = {'/_blob/9b82254a2c5ad5f693f71469aba7075c': 'img/luka-portret.jpg', '/_blob/74036e9d6555bd1ae1ffdf8d90f431ca': 'img/luka-kamera.jpg',
          '/_blob/7d378735dffafca0a37076201d4e53af': 'img/luka-proslava.jpg',
          '/_blob/50967593da87b8ca3e8626a1df0de3be': 'img/luka-snimanje-enterijer.jpg',
          '/_blob/7be16c966555e2955f54e522b9e1d46c': 'img/luka-kamera-portret.jpg',
          '/_blob/adc2d2410f675858ceca09e9d5d72d67': 'img/luka-zurka-gimbal.jpg',
          '/_blob/c9e1c11a3fd7873634e7d52e56f412cb': 'img/bts-kosarka.jpg',
          '/_blob/29fd5b08f76bed3691cf1b474f310ed5': 'img/bts-ekran.jpg',
          '/_blob/56dc3526f142da773297f3145062faa3': 'img/bts-gradiliste.jpg'}

for src_name, (out_name, desc) in PAGES.items():
    s = open(os.path.join(SRC, src_name), encoding='utf-8').read()
    title = re.search(r'<title>(.*?)</title>', s, re.S).group(1).strip()
    helmet = re.search(r'<helmet>(.*?)</helmet>', s, re.S).group(1).strip()
    body = re.search(r'<x-dc>(.*?)</x-dc>', s, re.S).group(1)
    body = re.sub(r'<helmet>.*?</helmet>', '', body, flags=re.S).strip()
    m = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', s, re.S)
    logic = m.group(1).strip() if m else 'class Component extends DCLogic { renderVals() { return {}; } }'
    for a, (b, _) in PAGES.items():
        body = body.replace('href="%s' % a, 'href="%s' % b)
    for blob, local in ASSETS.items():
        body = body.replace(blob, local)
    body = body.replace('</script', '<\\/script')
    html = '''<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%s</title>
<meta name="description" content="%s">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta name="theme-color" content="#121212">
%s
</head>
<body>
<div id="app"></div>
<template id="tpl">%s</template>
<script src="runtime.js"></script>
<script>
%s
DCMount(Component);
</script>
</body>
</html>
''' % (title, desc, title, desc, helmet, body, logic)
    open(os.path.join(OUT, out_name), 'w', encoding='utf-8', newline='\n').write(html)
    print(src_name, '->', out_name)
