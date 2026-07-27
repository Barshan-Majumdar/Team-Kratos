import os
files = ['backend/prisma/schema.prisma', 'backend/src/controllers/leaveController.js', 'backend/src/routes/leave.js', 'backend/src/utils/emailTemplates.js', 'backend/src/workers/cronJobs.js', 'frontend/src/App.jsx', 'frontend/src/components/ProtectedRoute.jsx', 'frontend/src/components/layout/Sidebar.jsx', 'frontend/src/pages/Dashboard.jsx']
for f in files:
    if os.path.exists(f):
        lines = open(f, encoding='utf-8').read().split('\n')
        in_conflict = False
        has_conflict = False
        for l in lines:
            if l.startswith('<<<<<<<'):
                if not has_conflict:
                    print('\n--- ' + f + ' ---')
                    has_conflict = True
                in_conflict = True
                print(l)
            elif l.startswith('======='):
                print(l)
            elif l.startswith('>>>>>>>'):
                print(l)
                in_conflict = False
            elif in_conflict:
                print(l)
