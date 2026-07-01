"""
One-time cleanup: remove invalid project_members rows.

Removes entries where:
  1. The user is the release_manager of that project (access via release_manager_id).
  2. The user is a Django superuser.

Safe to run multiple times (idempotent).

Usage (from repo root):
    python scripts/fix_project_members.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, 'bugchetana_backend')
sys.path.insert(0, BACKEND)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bugchetana_backend.settings')

import django

django.setup()

from projects.models import ProjectMember


def main():
    to_remove = []

    for pm in ProjectMember.objects.select_related('user', 'project').iterator():
        reasons = []
        if pm.project.release_manager_id == pm.user_id:
            reasons.append('release_manager of project')
        if pm.user.is_superuser:
            reasons.append('superuser')
        if reasons:
            to_remove.append((pm, reasons))

    if not to_remove:
        print('No invalid project_members entries found. Nothing to remove.')
        return

    print(f'Removing {len(to_remove)} invalid project_members entr{"y" if len(to_remove) == 1 else "ies"}:\n')

    affected_users = {}
    for pm, reasons in to_remove:
        label = f'{pm.user.email} (id={pm.user_id})'
        affected_users.setdefault(label, []).append(
            f'project "{pm.project.name}" (id={pm.project_id}) — {", ".join(reasons)}'
        )
        pm.delete()

    print('Summary')
    print('-------')
    print(f'Total removed: {len(to_remove)}')
    print(f'Users affected: {len(affected_users)}\n')

    for user_label, projects in sorted(affected_users.items()):
        print(f'  {user_label}:')
        for detail in projects:
            print(f'    - removed from {detail}')

    print('\nDone.')


if __name__ == '__main__':
    main()
