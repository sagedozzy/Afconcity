import os, sys, glob, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SP = os.environ.get('AFC_SCRATCH', '/tmp/claude-0/-home-claude/e1d17048-b07c-5512-9164-14e2ccd3c77e/scratchpad')
mode = sys.argv[1] if len(sys.argv) > 1 else ''
dev = mode == 'dev'
world = open(os.path.join(ROOT, 'osm2/world.json'), encoding='utf-8').read().strip()
tex = open(os.path.join(ROOT, 'tex/texdata.json'), encoding='utf-8').read().strip()
parts = []
for f in sorted(glob.glob(os.path.join(HERE, 'js', '*.js'))):
    s = open(f, encoding='utf-8').read()
    s = s.replace('const WORLD = /*WORLD*/null;', 'const WORLD = ' + world + ';')
    s = s.replace('const TEXDATA = /*TEXDATA*/null;', 'const TEXDATA = null;' if mode == 'web' else 'const TEXDATA = ' + tex + ';')
    s = s.replace('const DEV = /*DEV*/false;', 'const DEV = %s;' % ('true' if dev else 'false'))
    parts.append(s.rstrip('\n'))
js = '\n'.join(parts) + '\n'
assert '/*WORLD*/' not in js and '/*TEXDATA*/' not in js
script = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>\n(() => {\n\'use strict\';\n' + js + '})();\n</script>\n'
page = open(os.path.join(HERE, 'page.html'), encoding='utf-8').read()
assert '<!--SCRIPTS-->' in page
html = page.replace('<!--SCRIPTS-->\n', script)
if mode == 'web':
    # The public website: a small page plus fingerprinted files that browsers keep until the game changes.
    import hashlib, shutil, base64, io
    out = os.path.join(ROOT, 'dist'); shutil.rmtree(out, ignore_errors=True); os.makedirs(os.path.join(out, 'assets', 'tex'))
    def put(rel_dir, stem, ext, data):
        h = hashlib.sha256(data).hexdigest()[:10]; name = f'{stem}.{h}.{ext}'
        open(os.path.join(out, rel_dir, name), 'wb').write(data)
        return {'u': '/' + rel_dir.replace(os.sep, '/') + '/' + name, 'n': len(data)}
    game = put('assets', 'game', 'js', ("(() => {\n'use strict';\n" + js + "})();\n").encode())
    texm = {}
    from PIL import Image
    for name, url in json.loads(tex).items():
        raw = base64.b64decode(url.split(',', 1)[1])
        entry = {'hi': put(os.path.join('assets', 'tex'), name, 'webp', raw), 'nrm': name.endswith('N')}
        im = Image.open(io.BytesIO(raw))
        if im.size[0] >= 1024 and im.size[1] >= 1024:   # phones on Fast graphics get the half-size version
            b = io.BytesIO(); im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS).save(b, 'WEBP', quality=80, method=6)
            entry['lo'] = put(os.path.join('assets', 'tex'), name + '-lo', 'webp', b.getvalue())
        texm[name] = entry
    three_url = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    manifest = {'three': {'u': three_url, 'n': 603445}, 'game': game, 'tex': texm}
    loader = open(os.path.join(HERE, 'web_loader.js'), encoding='utf-8').read().replace('__MANIFEST__', json.dumps(manifest, separators=(',', ':')))
    page_web = page.replace('<!--SCRIPTS-->\n', '<script>\n' + loader + '</script>\n')
    web_head = open(os.path.join(HERE, 'web_head.html'), encoding='utf-8').read().replace('{{SITE_URL}}', os.environ.get('AFC_SITE_URL', '').rstrip('/'))
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(web_head + page_web + '\n</body>\n</html>\n')
    assets = sorted(['/assets/' + f for f in os.listdir(os.path.join(out, 'assets')) if f.endswith('.js')] + ['/assets/tex/' + f for f in os.listdir(os.path.join(out, 'assets', 'tex'))])
    ver = hashlib.sha256(''.join(assets).encode()).hexdigest()[:12]
    sw = open(os.path.join(HERE, 'web_sw.js'), encoding='utf-8').read().replace('__VERSION__', ver).replace('__ASSETS__', json.dumps(assets))
    open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8').write(sw)
    for f in sorted(os.listdir(os.path.join(ROOT, 'web'))): shutil.copy(os.path.join(ROOT, 'web', f), os.path.join(out, f))
    low = game['n'] + 603445 + sum((t.get('lo') or t['hi'])['n'] for t in texm.values() if not t['nrm'])
    high = game['n'] + 603445 + sum(t['hi']['n'] for t in texm.values())
    print('built web: page %d KB, game %d KB, first download %.1f MB on phones (Fast) / %.1f MB on High' % (os.path.getsize(os.path.join(out, 'index.html')) // 1024, game['n'] // 1024, low / 1048576, high / 1048576))
    sys.exit(0)
open(os.path.join(ROOT, 'afconcity-quest.html'), 'w', encoding='utf-8').write(html)
head = open(os.path.join(HERE, 'skeleton_head.html'), encoding='utf-8').read()
open(os.path.join(ROOT, 'afconcity-local.html'), 'w', encoding='utf-8').write(head + html + '\n\n</body></html>')
if os.path.isdir(os.path.dirname(SP)):
    os.makedirs(SP, exist_ok=True)
    open(os.path.join(SP, 'game3.js'), 'w', encoding='utf-8').write('(() => {\n' + js + '})();\n')
print('built', len(html.encode()), 'bytes', 'DEV' if dev else '')
