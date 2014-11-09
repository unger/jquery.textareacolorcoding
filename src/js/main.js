$('textarea').each(function() {
	this.spellcheck = false;
});

$('textarea').textareacolorcoding({
	onSelectionChange: function (selection) {
	}
});

$('#highlightText').on('click', function() {
	var colorCodingObj = $('textarea').data('textareacolorcoding');
	var sel = colorCodingObj.getCurrentSelection();
	
	colorCodingObj.highlightText(sel.startIndex, sel.endIndex);
});

