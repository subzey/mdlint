document.getElementById('check-form').addEventListener('submit', function(e) {
	e.preventDefault();
	var text = document.getElementById('input').value;
	checkGuidelines(text, function(issues) {
		console.log(issues);
		displayResults(text, issues);
	});
});

function getDescription(code){
	return {
		'longline': 'Строка слишком длинная',
		'emdash': 'Используйте длинное тире',
		'ellipsis': 'Используйте многоточие'
	}[code] || code;
}

function displayResults(text, issues) {
	// Remove form
	var pre = document.getElementById('output');
	pre.innerHTML = '';

	var textRun = '';

	for (var i=0; i<text.length; i++){
		var selectionElement = null;
		for (var j=0; j<issues.length; j++){
			var issue = issues[j];
			if (issue.offset <= i && issue.offset + issue.span > i){
				if (!selectionElement){
					selectionElement = document.createElement('span');
					selectionElement.textContent = text.charAt(i);

					selectionElement.className += ' severity-' + issue.severity;
					selectionElement.className += ' code-' + issue.code;
					selectionElement.title += getDescription(issue.code) + '\n';
				}
			}
		}
		if (selectionElement){
			if (textRun){
				pre.appendChild(document.createTextNode(textRun));
				textRun = '';
			}
			pre.appendChild(selectionElement);
		} else {
			textRun += text.charAt(i);
		}
	}
	if (textRun){
		pre.appendChild(document.createTextNode(textRun));
		textRun = '';
	}
}