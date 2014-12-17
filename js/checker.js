/*jshint eqnull:true */ // `value == null` is a valid operation
var checkGuidelines = (function(){
	function GuidelineIssue(options){
		options = options || {};
		if (options.code != null){
			this.code = options.code + '';
		}
		if (options.severity != null){
			this.severity = options.severity + '';
		}
		if (options.offset != null &&  options.offset >= 0 && isFinite(options.offset)){
			this.offset = +options.offset;
		}
		if (options.span != null &&  options.span >= 0 && isFinite(options.span)){
			this.span = +options.span;
		}
	}

	GuidelineIssue.prototype.code = '';
	GuidelineIssue.prototype.severity = 'notice';
	GuidelineIssue.prototype.offset = undefined;
	GuidelineIssue.prototype.span = 0;


	function CodeSectionsDetector(text){
		this.ranges = CodeSectionsDetector.detect(text);
	}
	CodeSectionsDetector.detect = function detect(text){ // Static method
		var ranges = [];

		// Detect code sections in backticks
		text.replace(/```[^]*```|`[^]*`/g, function(s, index){
			ranges.push([index, index + s.length]);
		});

		// Detect code sections by indentation
		var isList = false;
		var lines = text.replace(/.*(?:\r\n|\n|\r)?/g, function(s, index){
			if (/^\s*(-|\*|\d+\.\s+)/.test(s)){
				isList = true;
				return;
			} else if (/^(\u0020{4}|\t)/.test(s)){
				if (!isList){
					ranges.push(index, [index, index + s.length]);
				}
			} else {
				isList = false;
			}
		});

		return ranges;
	};
	CodeSectionsDetector.prototype.inRange = function inRange(offset){
		var ranges = this.ranges || [];
		for (var i=0; i<ranges.length; i++){
			if (offset >= ranges[i][0] && offset < ranges[i][1]){
				return true;
			}
		}
		return false;
	};

	function FootLinksDetector(text){
		var res = FootLinksDetector.detect(text);
		this.ranges = res.ranges;
		this.statementRanges = res.statementRanges;
	}
	FootLinksDetector.detect = function detect(text){ // Static method
		var ranges = [];
		var statementRanges = [];
		text.replace(/(\[.*?\]\s*:\s*\S+)(?:(\s+\").*?\")?/g, function(s, main, openQuote, index){
			openQuote = openQuote || '';
			ranges.push([index, index + main.length + openQuote.length]);
			if (openQuote){
				ranges.push([index + s.length - 1, index + s.length]);
			}
			statementRanges.push([index, index + s.length]);
		});
		return {
			ranges: ranges,
			statementRanges: statementRanges
		};
	};
	FootLinksDetector.prototype.inRange = function inRange(offset){
		var ranges = this.ranges || [];
		for (var i=0; i<ranges.length; i++){
			if (offset >= ranges[i][0] && offset < ranges[i][1]){
				return true;
			}
		}
		return false;
	};
	FootLinksDetector.prototype.inStatementRange = function inStatementRange(offset){
		var ranges = this.statementRanges || [];
		for (var i=0; i<ranges.length; i++){
			if (offset >= ranges[i][0] && offset < ranges[i][1]){
				return true;
			}
		}
		return false;
	};


	function check(text, callback){
		var issues = [];

		var codeSectionsDetector = new CodeSectionsDetector(text);
		var footLinksDetector = new FootLinksDetector(text);

		// Detect long lines
		text.replace(/[^\r\n]{81,}/g, function(s, index){
			// Avoid warnings when nothing can be done
			var grace = true;
			s.replace(/(^(?:\*|-)?\s+)|\s/g, function(ws, indent, wsIndex){
				if (indent){
					return;
				}
				if (!codeSectionsDetector.inRange(index + wsIndex) && !footLinksDetector.inStatementRange(index + wsIndex)){
					grace = false;
				}
			});
			if (!grace){
				issues.push(new GuidelineIssue({
					code: 'longline',
					severity: 'notice',
					offset: index + 80,
					span: s.length - 80
				}));
			}
		});

		// Detect ellipsis
		text.replace(/\.{3,}/g, function(s, index){
			// Ignore everything inside code block
			if (codeSectionsDetector.inRange(index)){
				return;
			}
			if (footLinksDetector.inRange(index)){
				return;
			}
			issues.push(new GuidelineIssue({
				code: 'ellipsis',
				severity: 'error',
				offset: index,
				span: s.length
			}));
		});

		// Detect dash
		text.replace(/(?![\r\n])\s+-\s/g, function(s, index){
			if (codeSectionsDetector.inRange(index)){
				return;
			}
			if (footLinksDetector.inRange(index)){
				return;
			}
			issues.push(new GuidelineIssue({
				code: 'emdash',
				severity: 'error',
				offset: index,
				span: s.length
			}));
		});

		// Detect quotes
		text.replace(/"|'/g, function(s, index){
			if (codeSectionsDetector.inRange(index)){
				return;
			}
			if (footLinksDetector.inRange(index)){
				return;
			}
			issues.push(new GuidelineIssue({
				code: 'quotes',
				severity: 'error',
				offset: index,
				span: s.length
			}));
		});

		// Detect inline hrefs
		text.replace(/(\[.*?\])\(.*?\)/g, function(s, braces, index){
			if (codeSectionsDetector.inRange(index)){
				return;
			}
			if (footLinksDetector.inRange(index)){
				return;
			}
			issues.push(new GuidelineIssue({
				code: 'inlineurl',
				severity: 'error',
				offset: index + braces.length,
				span: s.length - braces.length
			}));
		});

		// Detect image w/o alt
		text.replace(/!\[\](?:\(.*?\)|\[.*\])/g, function(s, index){
			if (codeSectionsDetector.inRange(index)){
				return;
			}
			if (footLinksDetector.inRange(index)){
				return;
			}
			issues.push(new GuidelineIssue({
				code: 'noalt',
				severity: 'error',
				offset: index + 1,
				span: 2
			}));
		});

		// Detect trailing spaces
		text.replace(/[\u0020\t]+(?=\r|\n|$)/g, function(s, index){
			issues.push(new GuidelineIssue({
				code: 'trailingspace',
				severity: 'warning',
				offset: index,
				span: s.length
			}));
		});

		// Detect double spaces
		text.replace(/(?:\r|\n|^)\s*(?:\*|-|\d+\.\s)?\s*|(\s{2,})/g, function(s, spaces, index){
			if (!spaces){
				return;
			}
			if (codeSectionsDetector.inRange(index)){
				return;
			}
			issues.push(new GuidelineIssue({
				code: 'doublespace',
				severity: 'warning',
				offset: index,
				span: s.length
			}));
		});

		callback(issues);
	}

	return check;
})();