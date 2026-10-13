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
    s = s.replace('const TEXDATA = /*TEXDATA*/null;', 'const TEXDATA = ' + tex + ';')
    s = s.replace('const DEV = /*DEV*/false;', 'const DEV = %s;' % ('true' if dev else 'false'))
    parts.append(s.rstrip('\n'))
js = '\n'.join(parts) + '\n'
assert '/*WORLD*/' not in js and '/*TEXDATA*/' not in js
script = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>\n(() => {\n\'use strict\';\n' + js + '})();\n</script>\n'
page = open(os.path.join(HERE, 'page.html'), encoding='utf-8').read()
assert '<!--SCRIPTS-->' in page
html = page.replace('<!--SCRIPTS-->\n', script)
if mode == 'web':
    # the public website: a full HTML document with sharing tags, icons and the reset the Claude page skeleton normally provides
    web_head = open(os.path.join(HERE, 'web_head.html'), encoding='utf-8').read().replace('{{SITE_URL}}', os.environ.get('AFC_SITE_URL', '').rstrip('/'))
    out = os.path.join(ROOT, 'dist'); os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(web_head + html + '\n</body>\n</html>\n')
    import shutil
    for f in sorted(os.listdir(os.path.join(ROOT, 'web'))): shutil.copy(os.path.join(ROOT, 'web', f), os.path.join(out, f))
    print('built web', len(html.encode()), 'bytes -> dist/index.html')
    sys.exit(0)
open(os.path.join(ROOT, 'afconcity-quest.html'), 'w', encoding='utf-8').write(html)
head = open(os.path.join(HERE, 'skeleton_head.html'), encoding='utf-8').read()
open(os.path.join(ROOT, 'afconcity-local.html'), 'w', encoding='utf-8').write(head + html + '\n\n</body></html>')
if os.path.isdir(os.path.dirname(SP)):
    os.makedirs(SP, exist_ok=True)
    open(os.path.join(SP, 'game3.js'), 'w', encoding='utf-8').write('(() => {\n' + js + '})();\n')
print('built', len(html.encode()), 'bytes', 'DEV' if dev else '')
