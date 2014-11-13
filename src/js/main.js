var debug = true;

$('.highlight-input:eq(0)').textareacolorcoding(
{
	transparentText: !debug,
	debug: debug,
	autoExpandHeight: false
});

$('.highlight-input:eq(1)').textareacolorcoding(
{
	transparentText: !debug,
	debug: debug,
	autoExpandHeight: true
});

$('.highlight-input:eq(2)').textareacolorcoding(
{
	transparentText: !debug,
	debug: debug,
	autoExpandHeight: false
});

	
$('.btn-highlight').on('click', function() {
	var colorCodingObj = $(this).parent().find('.highlight-input').data('textareacolorcoding');
	var sel = colorCodingObj.getCurrentSelection();
	colorCodingObj.highlightText(sel.startIndex, sel.endIndex);
});

$('.btn-textcolor').on('click', function() {
	var colorCodingObj = $(this).parent().find('.highlight-input').data('textareacolorcoding');
	var sel = colorCodingObj.getCurrentSelection();
	colorCodingObj.highlightText(sel.startIndex, sel.endIndex, 'markerTextColor');
});

