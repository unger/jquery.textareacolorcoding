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
        this.init(element, options);
    }

    TextareaColorCoding.VERSION = '0.0.1';

    TextareaColorCoding.DEFAULTS = {
        template: '<div class="textareacolorcoding" role="textareacolorcoding"><div class="textareacolorcoding-text"></div></div>',
        markerCssClass: 'textareacolorcoding-marker',
        onTextChange: null
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
        this.$element.on('click.textareacolorcoding', $.proxy(this.updateText, this));
        this.$element.on('dragend.textareacolorcoding', $.proxy(this.updateText, this));
        this.$element.on('drop.textareacolorcoding', $.proxy(this.delayedSyncronize, this));

        this.$highlightWrapper.css({
            'position': 'relative',
        });

        this.$element.css({
            'background': 'transparent',
            '-webkit-text-fill-color': 'transparent',
            'position': 'relative',
            'top': '0',
            'left': '0',
            'z-index': '10',
            'resize': 'none',
            'overflow': 'hidden'
        });

        this.copyCssProperties(element, this.$highlightText.get(0));

        this.syncronize();
    };

    TextareaColorCoding.prototype.copyCssProperties = function(sourceElement, targetElement) {
        var properties = [
          'boxSizing',
          'width',
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
        targetStyle.color = 'fuchsia';
        targetStyle.whiteSpace = 'pre-wrap';
        targetStyle.zIndex = 0;

        targetStyle.borderStyle = 'solid';
        targetStyle.borderColor = 'transparent';


        if (sourceElement.nodeName !== 'INPUT') {
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

    TextareaColorCoding.prototype.getActiveWord = function (val) {
        var retVal = {
            startPos : 0,
            endPos: 0,
            word: ''
        };
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

        retVal.startPos = prevSpace;
        retVal.endPos = nextSpace;
        retVal.word = val.substr(prevSpace, nextSpace - prevSpace);

        return retVal;
    };

    TextareaColorCoding.prototype.updateText = function() {
        var val = this.$element.val();
        var activeWord = this.getActiveWord(val);

        this.addHighlightedWord(activeWord);
        this.syncronizeHighlightedWords(val);

        if (this.highligthedWords.length == 0)
        {
            this.$highlightText.text(val);
        }
        else {
            var spans = [];
            var currentIndex = 0;
            for (var i = 0; i < this.highligthedWords.length; i++) {
                var highlightWord = this.highligthedWords[i];
                if (highlightWord.startPos > currentIndex) {
                    spans.push($('<span>').text(val.substring(currentIndex, highlightWord.startPos)));
                }
                spans.push($('<span class="textareacolorcoding-marker">').text(highlightWord.word));
                currentIndex = highlightWord.endPos;
            }

            if (currentIndex < val.length) {
                spans.push($('<span>').text(val.substring(currentIndex, val.length)));
            }

            this.$highlightText.empty().append(spans);
        }
    };

    TextareaColorCoding.prototype.addHighlightedWord = function (newWord) {
        if (newWord.word === '') {
            return;
        }
        var found = false;
        for (var i = this.highligthedWords.length - 1; i >= 0; i--) {
            var highlightWord = this.highligthedWords[i];

            if (newWord.word === highlightWord.word &&
                newWord.startPos === highlightWord.startPos &&
                newWord.endPos === highlightWord.endPos) {
                found = true;
            } else if ((highlightWord.startPos >= newWord.startPos && highlightWord.startPos <= newWord.endPos) ||
                (highlightWord.endPos >= newWord.startPos && highlightWord.endPos <= newWord.endPos))
            {
                this.highligthedWords.splice(i, 1);
            }
        }

        if (!found) {
            var inserted = false;
            for (var j = 0; j < this.highligthedWords.length; j++) {
                if (newWord.startPos < this.highligthedWords[j].startPos) {
                    this.highligthedWords.splice(j, 0, newWord);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                this.highligthedWords.push(newWord);
            }
        }

        console.log(this.highligthedWords);
    };

    TextareaColorCoding.prototype.syncronizeHighlightedWords = function (text) {

        for (var i = this.highligthedWords.length-1; i >= 0; i--) {
            var highlightWord = this.highligthedWords[i];
            var word = text.substr(highlightWord.startPos, highlightWord.endPos - highlightWord.startPos);

            if (word === highlightWord.word) {
                console.log('found: ' + word);
                continue;
            }

            console.log('not found: ' + highlightWord.word);
            this.highligthedWords.splice(i, 1);
        }

    };


    TextareaColorCoding.prototype.syncronize = function(e) {
        this.updateText();
        this.$element.height(this.$highlightText.height() + this.lineHeight);
    };


    TextareaColorCoding.prototype.delayedSyncronize = function (e) {
        setTimeout($.proxy(this.syncronize, this), 0);
    }

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
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('textareacolorcoding');
            var options = typeof option == 'object' && option;

            if (!data && option == 'destroy') return;
            if (!data) $this.data('textareacolorcoding', (data = new TextareaColorCoding(this, options)));
            if (typeof option == 'string') data[option]();
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