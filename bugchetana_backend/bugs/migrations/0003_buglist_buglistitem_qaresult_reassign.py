from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_project_description_projectmember_assigned_by'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('bugs', '0002_bug_qa_fields_and_statuses'),
    ]

    operations = [
        migrations.CreateModel(
            name='BugList',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_bug_lists', to=settings.AUTH_USER_MODEL)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bug_lists', to='projects.project')),
            ],
            options={
                'db_table': 'bug_lists',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='BugListItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bug', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='list_items', to='bugs.bug')),
                ('bug_list', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='bugs.buglist')),
            ],
            options={
                'db_table': 'bug_list_items',
                'unique_together': {('bug_list', 'bug')},
            },
        ),
        migrations.AlterField(
            model_name='qaresult',
            name='result',
            field=models.CharField(choices=[('pass', 'Pass'), ('fail', 'Fail'), ('blocked', 'Blocked'), ('reassign', 'Reassign')], max_length=10),
        ),
    ]
