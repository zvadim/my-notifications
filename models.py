from django.core.urlresolvers import reverse
from django.db import models


class Notification(models.Model):

    class Type(object):
        UNDEFINED = 'undefined'
        CREATE = 'create'
        UPDATE = 'update'
        
        CHOICES = (
            (UNDEFINED, 'Undefined'),
            (CREATE, 'Created'),
            (UPDATE, 'Updated'),
        )

    recipient = models.ForeignKey(User, related_name='my_notifications')
    description = models.TextField(u'Description')
    type = models.CharField(choices=Type.CHOICES, default=Type.UNDEFINED, max_length=64)
    link = models.CharField(u'Link', max_length=128, blank=True)  # by default is used `content_object.get_url()`
    unread = models.BooleanField(u'Unread?', default=True)
    clicked = models.BooleanField(u'Clicked?', default=False)
    create_dt = models.DateTimeField(u'Date', auto_now_add=True)

    content_type = models.ForeignKey(ContentType, blank=True, null=True)
    object_id = models.PositiveIntegerField(db_index=True, blank=True, null=True)
    content_object = GenericForeignKey('content_type', 'object_id')

    def __unicode__(self):
        return u'%s: %s' % (self.recipient, self.description)

    def get_url(self):
        # Go to notification's page through redirect. It makes possible to mark notification as `clicked`
        return reverse('notification_redirect', args=(self.pk,))

    class Meta:
        ordering = ('-create_dt',)
