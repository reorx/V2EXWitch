// console.log('injected');

$(function () {
    $('form').submit(function(e) {
        // DEBUG
        //e.preventDefault();

        var name = $('input[name="u"]').val();
        if (name) {
            var msg = {
                from: 'signin',
                content: name
            };
            chrome.extension.sendMessage(msg, function(resp) {
                // DEBUG
                // console.log('resp', resp);
            });
        }
    });
});
