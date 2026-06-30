from django.db import models
from accounts.models import User
from projects.models import Project


class Bug(models.Model):

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='bugs'
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='open'
    )
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='medium'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium'
    )

    # AI fields
    ai_status = models.BooleanField(default=False)
    predicted_severity = models.CharField(max_length=20, null=True, blank=True)
    roast_commentary = models.TextField(null=True, blank=True)
    solution_suggestion = models.TextField(null=True, blank=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reported_bugs'
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_bugs'
    )
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_bugs'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title}"

    class Meta:
        db_table = 'bugs'
        ordering = ['-created_at']


class BugComment(models.Model):
    bug = models.ForeignKey(
        Bug,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='bug_comments'
    )
    comment_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.email} on Bug #{self.bug.id}"

    class Meta:
        db_table = 'bug_comments'
        ordering = ['created_at']


class BugHistory(models.Model):
    bug = models.ForeignKey(
        Bug,
        on_delete=models.CASCADE,
        related_name='history'
    )
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='bug_changes'
    )
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bug #{self.bug.id}: {self.old_status} → {self.new_status}"

    class Meta:
        db_table = 'bug_history'
        ordering = ['changed_at']

class Release(models.Model):
    version = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='releases'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_releases'
    )
    released_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project.name} - v{self.version}"

    class Meta:
        db_table = 'releases'

class ReleaseBug(models.Model):
    release = models.ForeignKey(
        Release,
        on_delete=models.CASCADE,
        related_name='release_bugs'
    )
    bug = models.ForeignKey(
        Bug,
        on_delete=models.CASCADE,
        related_name='release_bugs'
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'release_bugs'
        unique_together = ['release', 'bug']

    def __str__(self):
        return f"Release#{self.release.id} - Bug #{self.bug.id}"

class QAResult(models.Model):
    RESULT_CHOICES = [
        ('pass', 'Pass'),
        ('fail', 'Fail'),
        ('blocked', 'Blocked'),
    ]

    bug = models.ForeignKey(
        Bug,
        on_delete=models.CASCADE,
        related_name='qa_results'
    )
    qa = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='qa_results'
    )
    result = models.CharField(max_length=10, choices=RESULT_CHOICES)
    notes = models.TextField(null=True, blank=True)
    tested_at = models.DateTimeField(auto_now_add=True)