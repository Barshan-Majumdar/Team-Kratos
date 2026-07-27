import os
import re

files = [
    'backend/prisma/schema.prisma',
    'backend/src/controllers/leaveController.js',
    'backend/src/routes/leave.js',
    'backend/src/utils/emailTemplates.js',
    'backend/src/workers/cronJobs.js',
    'frontend/src/App.jsx',
    'frontend/src/components/ProtectedRoute.jsx',
    'frontend/src/components/layout/Sidebar.jsx',
    'frontend/src/pages/Dashboard.jsx'
]

def resolve_schema(head, phase):
    lines_head = head.split('\n')
    lines_phase = phase.split('\n')
    out = []
    seen = set()
    for l in lines_head + lines_phase:
        if not l.strip(): continue
        field = l.strip().split()[0]
        if field not in seen:
            seen.add(field)
            out.append(l)
    return '\n'.join(out) + '\n'

def replacer(match):
    head = match.group(1)
    phase = match.group(2)
    return head + '\n' + phase + '\n'

def replacer_schema(match):
    head = match.group(1)
    phase = match.group(2)
    return resolve_schema(head, phase)

for f in files:
    if not os.path.exists(f): continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if '<<<<<<<' not in content:
        continue

    if f.endswith('.prisma'):
        new_content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> phase-4&5\n?', replacer_schema, content, flags=re.DOTALL)
    else:
        new_content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> phase-4&5\n?', replacer, content, flags=re.DOTALL)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(new_content)
