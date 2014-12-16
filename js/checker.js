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
			if (offset >= ranges[i][0] && offset <= ranges[i][1]){
				return true;
			}
		}
		return false;
	};


	function check(text, callback){
		var issues = [];

		var codeSectionsDetector = new CodeSectionsDetector(text);

		// Detect long lines
		text.replace(/[^\r\n]{81,}/g, function(s, index){
			issues.push(new GuidelineIssue({
				code: 'longline',
				severity: 'warning',
				offset: index + 80,
				span: s.length - 80
			}));
		});

		// Detect ellipsis
		text.replace(/\.{3,}/g, function(s, index){
			// Ignore everything inside code block
			if (codeSectionsDetector.inRange(index)){
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
			issues.push(new GuidelineIssue({
				code: 'quotes',
				severity: 'error',
				offset: index,
				span: s.length
			}));
		});

		callback(issues);
	}

	return check;
})();