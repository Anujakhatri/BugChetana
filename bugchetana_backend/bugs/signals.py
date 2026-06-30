from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Bug, BugHistory

@receiver(pre_save, sender=Bug)
def capture_old_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_bug = Bug.objects.get(pk=instance.pk)
            instance._old_status = old_bug.status
        except Bug.DoesNotExist:
            instance._old_status = 'created'
    else:
        instance._old_status = 'created'

@receiver(post_save, sender=Bug)
def track_bug_history(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_old_status', 'created')
    
    # Track only if newly created or if status actually changed
    if created or (old_status != instance.status):
        # The view should attach _changed_by to the instance before saving.
        # Fallback to created_by if it's a new bug.
        changed_by = getattr(instance, '_changed_by', None)
        if not changed_by and created:
            changed_by = instance.created_by

        BugHistory.objects.create(
            bug=instance,
            changed_by=changed_by,
            old_status=old_status,
            new_status=instance.status
        )
