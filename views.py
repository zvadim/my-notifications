def notifications_num_unread(request):
    """
    Get number of unread notifications
    """
    user = request.user
    notifications_unread = 0
    last_id = None

    if user.is_authenticated():
        notifications_unread = user.my_notifications.filter(unread=True).count()
        last_id = getattr(user.my_notifications.first(), 'pk', None)

    return json_response({
        'notifications_unread': notifications_unread,
        'notifications_last_id': last_id,
        'disable_polling': getattr(settings, 'NOTIFICATIONS_DISABLE_POLLING', False)
    })
    
class NotificationsQuickListView(ListView):
    model = Notification
    paginate_by = 20
    is_new = False  # if True - return new notifications (pk>GET['id']), else - return old (pk<GET['id'])
    object_list = None

    def get_queryset(self):
        if not self.request.user.is_authenticated():
            return self.model.objects.none()

        qs = self.model.objects.filter(
            recipient=self.request.user,
        )

        notification_id = self.request.GET.get('id', None)
        if notification_id:
            action = self.request.GET.get('get', 'older')
            if action == 'older':
                qs = qs.filter(pk__lt=notification_id)
            else:
                self.is_new = True
                qs = qs.filter(pk__gt=notification_id).reverse()

        return qs

    @staticmethod
    def localize_datetime(dtime):
        """Makes DateTimeField value UTC-aware and returns datetime string localized
        in user's timezone in ISO format.
        """
        return dtime.astimezone(get_current_timezone()).strftime("%d %b %Y, %H:%M")

    def get(self, request, *args, **kwargs):
        self.object_list = self.get_queryset()
        context = self.get_context_data()

        response = json_response({
            'last_page': bool(context['page_obj'].number == context['page_obj'].paginator.num_pages),
            'is_new': self.is_new,
            'objects_list': list({
                'id': obj.id,
                'description': mark_safe(obj.description),
                'dt': self.localize_datetime(obj.create_dt),
                'link': obj.get_url() if obj.has_access(request.user) else None,
                'unread': obj.unread,
                'clicked': obj.clicked,
                'type': obj.type,
            } for obj in context['object_list'])
        })

        for n in context['object_list']:
            n.unread = False
            n.save()

        return response

notifications_list = NotificationsQuickListView.as_view()


def notification_redirect(request, instance_pk):
    notification = get_object_or_404(request.user.my_notifications, pk=instance_pk)
    notification.clicked = True
    notification.save()
    url = notification.get_real_url()
    return redirect(url) if url else HttpResponseForbidden('403 Forbidden')


def notification_set_read(request, instance_pk):
    notification = get_object_or_404(request.user.my_notifications, pk=instance_pk)
    notification.unread = False
    notification.save()
    return HttpResponse('OK')
