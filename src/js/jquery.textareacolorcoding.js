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
		if (element.nodeName === 'INPUT') {
			this.options.autoExpandHeight = false;
		}
        this.init(element, options);
    }

    TextareaColorCoding.VERSION = '0.0.1';

    TextareaColorCoding.DEFAULTS = {
        markerCssClass: 'textareacolorcoding-marker',
        onTextChange: undefined,
		onSelectionChange: undefined,
		transparentText: false,
		enableSpellcheck: false,
		debug: false,
		autoExpandHeight: true
    }

    TextareaColorCoding.prototype.init = function (element, options) {
        var $highlightWrapper = $('<div class="textareacolorcoding" role="textareacolorcoding"></div>');
        var $highlightText = $('<div class="textareacolorcoding-text"></div>');

        this.$element = $(element);
        this.$element.wrap($highlightWrapper).parent().prepend($highlightText);;

        this.$highlightText = this.$element.prev('.textareacolorcoding-text');
        this.$highlightWrapper = this.$element.parent();

        this.lineHeight = parseInt(this.$element.css('font-size'))*2;

        this.$element.on('keydown.textareacolorcoding', $.proxy(this.delayedSyncronize, this));
        this.$element.on('dragend.textareacolorcoding', $.proxy(this.delayedSyncronize, this));
        this.$element.on('drop.textareacolorcoding', $.proxy(this.delayedSyncronize, this));
        
		$(window).on('resize.textareacolorcoding', $.proxy(this.delayedSyncronize, this));

		this.$element.on('select.textareacolorcoding blur.textareacolorcoding focus.textareacolorcoding keyup.textareacolorcoding mouseup.textareacolorcoding', $.proxy(this.checkSelectionChange, this));
		
        this.$highlightWrapper.css({
            'position': 'relative',
			'overflow': 'hidden'
        });

        this.$element.css({
            'background': 'transparent',
            'position': 'relative',
            'top': '0',
            'left': '0',
            'z-index': '10',
            'resize': 'none',
            'overflow': 'hidden',
			'width': '100%',
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

        targetStyle.position = 'absolute';
        targetStyle.top = 0;
        targetStyle.left = 0;
        targetStyle.color = this.options.debug ? 'fuchsia' : this.options.transparentText ? sourceStyle.color : 'transparent';
        targetStyle.zIndex = 0;
        
        targetStyle.width = '100%';

        targetStyle.borderStyle = 'solid';
        targetStyle.borderColor = 'transparent';
        if (sourceElement.nodeName === 'INPUT') {
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
            var extraPadding = sourceElement.nodeName === 'TEXTAREA' ? 3 : 1;

            var paddingMatch = sourceStyle.paddingLeft.match(/(\d*(\.\d*)?)px/);
            var paddingLeft = 0;
            if (paddingMatch != null && paddingMatch.length > 1) {
                paddingLeft = Number(paddingMatch[1]);
            }

            targetStyle.paddingLeft = (paddingLeft + extraPadding) + 'px';
        }
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
            this.$highlightText.text(val);
        }
        else {
            var spans = [];
            var currentIndex = 0;
            for (var i = 0; i < this.highligthedWords.length; i++) {
                var highlightWord = this.highligthedWords[i];
                if (highlightWord.startIndex > currentIndex) {
                    spans.push($('<span>').text(val.substring(currentIndex, highlightWord.startIndex)));
                }
                spans.push($('<span>').addClass(this.options.markerCssClass).text(val.substring(highlightWord.startIndex, highlightWord.endIndex)));
                currentIndex = highlightWord.endIndex;
            }

            if (currentIndex < val.length) {
                spans.push($('<span>').text(val.substring(currentIndex, val.length)));
            }

            this.$highlightText.empty().append(spans);
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

    TextareaColorCoding.prototype.highlightText = function (startIndex, endIndex) {
		var val = this.$element.val();
		
		if (endIndex > val.length) {
			endIndex = val.length;
		}
        var markedText = {
            startIndex : startIndex,
            endIndex: endIndex,
            text: val.substr(startIndex, endIndex - startIndex)
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
			console.log(lastFoundIndex);
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


    TextareaColorCoding.prototype.syncronize = function(e) {
		this.syncronizeHighlightedWords();
        this.renderText();
		if (this.options.autoExpandHeight) {
			this.$element.height(this.$highlightText.height() + this.lineHeight);
		} else {
			this.$highlightText.height(this.$element.height());
		}
    };


    TextareaColorCoding.prototype.delayedSyncronize = function (e) {
        setTimeout($.proxy(this.syncronize, this), 0);
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

    function htmlEscape(str) {
        return String(str)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
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