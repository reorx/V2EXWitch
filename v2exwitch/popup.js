
var bg = chrome.extension.getBackgroundPage();
console.log('bg account', bg.account);

function loadOptions() {
    var refresh_time = bg.account.options.refresh_time / (60 * 1000),
        switch_behavior = bg.account.options.switch_behavior;

    $('input[name="refresh_time"]').val(refresh_time);
    $('input[name="switch_behavior"]').each(function() {
        if ($(this).val() == switch_behavior) {
            $(this).attr('checked', true);
        } else {
            $(this).attr('checked', false);
        }
    });
}

function saveOptions() {
    refresh_time = $('input[name="refresh_time"]').val() * 1000 * 60;
    if (refresh_time != bg.account.options.refresh_time) {
        bg.account.options.refresh_time = refresh_time;
        bg.restartDaemon();
    } else {
        bg.account.options.refresh_time = refresh_time;
    }
    bg.account.options.switch_behavior = $('input[name="switch_behavior"]:checked').val();
    bg.saveAccount();
}

function mainUI() {
    var users_ul = $('.users ul');
    users_ul.empty();
    if (bg.account.users.length) {
        $('.nouser').hide();
        _.each(bg.account.users, function(user) {
            var li = $('<li></li>');
            if (bg.account.current_user == user.username) {
                li.addClass('active');
            }

            var a_username = $('<a href="#" class="username"></a>').text(user.username);
            a_username.click(function() {
                bg.switchUser(user.username);

                if (bg.account.options.switch_behavior == 'pop') {
                    console.log('pop');
                    chrome.tabs.create({url: bg.top_url, selected: true});
                } else {
                    console.log('reload');
                    chrome.tabs.query({active : true, currentWindow: true}, function(tabs) {
                        tab = tabs[0];
                        console.log('tab', tab, tab.url);
                        if (tab.url.match(bg.top_url)) {
                            chrome.tabs.reload(tab.id);
                            chrome.tabs.update(tab.id, {active: true});
                        } else {
                            window.close();
                        }
                    });
                }
            });
            li.append(a_username);

            var noti = $('<span class="noti"></span>').text(user.unread_count?user.unread_count:'');
            li.append(noti);

            var a_remove = $('<a href="#" class="remove">⨯</a>').click(function() {
                bg.removeUser(user.username);
                // $(this).parent().remove();
                // window.focus();
                mainUI();
            });
            li.append(a_remove);

            users_ul.append(li);
        });
    } else {
        console.log('no user');
        $('.nouser').show();
    }

    $('.options').hide();
    $('.main').show().focus();
}

function optionsUI() {

    $('.main').hide();
    $('.options').show();
}

function newUser() {
    chrome.cookies.remove(bg.auth_cookie_args);
    chrome.tabs.create({url: bg.signin_url, selected: true});
}

$(function() {
    // main ui elements
    $('a.new_user').click(function() {
        newUser();
    });
    $('a.options_ui').click(function() {
        loadOptions();
        optionsUI();
    });

    // DEBUG
    // $('a.get_noti').click(function() {
    //     bg.feedDaemon();
    // });

    // options ui elements
    $('input[type="number"]').numeric({ decimal: false, negative: false });
    $('a.done').click(function() {
        saveOptions();
        mainUI();
    });

    mainUI();
});
