console.log('injected');

$(function () {
    var bind_submit_on_form = function() {
        var form_sel = 'form[action="/signin"]';
        var $form = $(form_sel);
        if ($form.length == 0) {
            console.error('cannot find form by: ' + form_sel);
            return;
        }
        $form.submit(function(e) {
            // DEBUG
            //e.preventDefault();

            var nameInput = $form.find('input').eq(0);
            if (nameInput.length == 0) {
                e.preventDefault();
                alert('cannot find username input in form');
                return;
            }
            var name = nameInput.val();

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
    };
    bind_submit_on_form();
});
