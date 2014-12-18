/*jshint eqnull: true*/
document.getElementById('input').addEventListener('focus', function(e) {
	this.classList.remove('collapsed');
}, false);

document.getElementById('check-form').addEventListener('submit', function(e) {
	e.preventDefault();
	var text = document.getElementById('input').value;
	checkGuidelines(text, function(issues) {
		console.log(issues);
		displayResults(text, issues);
	});
}, false);

function getDescription(code) {
	return {
		'longline': 'Строка слишком длинная',
		'emdash': 'Используйте длинное тире',
		'ellipsis': 'Используйте многоточие',
		'quotes': 'Используйте кавычки-ёлочки',
		'inlineurl': 'Вынесите URL в сноски',
		'noalt': 'Добавьте alt-текст',
		'trailingspace': 'Пробельные символы в конце строки',
		'doublespace': 'Двойные пробелы',
		'untranslatedcomment': 'Возможно, комментарий не переведён',
		'noh1': 'Первым должен идти заголовок первого уровня',
		'doubleh1': 'Несколько заголовков первого уровня',
		'headinglevel': 'Неправильный уровень заголовка'
	}[code] || code;
}

function getStats(issues){
	var hash = {};
	for (var i=0; i<issues.length; i++){
		hash[issues[i].severity] = -~hash[issues[i].severity];
	}
	return hash;
}

function displayResults(text, issues) {
	var introElement = document.getElementById('intro');
	if (introElement){
		introElement.parentNode.removeChild(introElement);
	}

	var pre = document.getElementById('output');
	pre.innerHTML = '';
	document.getElementById('stats').innerHTML = '';
	document.getElementById('common-errors').innerHTML = '';

	if (!text.trim()){
		document.getElementById('stats').innerHTML = 'Вы же даже ничего не написали';
		document.getElementById('input').focus();
		return;
	}

	document.getElementById('input').classList.add('collapsed');

	var stats = getStats(issues);
	var statsStrArray = [];
	var statsStr = '';

	if (stats.notice){ statsStrArray.push('<span class="severity-notice">замечаний: ' + stats.notice + '</span>'); }
	if (stats.warning){ statsStrArray.push('<span class="severity-warning">предупреждений: ' + stats.warning + '</span>'); }
	if (stats.error){ statsStrArray.push('<span class="severity-error">ошибок: ' + stats.error + '</span>'); }

	if (statsStrArray.length){
		statsStr = 'Бездушная машина нашла ' + statsStrArray.join(', ');
	} else {
		statsStr = 'У бездушной машины нет нареканий, но вы всё равно, пожалуйста, проверьте';
	}

	document.getElementById('stats').innerHTML = statsStr;


	issues.forEach(function(issue){
		if (issue.offset != null){
			return;
		}
		var p = document.createElement('p');
		p.className = 'severity-' + issue.severity + ' code-' + issue.code;
		p.textContent =  getDescription(issue.code);
		document.getElementById('common-errors').appendChild(p);
	});

	var textRun = '';

	for (var i = 0; i < text.length; i++) {
		var selectionElement = null;
		for (var j = 0; j < issues.length; j++) {
			var issue = issues[j];
			if (issue.offset <= i && issue.offset + issue.span > i) {
				if (!selectionElement) {
					selectionElement = document.createElement('span');
					selectionElement.textContent = text.charAt(i);
				}

				selectionElement.className += ' severity-' + issue.severity;
				selectionElement.className += ' code-' + issue.code;
				selectionElement.title += getDescription(issue.code) + '\n';
			}
		}
		if (selectionElement) {
			if (textRun) {
				pre.appendChild(document.createTextNode(textRun));
				textRun = '';
			}
			pre.appendChild(selectionElement);
		} else {
			textRun += text.charAt(i);
		}
	}
	if (textRun) {
		pre.appendChild(document.createTextNode(textRun));
		textRun = '';
	}
}