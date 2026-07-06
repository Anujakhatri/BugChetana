from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bugs', '0001_initial'),
        ('accounts', '0002_user_failed_login_attempts_user_locked_until'),
    ]

    operations = [
        migrations.AddField(
            model_name='bug',
            name='qa_comment',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='bug',
            name='reviewed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='bug',
            name='reviewed_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='reviewed_bugs',
                to='accounts.user',
            ),
        ),
        migrations.AlterField(
            model_name='bug',
            name='status',
            field=models.CharField(
                choices=[
                    ('open', 'Open'),
                    ('in_progress', 'In Progress'),
                    ('resolved', 'Resolved'),
                    ('closed', 'Closed'),
                    ('failed', 'Failed'),
                    ('resubmitted', 'Resubmitted'),
                ],
                default='open',
                max_length=20,
            ),
        ),
    ]
