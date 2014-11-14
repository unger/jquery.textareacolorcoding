/*!
 * jQuery Textarea Color Coding v0.0.1
 * Copyright 2014 Magnus Unger
 * Licensed under MIT
 */

(function ($) {
    'use strict';

    // PUBLIC CLASS DEFINITION
    // ===============================

    var TextareaColorCoding = function (element, options) {
        this.options = $.extend({}, TextareaColorCoding.DEFAULTS, options);
        this.highligthedWords = [];
        this.lastSelection = {selectionStart: 0, selectionEnd: 0, text: ''};
		this.charCount = 0;
		this.nodeName = element.nodeName;
		this.totalPaddingWidth = 0;
		if (this.nodeName === 'INPUT') {
			this.options.autoExpandHeight = false;
		}
        this.init(element, options);
    }

    TextareaColorCoding.VERSION = '0.0.1';

    TextareaColorCoding.DEFAULTS = {
        markerCssClass: 'marker',
        onTextChange: undefined,
		onSelectionChange: undefined,
		transparentText: false,
		enableSpellcheck: false,
		debug: false,
		autoExpandHeight: true
    }

    TextareaColorCoding.prototype.init = function (element, options) {
        this.$element = $(element);
        this.$element.wrap('<div class="textareacolorcoding">').parent().prepend('<div class="textareacolorcoding-text"><div class="textareacolorcoding-text-inner"></div></div>');

        this.$highlightText = this.$element.prev('.textareacolorcoding-text');
		this.$highlightTextInner = this.$highlightText.find('.textareacolorcoding-text-inner');
        this.$highlightWrapper = this.$element.parent();

        this.lineHeight = parseInt(this.$element.css('font-size'))*2;

		// Monitor content change
        this.$element.on('keydown.textareacolorcoding', $.proxy(delayedExecution, this, this.syncronize));
        this.$element.on('dragend.textareacolorcoding', $.proxy(delayedExecution, this, this.syncronize));
        this.$element.on('drop.textareacolorcoding', $.proxy(delayedExecution, this, this.syncronize));

		// Monitor scroll change
        this.$element.on('scroll.textareacolorcoding mousemove.textareacolorcoding', $.proxy(this.syncronizeScrollPosition, this));

		// Monitor selection change
        this.$element.on('blur.textareacolorcoding', $.proxy(delayedExecution, this, this.checkSelectionChange));
		this.$element.on('select.textareacolorcoding focus.textareacolorcoding keyup.textareacolorcoding mouseup.textareacolorcoding', 
							$.proxy(this.checkSelectionChange, this));
        
		// Monitor width/height changes
		$(window).on('resize.textareacolorcoding', $.proxy(this.syncronize, this));
		
        this.$highlightWrapper.css({
            'position': 'relative',
			'overflow': 'hidden'
        });

        this.$highlightTextInner.css({
			'overflow': 'hidden',
			'width': '100%',
			'height': '100%',
        });

        this.$element.css({
            'background': 'transparent',
            'position': 'relative',
            'top': '0',
            'left': '0',
            'z-index': '10',
            'resize': 'none',
            'overflow': (this.options.autoExpandHeight || this.nodeName === 'INPUT') ? 'hidden' : 'auto',
			'overflow-x': 'hidden',
			'width': '100%',
			'white-space': 'pre-wrap',
			'word-wrap': 'normal'
        });
		
		if (this.options.transparentText) {
			this.$element.css({'-webkit-text-fill-color': 'transparent'});
		}
		
		element.spellcheck = this.options.enableSpellcheck

        this.copyCssProperties(element, this.$highlightText.get(0));

        this.syncronize();
    };

    TextareaColorCoding.prototype.copyCssProperties = function(sourceElement, targetElement) {
        var properties = [
          'boxSizing',
          'overflowX',
          'overflowY',

          'borderTopWidth',
          'borderRightWidth',
          'borderBottomWidth',
          'borderLeftWidth',

          'paddingTop',
          'paddingRight',
          'paddingBottom',
          'paddingLeft',

          'marginTop',
          'marginRight',
          'marginBottom',
          'marginLeft',

          'fontStyle',
          'fontVariant',
          'fontWeight',
          'fontStretch',
          'fontSize',
          'lineHeight',
          'fontFamily',

          'textAlign',
          'textTransform',
          'textIndent',
          'textDecoration',

          'letterSpacing',
          'wordSpacing'
        ];

        var targetStyle = targetElement.style;
        var sourceStyle = window.getComputedStyle ? getComputedStyle(sourceElement) : sourceElement.currentStyle;
		var paddingLeft = parsePixelValue(sourceStyle.paddingLeft);
		var paddingRight = parsePixelValue(sourceStyle.paddingRight);

        targetStyle.position = 'absolute';
        targetStyle.top = 0;
        targetStyle.left = 0;
        targetStyle.color = this.options.debug ? 'fuchsia' : this.options.transparentText ? sourceStyle.color : 'transparent';
        targetStyle.zIndex = 0;
        targetStyle.width = '100%';
		targetStyle['-webkit-text-size-adjust'] = '100%';
		
        targetStyle.borderStyle = 'solid';
        targetStyle.borderColor = 'transparent';
        if (this.nodeName === 'INPUT') {
            targetStyle.whiteSpace = 'nowrap';
        } else {
			targetStyle.whiteSpace = 'pre-wrap';
            targetStyle.wordWrap = 'break-word';
		}

        for (var i = 0; i < properties.length; i++) {
            targetStyle[properties[i]] = sourceStyle[properties[i]];
        }

        // Fix for iOS adding 3px extra padding on textareas and 1 px on inputs
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            var extraPadding = this.nodeName === 'TEXTAREA' ? 3 : 1;
			paddingLeft += extraPadding;
			paddingRight += extraPadding;
            targetStyle.paddingLeft = paddingLeft + 'px';
            targetStyle.paddingRight = paddingRight + 'px';
        }
		
		this.totalPaddingWidth = paddingRight + paddingLeft;
    };

    TextareaColorCoding.prototype.getActiveWord = function () {
        var retVal = {
            startIndex : 0,
            endIndex: 0,
            text: ''
        };
        var val = this.$element.val();
        var selStart = this.$element.get(0).selectionStart;
        var selEnd = this.$element.get(0).selectionEnd;

        if (selStart === undefined || selStart != selEnd || document.activeElement != this.$element.get(0)) {
            return retVal;
        }

        var nextSpace = selStart;
        for (var j = selStart; j < val.length; j++) {
            if (val.charAt(j).match(/[\s\n]/)) {
                break;
            }
            nextSpace = j + 1;
        }

        var prevSpace = selStart;
        if (selStart > 0) {
            for (var i = selStart - 1; i >= 0; i--) {
                if (val.charAt(i).match(/[\s\n]/)) {
                    break;
                }
                prevSpace = i;
            }
        }

        retVal.startIndex = prevSpace;
        retVal.endIndex = nextSpace;
        retVal.text = val.substr(prevSpace, nextSpace - prevSpace);

        return retVal;
    };

    TextareaColorCoding.prototype.renderText = function() {
        var val = this.$element.val();

        if (this.highligthedWords.length == 0)
        {
            this.$highlightTextInner.text(val);
        }
        else {
            var spans = [];
            var currentIndex = 0;
            for (var i = 0; i < this.highligthedWords.length; i++) {
                var highlightWord = this.highligthedWords[i];
                if (highlightWord.startIndex > currentIndex) {
                    spans.push($('<span>').text(val.substring(currentIndex, highlightWord.startIndex)));
                }
                spans.push($('<span>').addClass(highlightWord.cssClass).text(val.substring(highlightWord.startIndex, highlightWord.endIndex)));
                currentIndex = highlightWord.endIndex;
            }

            if (currentIndex < val.length) {
                spans.push($('<span>').text(val.substring(currentIndex, val.length)));
            }

            this.$highlightTextInner.empty().append(spans);
        }
    };

    TextareaColorCoding.prototype.addHighlightedWord = function (newWord) {
        if (newWord.text === '') {
            return;
        }
        var found = false;
        for (var i = this.highligthedWords.length - 1; i >= 0; i--) {
            var highlightWord = this.highligthedWords[i];

            if (newWord.text === highlightWord.text &&
                newWord.startIndex === highlightWord.startIndex &&
                newWord.endIndex === highlightWord.endIndex) {
                found = true;
            } else if ((highlightWord.startIndex >= newWord.startIndex && highlightWord.startIndex < newWord.endIndex) ||
                (highlightWord.endIndex > newWord.startIndex && highlightWord.endIndex <= newWord.endIndex))
            {
                this.highligthedWords.splice(i, 1);
            }
        }

        if (!found) {
            var inserted = false;
            for (var j = 0; j < this.highligthedWords.length; j++) {
                if (newWord.startIndex < this.highligthedWords[j].startIndex) {
                    this.highligthedWords.splice(j, 0, newWord);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                this.highligthedWords.push(newWord);
            }
        }
    };

    TextareaColorCoding.prototype.highlightText = function (startIndex, endIndex, cssClass) {
		var val = this.$element.val();
		
		if (endIndex > val.length) {
			endIndex = val.length;
		}
        var markedText = {
            startIndex : startIndex,
            endIndex: endIndex,
            text: val.substr(startIndex, endIndex - startIndex),
			cssClass: cssClass || this.options.markerCssClass
        };

		this.addHighlightedWord(markedText);
		this.renderText();
	};
	
	
    TextareaColorCoding.prototype.syncronizeHighlightedWords = function () {
		var val = this.$element.val();
		var charCountChange = val.length - this.charCount;
		var lastFoundIndex = 0, highlightWord, word, newIndex, removeIndex = [];
		this.charCount = val.length;
		for (var i = 0 ; i < this.highligthedWords.length; i++) {
            highlightWord = this.highligthedWords[i];
            word = val.substring(highlightWord.startIndex, highlightWord.endIndex);

            if (word === highlightWord.text) {
                console.log('found: ' + word);
				lastFoundIndex = highlightWord.endIndex;
                continue;
            }
			
			// Try to relocate by charCountChange
            word = val.substring(highlightWord.startIndex + charCountChange, highlightWord.endIndex + charCountChange);
            if (word === highlightWord.text) {
                console.log('refound: ' + word);
				highlightWord.startIndex = highlightWord.startIndex + charCountChange;
				highlightWord.endIndex = highlightWord.endIndex + charCountChange;
				lastFoundIndex = highlightWord.endIndex;
                continue;
            }
			
			// Try to relocate by search
			newIndex = val.indexOf(highlightWord.text, lastFoundIndex);
			if (newIndex !== -1) {
                console.log('changed: ' + highlightWord.text);
				highlightWord.indexChange = newIndex - highlightWord.startIndex;
				highlightWord.startIndex = newIndex;
				highlightWord.endIndex = newIndex + highlightWord.text.length;
                continue;
			}
		
			// Else remove
            console.log('not found: ' + highlightWord.text);
            removeIndex.push(i);
        }
		
        for (var k = 0 ; k < removeIndex.length; k++) {
			this.highligthedWords.splice(removeIndex[k], 1);
		}
    };

    TextareaColorCoding.prototype.syncronize = function() {

		this.syncronizeHighlightedWords();
        this.renderText();

		this.syncronizeScrollPosition();

		// Sync Height
		if (this.options.autoExpandHeight) {
			this.$element.height(this.$highlightText.height() + this.lineHeight);
		} else {
			this.$highlightText.height(this.$element.height());
		}

		
		// Sync Width to calculate vertical scrollbar
		if (this.nodeName === 'TEXTAREA' && !this.options.autoExpandHeight) {
			this.$highlightTextInner.width(this.$element.get(0).clientWidth - this.totalPaddingWidth);
			
			console.log(this.$element.get(0).scrollWidth + ', ' + this.$element.get(0).clientWidth + ', ' + this.$element.get(0).offsetWidth);
		}
	};

    TextareaColorCoding.prototype.syncronizeScrollPosition = function() {
		this.$highlightTextInner.get(0).scrollTop = this.$element.get(0).scrollTop;
		this.$highlightTextInner.get(0).scrollLeft = this.$element.get(0).scrollLeft;
		
		if (this.$highlightTextInner.get(0).scrollLeft !== this.$element.get(0).scrollLeft) {
			this.$element.get(0).scrollLeft = this.$highlightTextInner.get(0).scrollLeft;
		}
	};

	
    TextareaColorCoding.prototype.getCurrentSelection = function () {
		var sel = {
			startIndex : this.$element.get(0).selectionStart,
			endIndex: this.$element.get(0).selectionEnd,
			text: ''
		};
		var val = this.$element.val();
		sel.text = val.substr(sel.startIndex, sel.endIndex - sel.startIndex);
		
		return sel;
	};	
	
    TextareaColorCoding.prototype.checkSelectionChange = function () {
		this.syncronizeScrollPosition();
	
		if (typeof this.options.onSelectionChange === 'function') {
			var sel = this.getCurrentSelection();
			
			if (this.lastSelection.startIndex !== sel.startIndex ||
				this.lastSelection.endIndex !== sel.endIndex ||
				this.lastSelection.text !== sel.text)
			{
				this.lastSelection = sel;
				this.options.onSelectionChange.apply(this, [sel]);
			}			
		}
	};

    // PRIVATE METHODS
    // =========================

	function delayedExecution(func) {
        setTimeout($.proxy(func, this), 0);
    };
	
    function htmlEscape(str) {
        return String(str)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
    }
	
	function parsePixelValue(value) {
		var match = value.match(/(\d*(\.\d*)?)px/);
		var retVal = 0;
		if (match != null && match.length > 1) {
			retVal = Number(match[1]);
		}	
		return retVal;
	}



    // PLUGIN DEFINITION
    // =========================

    function Plugin(option) {
		var $arguments = arguments;
	
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('textareacolorcoding');
            var options = typeof option == 'object' && option;

            if (!data && option == 'destroy') return;
            if (!data) $this.data('textareacolorcoding', (data = new TextareaColorCoding(this, options)));

			// Expose internal methods
            if (typeof option == 'string') {
				var args = Array.prototype.slice.call($arguments);
				args.splice(0, 1);  
				data[option].apply(data, args); 			
			}
        });
    }

    var old = $.fn.textareacolorcoding;

    $.fn.textareacolorcoding = Plugin;
    $.fn.textareacolorcoding.Constructor = TextareaColorCoding;


    // NO CONFLICT
    // ===================

    $.fn.textareacolorcoding.noConflict = function () {
        $.fn.textareacolorcoding = old;
        return this;
    }

})(jQuery);