// console.log('injected');

$(function () {
    var msg = {
        from: 'notifications',
        content: $('#Rightbar .box .bigger a').text()
    };
    chrome.extension.sendMessage(msg, function(resp) {
        // DEBUG
        // console.log('resp', resp);
    });
});
