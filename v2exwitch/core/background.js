console.log('loading background.js');

var account;
var account_key = 'V2EXWITCH_ACCOUNT';
var top_url = 'http://www.v2ex.com/';
var auth_cookie_args = {
    url: top_url,
    name: 'auth'
};
var signin_username = '';
var signin_url = 'http://www.v2ex.com/signin';
var notifications_url = 'http://www.v2ex.com/notifications';
var daemon_id = null;

// DEBUG
// delete localStorage[account_key];

chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
    // DEBUG
    // console.log('msg', msg, 'sender', sender);

    switch(msg.from) {
        case 'signin':
            signin_username = msg.content;
            break;
        case 'notifications':
            readNoti(msg.content);
            break;
    }
    sendResponse(msg.from, 'ok');
});

// /signin listener
chrome.webRequest.onBeforeRedirect.addListener(function(details) {
    addUser();
}, { urls: [signin_url] });

function loadAccount() {
    account = JSON.parse(localStorage.getItem(account_key));
    if (!account) {
        account = {
            users: [],
            current_user: '',
            options: {
                refresh_time: 1000 * 60 * 5,
                switch_behavior: 'reload' // 'pop'
            }
        };
    }
    console.log('account loaded');
}

loadAccount();


function refreshAll() {
    chrome.windows.getAll({populate: true}, function(windows) {
        _.each(windows, function(_window) {
            _.each(_window.tabs, function(tab) {
                if (tab.url.match(top_url)) {
                    chrome.tabs.reload(tab.id);
                }
            });
        });
    });
}

function switchUser(username) {
    var user = getUser(username);
    if (!user) {
        console.log('switch user failed, get no user');
        return;
    }
    _.each(user.cookies, function(cookie) {
        // Make cookie effective on all v2ex domains
        // cookie.domain = 'v2ex.com';

        chrome.cookies.set(cookie);
    });
    account.current_user = user.username;

}

function getUser(username) {
    return _.find(account.users, function(_user) { return _user.username == username; });
}

function addUser() {
    if (!signin_username) {
        console.log('addUser failed, no username');
        return;
    }

    chrome.cookies.get(auth_cookie_args, function (cookie) {
        if (!cookie || !cookie.value) {
            console.log('addUser failed, no auth cookie or its value', cookie);
            return;
        }

        var auth_cookie = {};
        _.extend(auth_cookie, cookie);
        delete auth_cookie.storeId;
        delete auth_cookie.domain;
        delete auth_cookie.hostOnly;
        delete auth_cookie.session;
        auth_cookie.url = top_url;

        var user = getUser(signin_username);
        if (!user) {
            user = {
                username: signin_username,
                cookies: [auth_cookie],
                feed_url: '',
                last_noti_id: '',
                unread_count: 0,
                empty_noti: false
            };
            account.users.push(user);
        } else {
            user.cookies = [auth_cookie];
        }

        account.current_user = user.username;
        saveAccount();

        getUserFeedUrl(user);
    });
}

function removeUser(username) {
    var pos = null;
    _.each(account.users, function(user, index) {
        if (user.username == username) {
            pos = index;
        }
    });
    if (pos === null) {
        console.log('failed to removeUser, cound not find that user');
        return;
    }

    account.users.splice(pos, 1);

    if (account.current_user == username) {
        chrome.cookies.remove(auth_cookie_args);
        account.current_user = '';
    }
    saveAccount();
}

function saveAccount() {
    var json = JSON.stringify(account);
    console.log('account saved');
    localStorage[account_key] = json;
}

function getUserFeedUrl(user) {
    /*
     * NOTE when /notifications is visited, unread count will be cleaned to 0
     */
    $.get(notifications_url, function(resp) {
        var re_url = new RegExp('input type="text" value="(.+)" class="sll"');
        var match_url = re_url.exec(resp);
        user.feed_url = match_url[1];

        console.log('got feed url');

        saveAccount();

        // var re_unread = new RegExp('notifications" class="fade">(\\d+) 条未读提醒');
        // var match_unread = re_unread.exec(resp);
        // var unread_count = parseInt(match_unread[1], 10);

        getFeed(user);
    });
}

function readNoti(username) {
    user = getUser(username);

    // DEBUG
    // console.log(user.username, 'visited notifications');

    user.unread_count = 0;
    user.last_noti_id = '';
    getFeed(user);
}

function showUnread() {
    var all_count = 0;
    _.each(account.users, function(user) {
        all_count = all_count + user.unread_count;
    });
    console.log('all unread', all_count);

    if (all_count > 0) {
        chrome.browserAction.setBadgeText({text: all_count.toString()});
    } else {
        chrome.browserAction.setBadgeText({text: ''});
    }
}

function getEntryId(entry) {
    return entry.getElementsByTagName('id')[0].firstChild.nodeValue;
}

function getFeed(user) {
    $.get(user.feed_url, function(xml) {
        var entrys = xml.getElementsByTagName('entry');

        console.log('got feed xml, entrys', entrys.length);

        if (!entrys.length) {
            user.empty_noti = true;
            saveAccount();
            return;
        }

        if (user.last_noti_id) {
            var has_unread = false;
            for (var i = 0; i < entrys.length; ++i) {
                var id = getEntryId(entrys[i]);
                if (id == user.last_noti_id) {
                    console.log('found unread on', user.username, i, id);

                    user.unread_count = i;
                    saveAccount();

                    has_unread = true;
                    break;
                }
            }

            if (has_unread) showUnread();
        } else {
            console.log('no last noti id, assign');
            user.last_noti_id = getEntryId(entrys[0]);
            saveAccount();
            showUnread();
        }

    });
}

function feedDaemon() {
    _.each(account.users, function(user) {
        if (!user.feed_url) {
            console.log('NO FEED URL!');
        } else {
            getFeed(user);
        }
    });
}

function startDaemon() {
    console.log('start daemon');
    feedDaemon();
    daemon_id = setInterval(feedDaemon, account.options.refresh_time);
}

function restartDaemon() {
    if (daemon_id !== null) {
        console.log('stop interval');
        clearInterval(daemon_id);
    }
    startDaemon();
}

startDaemon();
