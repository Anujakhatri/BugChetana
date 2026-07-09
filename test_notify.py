import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bugchetana_backend.settings")
django.setup()

from projects.models import Project
from accounts.models import User, Role

projects = Project.objects.all()
if projects.exists():
    project = projects.first()
    print("Project:", project.name)
    print("All Members:", [(m.user.email, m.user.role.name) for m in project.members.all()])
    
    dev_members = project.members.filter(user__role__name='Developer')
    print("Dev Members:", [(m.user.email, m.user.role.name) for m in dev_members])

