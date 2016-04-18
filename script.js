var app = app || {};
app.notifications = app.notifications || {};

/**
 * Module declaration
 */
(function (ns) {
    ns.ActiveBlocksList = [];

    ns.NumberOfLastNotifications = 60;
    ns.UpdateTimeOut = 5000;

    ns.NotificationCtrl = function(el) {
        this.el = el;
        var root = this;

        app.notifications.ActiveBlocksList.push(root);

        this.update_badge_url = $(this.el).data('badge-url');
        this.update_list_url = $(this.el).data('update-url');
        this.see_all_url = $(this.el).data('see-all-url');

        this.loading = false;
        this.dropdown_open = false;

        this.top_id = undefined;
        this.bottom_id = undefined;
        this.list_total_height = 0;
        this.last_page = false;
        this.update_bagde_timer_id = undefined;
        this.number_of_unread = 0;

        // DOM
        this.loader = $('<a/>').addClass('notification-loader').append($('<div/>'));
        this.badge = $('<span/>').addClass('badge').text('0').hide();
        this.button = $('<a data-toggle="dropdown"></a>')
            .addClass('dropdown-toggle notifications-button')
            .append($('<i/>').addClass('pe-7s-bell pe-4x pe-va'))
            .append(this.badge)
            .append($('<b/>').addClass('caret'))
            .dropdown()
            .appendTo(this.el);

        this.list_container = $('<div/>').addClass('notifications-list');
        this.box = $('<div/>').addClass('dropdown-menu notifications-box')
                .append($('<div/>').addClass('pe-7s-angle-right pe-4x pe-va'))
                .append($('<div/>').addClass('notifications-header pe-7s-bell pe-4x pe-va').text('Notifications'))
                .append(this.list_container)
                .append($('<div/>').addClass('notifications-footer').append($('<div/>'))
                .append($('<span/>').addClass('pe-7s-angle-down'))
                .append($('<a/>').text('See all notifications').attr('href', this.see_all_url)));
        this.box.appendTo(this.el);

        // oMessages badge
        root.omessages_badge = $('.omessage-badge');

        // Handlers
        this.dropdown_shown_handler = function() {
            root.dropdown_open = true;
            root.badge.fadeOut();
        };
        this.dropdown_hidden_handler = function() {
            root.dropdown_open = false;
        };
        this.button_click_handler = function() {
            root.updateList(true);
            root.button.off('.getlist');
        };
        this.list_container_scroll_handler = function() {
            // scroll to bottom of the div
            if (root.list_container.scrollTop() + root.list_container.height() - root.list_total_height > 0) {
                if (!root.loading) {
                    root.updateList(true);
                }
            }
        };
        this.resize_window = function() {
            root.updatePositionSeeAll();
            var window_height = root.window_height();
            if (root.totalHeight > window_height) {
                root.list_container.height( window_height );
            }
        };

        // Events
        this.el.on('shown.bs.dropdown', this.dropdown_shown_handler);
        this.el.on('hidden.bs.dropdown', this.dropdown_hidden_handler);
        this.button.on('click.getlist', this.button_click_handler);
        this.list_container.on('scroll', this.list_container_scroll_handler);
        $(window).on('resize', this.resize_window);

        // Callbacks
        this.update_badge_callback = function(data) {

            // Update Notification's badge
            root.number_of_unread = data.notifications_unread;
            if (root.number_of_unread > 0 && !root.dropdown_open) { // don't show badge if notification panel is open
                root.badge.text(root.number_of_unread);
                root.badge.fadeIn();
            } else {
                root.badge.fadeOut();
            }

            if (data.notifications_last_id > root.top_id) {
                if (root.dropdown_open) {
                    root.updateList(false); // get new notifications
                }
            }

            // Update oMessages badge
            if (data.omessages_unread > 0) {
                root.omessages_badge.text(data.omessages_unread);
                root.omessages_badge.fadeIn();
            } else {
                root.omessages_badge.fadeOut();
            }

            if (!data.disable_polling) {
                root.update_bagde_timer_id = setTimeout(root.updateBadgeJson, ns.UpdateTimeOut);
            } else {
                root.update_bagde_timer_id = undefined;
            }
        };
        this.update_list_callback = function(data) {
            root.hide_loader();
            var list_with_new = data.is_new;
            if (data.objects_list.length) {
                $.each(data.objects_list, function() {
                    var new_li = $('<a/>')
                        .attr('href', this.link)
                        .data('nid', this.id)
                        .html(this.description)
                        .addClass('type-' + this.type)
                        .prepend($('<div/>').text(this.dt).addClass('notification-date'))
                        .prepend($('<div/>').addClass('notification-icon'))
                        .hide();

                    if (this.unread) {
                        new_li.addClass('unread');
                    }

                    if (!this.clicked) {
                        new_li.addClass('new');
                    }

                    if (list_with_new === false) {
                        new_li.appendTo(root.list_container);
                    } else {
                        new_li.prependTo(root.list_container);
                    }
                    new_li.fadeIn();

                    if (!root.top_id || this.id > root.top_id) {
                        root.top_id = this.id;
                    } else if (!root.bottom_id || this.id < root.bottom_id) {
                        root.bottom_id = this.id;
                    }
                    root.updatePositionSeeAll();
                });
            }

            if (list_with_new === false && data.last_page) {
                root.last_page = true;
            }
            else if (root.number_of_unread == 0 && root.list_container.find('a').length > ns.NumberOfLastNotifications) {
                    root.last_page = true; // show only last N notifications or all unread
            }

            // recount list total height
            root.list_total_height = 0;
            root.list_container.find('a').each(function(i, elem) {
                root.list_total_height += $(elem).height();
            });

            //Height of all children of root.list_container
            root.totalHeight = 0;
            root.list_container.children().each(function() {
                root.totalHeight = root.totalHeight + $(this).outerHeight();
            });
            var window_height = root.window_height();
            if (root.totalHeight > window_height) {
                root.list_container.height( window_height );
            }
        };

        // Methods
        this.window_height = function() {
            return $(window).height() - 120;
        };
        this.show_loader_on_top = function() {
            root.loading = true;
            root.loader.prependTo(root.list_container).fadeIn();
        };
        this.show_loader_on_bottom = function() {
            root.loading = true;
            root.loader.appendTo(root.list_container).fadeIn();
        };
        this.hide_loader = function() {
            root.loading = false;
            root.loader.fadeOut();
        };

        this.disable = function() { // disable this notifications block
            // Firstly disable badge updater
            if (root.update_bagde_timer_id != undefined) {
                clearTimeout(root.update_bagde_timer_id);
            }
            // Delete from InstalledViewsList
            var index = app.notifications.ActiveBlocksList.indexOf(root);
            app.notifications.ActiveBlocksList.splice(index, 1);

            // and delete block content
            root.el.html('');
        };

        // Update badge
        this.updateBadgeJson = function() {
            $.getJSON(root.update_badge_url, root.update_badge_callback);
        };
        this.updateBadge = function() {
            root.updateBadgeJson();
        };

        // Update notifications list
        // if get_old == false - try to get new notifications, else old ones
        this.updateList = function(get_old) {
            var url = root.update_list_url;
            if (get_old === true) {
                if (root.bottom_id) { // not the first time
                    if (root.last_page) { // all notifications were already received
                        return;
                    }

                    root.show_loader_on_bottom();
                    url += '?get=older&id=' + root.bottom_id;
                }
            } else {
                root.show_loader_on_top();
                url += '?get=newer&id=' + root.top_id;
            }
            $.getJSON(url, root.update_list_callback);
        };

        // Update position of button "See all notification"
        this.updatePositionSeeAll = function() {
            if (root.list_container.height() > root.window_height()) {
                if (!root.box.hasClass('full-height')) {
                    root.box.addClass('full-height');
                }
            }
            else if (root.box.hasClass('full-height')) {
                root.box.removeClass('full-height');
            }
        };
    };

    // Disable all notification blocks
    ns.disable = function() {
        $.each(app.notifications.ActiveBlocksList, function() {
            this.disable();
        });
        console.log('Notifications disabled');
    };
})(app.notifications);

/**
 * Module initialization and usage
 * */
$(function (){
    var ns = app.notifications;

    var container = $('#header_notifications');
    if (container.length) {
        var notification = new ns.NotificationCtrl(container);
        notification.updateBadge();
    }
});
