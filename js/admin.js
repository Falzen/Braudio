
$(document).ready(function() {
	init();
	setEventListeners();
});

var allWantedNotes = [];
var selectedNotesIds = [];


function init() {
	allWantedNotes = [];
}

function setEventListeners() {
	$('#keyboard li').click(function(ev) {
		let noteName = $(ev.currentTarget).attr('note');
		//selectedNotesIds = pushSolo(selectedNotesIds, noteName);
		toggleNoteSelection(noteName);
		console.log('selectedNotesIds : ', selectedNotesIds);
		makePlayableNotesArray();
	});
}

function toggleNoteSelection(noteId) {
	if(selectedNotesIds.indexOf(noteId) == -1) {
		selectedNotesIds.push(noteId);
	} else {
		selectedNotesIds.splice(selectedNotesIds.indexOf(noteId), 1);
	}
	highlightSelectedNotes();
}

function highlightSelectedNotes() {
	$('#keyboard li').removeClass('is-selected');
	for(let i=0; i<selectedNotesIds.length; i++) {
		$('#' + selectedNotesIds[i]).addClass('is-selected');
	}

}

function pushSolo(arr, item) {
	if(arr.indexOf(item) == -1) {
		arr.push(item);
	}
	return arr;
}

function makePlayableNotesArray() {
	allWantedNotes = [];
	for(let i=0; i<selectedNotesIds.length; i++) {
		let noteName = selectedNotesIds[i];
		let wantedNoteFullRange = [];
		wantedNoteFullRange.push(noteName+'2');
		wantedNoteFullRange.push(noteName+'3');
		wantedNoteFullRange.push(noteName+'4');
		wantedNoteFullRange.push(noteName+'5');
		wantedNoteFullRange.push(noteName+'6');
		allWantedNotes = allWantedNotes.concat(wantedNoteFullRange);
	}

	let consoleOutput = 'var gammeName' + getRandomInt(0,999) + ' = ' + JSON.stringify(allWantedNotes) + ';';
	console.log('* * * * * * * * * * * * * * * * * *');
	console.log(consoleOutput);
	console.log('* * * * * * * * * * * * * * * * * *');
}