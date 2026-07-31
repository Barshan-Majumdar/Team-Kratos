import os
import subprocess

def get_git_file(ref):
    return subprocess.check_output(['git', 'show', f'{ref}:backend/prisma/schema.prisma']).decode('utf-8')

def parse_prisma(content):
    blocks = {}
    header = []
    current_block = None
    for line in content.split('\n'):
        if line.startswith('generator ') or line.startswith('datasource '):
            current_block = line.split()[1]
            blocks[current_block] = {'type': line.split()[0], 'lines': [line]}
        elif line.startswith('model ') or line.startswith('enum '):
            current_block = line.split()[1]
            blocks[current_block] = {'type': line.split()[0], 'lines': [line]}
        elif current_block:
            blocks[current_block]['lines'].append(line)
            if line.strip() == '}':
                current_block = None
        else:
            if line.strip():
                header.append(line)
    return header, blocks

head_content = get_git_file('0384fcb')
phase_content = get_git_file('7718e2a')

head_h, head_b = parse_prisma(head_content)
phase_h, phase_b = parse_prisma(phase_content)

all_names = list(head_b.keys())
for name in phase_b:
    if name not in all_names:
        all_names.append(name)

with open('backend/prisma/schema.prisma', 'w', encoding='utf-8') as out:
    for line in head_h:
        out.write(line + '\n')
    for name in all_names:
        if name in head_b and name in phase_b:
            out.write(head_b[name]['lines'][0] + '\n') # model Name {
            seen_fields = set()
            for line in head_b[name]['lines'][1:-1]:
                if line.strip() and not line.strip().startswith('@@'):
                    seen_fields.add(line.strip().split()[0])
                out.write(line + '\n')
            for line in phase_b[name]['lines'][1:-1]:
                if line.strip() and not line.strip().startswith('@@'):
                    field = line.strip().split()[0]
                    if field not in seen_fields:
                        out.write(line + '\n')
                        seen_fields.add(field)
                elif line.strip().startswith('@@'):
                    if line not in head_b[name]['lines']:
                        out.write(line + '\n')
            out.write("}\n\n")
        elif name in head_b:
            for line in head_b[name]['lines']:
                out.write(line + '\n')
            out.write("\n")
        else:
            for line in phase_b[name]['lines']:
                out.write(line + '\n')
            out.write("\n")
