$('.highlight-input').textareacolorcoding(
	{
		onSelectionChange: function (selection) {},
		transparentText: false,
		debug: true,
		autoExpandHeight: false
	});

$('#highlightTextarea').on('click', function() {
	var colorCodingObj = $('textarea.highlight-input').data('textareacolorcoding');
	var sel = colorCodingObj.getCurrentSelection();
	
	colorCodingObj.highlightText(sel.startIndex, sel.endIndex);
});


$('#highlightInput').on('click', function() {
	var colorCodingObj = $('input.highlight-input').data('textareacolorcoding');
	var sel = colorCodingObj.getCurrentSelection();
	
	colorCodingObj.highlightText(sel.startIndex, sel.endIndex);
});

