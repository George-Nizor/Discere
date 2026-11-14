#!/usr/bin/env python3
"""Usage: copy-check.py BUNDLE.json PACK_TEXT_DIR [-n 8] [-q]
Finds runs of N+ words (lowercase, punctuation stripped) in the bundle's text that also appear in
any pack text file. Question `extracts` are skipped. Prints each hit and a per-lesson percentage."""
import json, re, sys, glob, os, collections
args=[a for a in sys.argv[1:] if not a.startswith('-')]
N=8
if '-n' in sys.argv: N=int(sys.argv[sys.argv.index('-n')+1]); args.remove(str(N))
quiet='-q' in sys.argv
bundle,pack=args[0],args[1]
def toks(s):
    s=re.sub(r'\[\[([^|\]]*)\|[^\]]*\]\]',r'\1',s)
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?",s.lower().replace('’',"'"))
pt=[]
for f in sorted(glob.glob(os.path.join(pack,'*.txt'))):
    pt.append((os.path.basename(f),toks(open(f,errors='ignore').read())))
grams={}
for name,t in pt:
    for i in range(len(t)-N+1): grams.setdefault(tuple(t[i:i+N]),name)
b=json.load(open(bundle))
fields=[]  # (group, path, text)
def walk(o,group,path):
    if isinstance(o,dict):
        for k,v in o.items():
            if k in('extracts','extract'): continue
            walk(v,group,path+'.'+k)
    elif isinstance(o,list):
        for i,v in enumerate(o): walk(v,group,f'{path}[{i}]')
    elif isinstance(o,str) and ' ' in o and not path.endswith(('.id','.kind','.type')):
        fields.append((group,path,o))
for k,v in b.items():
    if k=='lessons':
        for l in v: walk(l,'lesson:'+l['id'],'')
    elif k=='sources': continue
    else: walk(v,k,k)
tot=collections.Counter(); cop=collections.Counter(); hits=0
for g,p,t in fields:
    tk=toks(t); tot[g]+=len(tk)
    mark=[False]*len(tk); runs=[]
    for i in range(len(tk)-N+1):
        if tuple(tk[i:i+N]) in grams:
            for j in range(i,i+N): mark[j]=True
    # collect maximal runs
    i=0
    while i<len(tk):
        if mark[i]:
            j=i
            while j<len(tk) and mark[j]: j+=1
            runs.append(' '.join(tk[i:j])); i=j
        else: i+=1
    cop[g]+=sum(mark)
    for r in runs:
        hits+=1
        if not quiet: print(f'[{g}] {p}: ({len(r.split())}w) {r}')
print(f'\nhits: {hits}')
for g in sorted(tot):
    print(f'{g:55s} {cop[g]:5d}/{tot[g]:5d} = {100*cop[g]/max(tot[g],1):5.1f}%')
