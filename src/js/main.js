$('textarea').textareacolorcoding();

$('#highlightText').on('click', function() {
	var colorCodingObj = $('textarea').textareacolorcoding().data('textareacolorcoding');
	colorCodingObj.highlightText(6, 10);
});