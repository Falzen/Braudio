/*
TODO
- add or remove voices from the volume handles
- 

AMELIO
- allow some accidental notes (seconds and seventh first)
- 

*/




$(document).ready(function() {
	init();
});



var playSettings = {
	playingMode: {
		isRandom: true,
		isWritten: false
	},
	tempo: {
		valueInBpm: 90,
		valueInMs: 60000/90
	},
	volume: {
		volumeMultiplierPerVoiceIndex: [
			0.5, 
			0.5, 
			0.5
		]
	},
	pitch: {
		isPitching: false,
		pitchValue: 1.00002,
		pitchDirection: 1, // 1 or -1
	},
	modulation: {
		shouldModulate: true
		// shouldModulate: false
	}
}




var voices = [];
var voicesIndexesToStop = [];
var tempo = 90;
var tempoInMs = 60000/tempo;

function addVoice() {
	voices.push(new AudioContext());
}

function init() {

	initScale();
	addVoice(); // melody one
	if(!playSettings.playingMode.isWritten) {
		addVoice(); // melody two
		addVoice(); // melody three
	}	

	injectVolumeRangesInDom();
	setEventListeners();
}


function setEventListeners() {
	$('#play').click(function() {
		handleStartPlayingClick();
	});
	$('#stop').click(function() {
		handleStopPlayingClick();
	});
	

	$('.oneScale').click(function(ev) {

		let chosenScaleInfo = {
			name: ev.currentTarget.dataset.scalename,
			tonality: ev.currentTarget.dataset.tonality,
			scalesDictionnaryIndex: 1*ev.currentTarget.dataset.dictionnaryindex
		};
		let wantedNotes = tempScalesDictionnary[ev.currentTarget.dataset.dictionnaryindex];
		handleSwitchToNewScale(wantedNotes);
	});

	$('.oneCustomNote').click(function(ev) {
		handleAddCustomNote(ev);
	});

	$('#removeAllCustomNotes').click(function() {
		handleRemoveAllCustomNotes();
	});

	$('#validateCustomNotes').click(function() {
		handleValidateCustomNotes();
	});


	$(document).on('click', 'input.volume-control', function(ev) {
		let voiceIndex = ev.currentTarget.id.split('volume')[1];
		$('#output-' + ev.currentTarget.id).text(ev.currentTarget.value + '%');

		playSettings.volume.volumeMultiplierPerVoiceIndex[voiceIndex] = parseFloat(ev.currentTarget.value) / 100;
	});


}





function removeVoiceByIndex(voiceIndex) {

}





function handleSwitchToNewScale(wantedNotes) {
	chosenNotes = [...wantedNotes];
	initScale();
	displayChosenNotes();
	
	// playMelody(0, currentScale.notesLeftHand);
	// playMelody(1, currentScale.notesRightHand);
}















function handleStopPlayingClick() {

	isPlaying = false;
	stopModulationEngine = true;
	$('button#play').removeClass('is-active');
	$('button#stop').addClass('is-active');	

	return false;
}
function handleStartPlayingClick() {
	isPlaying = true;
	playMelody(0, 'left');
	playMelody(1, 'right');
	playMelody(2, 'right');

	$('button#play').addClass('is-active');
	$('button#stop').removeClass('is-active');	

	if(playSettings.modulation.shouldModulate) {
		startModulationEngine();
	}
}

function playMelody(voiceIndex, hand) {
	let notes;
	let soundwaveType = 'sine'; // "sine", "square", "sawtooth", "triangle"
	switch(hand) {
		case 'left':
		if(currentScale.notesRightHand.length == 0) {
			currentScale.notesLeftHand = currentScale.notesRightHand;
		}
		notes = currentScale.notesLeftHand;
		soundwaveType = 'triangle';
		break;
		case 'right':
		if(currentScale.notesRightHand.length == 0) {
			currentScale.notesRightHand = currentScale.notesLeftHand;
		}
		notes = currentScale.notesRightHand;
		soundwaveType = 'triangle';
		break;
	}
	if(notes == null || notes.length == 0) {
		console.log('hand: ', hand);
		console.log('voiceIndex: ', voiceIndex);
		console.log('currentScale: ', currentScale);
		console.log('currentScale.notes: ', currentScale.notes);
		console.log(' => no notes found');
		return false;
	}
	if(!isPlaying) {
		handleStopPlayingClick();
		return false;
	}
	let thisOscillator;
	let thisGainNode;
	let playerControl;
	let delayBeforeNextNote;
	let delayBeforeNoteStops;
	var noteObj = makeRandomNoteFromNotes(notes, hand);
	

	blinkPlayingNote(noteObj.name, hand, true);
	playerControl = playNote(noteObj, voiceIndex, soundwaveType); // returns [oscillator, contextGain]

	delayBeforeNextNote = tempoInMs*noteObj.durationInTicks;
	delayBeforeNoteStops = tempoInMs*noteObj.durationInTicks;

	thisOscillator = playerControl[0];
	thisGainNode = playerControl[1];


	setTimeout(function() {
		playMelody(voiceIndex, hand);
	}, delayBeforeNextNote);


	setTimeout(function() {
		thisGainNode.gain.setValueAtTime(thisGainNode.gain.value, voices[voiceIndex].currentTime); 
    	thisGainNode.gain.exponentialRampToValueAtTime(0.0001, voices[voiceIndex].currentTime + 0.03);
	}, delayBeforeNoteStops*1.1);

	setTimeout(function() {
		blinkPlayingNote(noteObj.name, hand, false);
		thisOscillator.stop();
	}, delayBeforeNoteStops*3);

}


function playVoices() {
	for(let i=0; i<voices.length; i++) {
		voices[i];
	}
}


function playNote(noteObj, voiceIndex, soundwaveType) {
	let thisVoice = voices[voiceIndex];

	if(soundwaveType == null) {
		soundwaveType = 'sine';
	}

	let pitchValue = playSettings.pitch.pitchValue;
	if(playSettings.pitch.isPitching) {
		if(Math.random() < 0.30) {
			let diff = getRandomInt(-10, 10) / 1000;
			
			if(pitchValue > 1.1 || pitchValue < 0.9) {
				playSettings.pitch.pitchDirection *= -1;
			}
			pitchValue = 1 - (diff*playSettings.pitch.pitchDirection);

		}
	}


	let oscillator = thisVoice.createOscillator();
	let contextGain = thisVoice.createGain();
	oscillator.type = soundwaveType; // "sine", "square", "sawtooth", "triangle"
	let fff = Math.round((noteObj.frenquencyInHz*pitchValue*10))/10;
	oscillator.frequency.value = fff;
	oscillator.connect(contextGain);

	contextGain.gain.value = 0.05 * playSettings.volume.volumeMultiplierPerVoiceIndex[voiceIndex];
	contextGain.connect(thisVoice.destination);
	oscillator.start();
	return [oscillator, contextGain];
}









function blinkPlayingNote(noteName, hand, isLightUp) {
	let noteSimpleName = noteName.slice(0, -1);
	let className = 'lightUp-' + hand;
	if(isLightUp) {
		$('#' + noteSimpleName).addClass(className);
	} else {
		$('#' + noteSimpleName).removeClass(className);
	}
}




/*
do re mi sol sol# la
avec 3x plus d'aiguës
*/
var octavesNb = [2,3,4,5]
var isPlaying = false;
var cpt = 0;



function makeRandomNoteFromNotes(notes, hand) {
	let randNote = getRandomIndex(notes);
	if(!randNote) {
		console.log('notes: ', notes);
		console.log('randNote: ', randNote);
	}
	let randFrq = Math.trunc(randNote.frq);
	let notesDurationForThisVoice = 
		hand == 'left' 
		? noteDurationsInTickNb_left
		: noteDurationsInTickNb_right;

	// let notesDurationForThisVoice = noteDurationsInTickNb;

	let randDurationInTicks = getRandomIndex(notesDurationForThisVoice);
	let oneNoteData = {
		name: randNote.name,
		durationInTicks: randDurationInTicks,
		frenquencyInHz: randNote.frq
	}
	var newNote = new Note(oneNoteData);
	return newNote;
}


var noteNamesForCustomScale = [];
function makeCustomScale() {

}

function handleAddCustomNote(ev) {

	let noteName = ev.currentTarget.id;
	if(noteNamesForCustomScale.indexOf(noteName) == -1) {
		noteNamesForCustomScale.push(noteName);
	} else {
		noteNamesForCustomScale.splice(noteNamesForCustomScale.indexOf(noteName), 1);
	}
	refreshCustomScaleDisplay();
}

function displayChosenNotes() {
	noteNamesForCustomScale = [...chosenNotes];
	for (var i = 0; i < noteNamesForCustomScale.length; i++) {
		noteNamesForCustomScale[i] = noteNamesForCustomScale[i].slice(0, -1);
	}
	noteNamesForCustomScale = [...new Set(noteNamesForCustomScale)];
	refreshCustomScaleDisplay();
}

function handleRemoveAllCustomNotes() {
	noteNamesForCustomScale = [];
	refreshCustomScaleDisplay();
}

function handleValidateCustomNotes() {
	let customNotes = [];
	for (var i=0; i<noteNamesForCustomScale.length; i++) {
		for (var j=0; j<octavesNb.length; j++) {
			let scaledNote = noteNamesForCustomScale[i] + octavesNb[j];
			customNotes.push(scaledNote);
		}
	}
	chosenNotes = customNotes;
	customNotesList.push(customNotes);

	initScale();
}





function refreshCustomScaleDisplay() {
	let output = '';
	for (var i = 0; i < noteNamesForCustomScale.length; i++) {
		output += 
			'<span class="chosenCustomNote" data-notename="' + noteNamesForCustomScale[i] + '">' 
			+ noteNamesForCustomScale[i] 
			+ '</span> ';
	}
	$('#customScaleNotes').html(output);
}




function getFrequencyFromName(noteName) {
	if(noteName == null || noteName == '') {
		return 0;
	}
	return keyboardMap.get(noteName);
}

/*
Gammes en dur
*/


var noteDurationsInTickNb = [10,10,3,3,0.5,0.5,0.5,0.5]; // ,0.25,0.25,0.25,0.25,0.25,0.25,0.25
// var noteDurationsInTickNb_right = [4/5, 4/7,  4/7,  4/7]
// var noteDurationsInTickNb_left = [1,1,1,1]; 
var noteDurationsInTickNb_left = [1.2];
var noteDurationsInTickNb_right = [0.25];
var chroma = [
	'C0', 'Cx0', 'D0', 'Dx0', 'E0', 'F0', 'Fx0', 'G0', 'Gx0', 'A0', 'Ax0', 'B0', 
	'C1', 'Cx1', 'D1', 'Dx1', 'E1', 'F1', 'Fx1', 'G1', 'Gx1', 'A1', 'Ax1', 'B1', 
	'C2', 'Cx2', 'D2', 'Dx2', 'E2', 'F2', 'Fx2', 'G2', 'Gx2', 'A2', 'Ax2', 'B2', 
	'C3', 'Cx3', 'D3', 'Dx3', 'E3', 'F3', 'Fx3', 'G3', 'Gx3', 'A3', 'Ax3', 'B3', 
	'C4', 'Cx4', 'D4', 'Dx4', 'E4', 'F4', 'Fx4', 'G4', 'Gx4', 'A4', 'Ax4', 'B4', 
	'C5', 'Cx5', 'D5', 'Dx5', 'E5', 'F5', 'Fx5', 'G5', 'Gx5', 'A5', 'Ax5', 'B5', 
	'C6', 'Cx6', 'D6', 'Dx6', 'E6', 'F6', 'Fx6', 'G6', 'Gx6', 'A6', 'Ax6', 'B6', 
	'C7', 'Cx7', 'D7', 'Dx7', 'E7', 'F7', 'Fx7', 'G7', 'Gx7', 'A7', 'Ax7', 'B7', 
	'C8', 'Cx8', 'D8', 'Dx8', 'E8', 'F8', 'Fx8', 'G8', 'Gx8', 'A8', 'Ax8', 'B8'
];
var chromaCurrated = [
	'C2', 'Cx2', 'D2', 'Dx2', 'E2', 'F2', 'Fx2', 'G2', 'Gx2', 'A2', 'Ax2', 'B2', 
	'C3', 'Cx3', 'D3', 'Dx3', 'E3', 'F3', 'Fx3', 'G3', 'Gx3', 'A3', 'Ax3', 'B3', 
	'C4', 'Cx4', 'D4', 'Dx4', 'E4', 'F4', 'Fx4', 'G4', 'Gx4', 'A4', 'Ax4', 'B4', 
	'C5', 'Cx5', 'D5', 'Dx5', 'E5', 'F5', 'Fx5', 'G5', 'Gx5', 'A5', 'Ax5', 'B5'
];
var gammeParTon = [
	'C2', 'D2', /*'E2',*/ 'Fx2', 'Gx2', 'Ax2',
	'C3', 'D3', /*'E3',*/ 'Fx3', 'Gx3', 'Ax3',
	'C4', 'D4', /*'E4',*/ 'Fx4', 'Gx4', 'Ax4',
	'C5', 'D5', /*'E5',*/ 'Fx5', 'Gx5', 'Ax5'
];
var gammeParTon_X = [
	'Cx2', 'Dx2', /*'F2',*/ 'G2', 'A2', 'B2', 
	'Cx3', 'Dx3', /*'F3',*/ 'G3', 'A3', 'B3', 
	'Cx4', 'Dx4', /*'F4',*/ 'G4', 'A4', 'B4',
	'Cx5', 'Dx5', /*'F5',*/ 'G5', 'A5', 'B5'
	
];
var manaC = [
	'C2', 'D2','E2', 'G2', 'A2', 
	'C3', 'D3','E3', 'G3', 'A3', 
	'C4', 'D4','E4', 'G4', 'A4', 
	'C5', 'D5','E5', 'G5', 'A5'];

var manaD = [
	'D2', 'E2', 'G2', 'A2', 'B2', 
	'D3', 'E3', 'G3', 'A3', 'B3', 
	'D4', 'E4', 'G4', 'A4', 'B4', 
	'D5', 'E5', 'G5', 'A5', 'B5'
];

var manaF = [
	'D2', 'F2', 'G2', 'A2', 
	'D3', 'F3', 'G3', 'A3', 
	'D4', 'F4', 'G4', 'A4', 
	'D5', 'F5', 'G5', 'A5'
];


let isNoteOnOrOffByIndex_MajorScale = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
let isNoteOnOrOffByIndex_MinorScale = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1];
var allTonalities = {
	majors: [],
	minors: []
};
function makeTonalities(version) {

	let wantedScaleStepsVersion = '';
	let oneOfTwelve = [];
	let scaleStepsIndex = 0;
	switch(version) {
		case 'major' :
			wantedScaleStepsVersion = isNoteOnOrOffByIndex_MajorScale;
		break;
		case 'minor' :
			wantedScaleStepsVersion = isNoteOnOrOffByIndex_MinorScale;
		break;
	}

	for(let i = 0; i<12; i++) {
		let oneScale = [];
		for(let j=i; j<chromaCurrated.length; j++) {
			if(wantedScaleStepsVersion[scaleStepsIndex] == 1) {
				oneScale.push(chromaCurrated[j]);
			}
			scaleStepsIndex++;
			if(scaleStepsIndex%12 == 0) {
				//scaleStepsIndex += 12;
				scaleStepsIndex = 0;
			}
		}
		oneOfTwelve.push(oneScale);
	}
	return oneOfTwelve;
}

allTonalities.majors = makeTonalities('major');
allTonalities.minors = makeTonalities('minor');

console.log('allTonalities : ', allTonalities);



var do_Majeur = ['C2','E2','G2','C3','E3','G3','C4','E4','G4','C5','E5','G5'];
var do_mineur = ['C2','Dx2','G2','C3','Dx3','G3','C4','Dx4','G4','C5','Dx5','G5'];

var re_Majeur = ['D2','Fx2','A2','D3','Fx3','A3','D4','Fx4','A4','D5','Fx5','A5'];
var re_mineur = ['D2','F2','A2','D3','F3','A3','D4','F4','A4','D5','F5','A5'];

var mi_Majeur = ['E2','Gx2','B2','E3','Gx3','B3','E4','Gx4','B4','E5','Gx5','B5'];
var mi_mineur = ['E2','G2','B2','E3','G3','B3','E4','G4','B4','E5','G5','B5'];

var fa_Majeur = ['C2','F2','A2','C3','F3','A3','C4','F4','A4','C5','F5','A5',];
var fa_mineur = ['C2','F2','Gx2','C3','F3','Gx3','C4','F4','Gx4','C5','F5','Gx5'];

var sol_Majeur = ['D2','G2','B2','D3','G3','B3','D4','G4','B4','D5','G5','B5'];
var sol_mineur = ['D2','G2','Ax2','D3','G3','Ax3','D4','G4','Ax4','D5','G5','Ax5'];

var la_Majeur = ['Cx2','E2','A2','Cx3','E3','A3','Cx4','E4','A4','Cx5','E5','A5',];
var la_mineur = ['A2','C3','E3','A3','C4','E4','A4','C5','E5','A5','C6','E6'];

var si_Majeur = ['Dx2','Fx2','B2','Dx3','Fx3','B3','Dx4','Fx4','B4','Dx5','Fx5','B5',];
var si_mineur = ['D2','Fx2','B2','D3','Fx3','B3','D4','Fx4','B4','D5','Fx5','B5'];

var customNotesList = [];












var ACDEGGd = ['A2','C3','D3','E3','G3','Gx3','A3','C4','D4','E4','G4','Gx4','A4','C5','D5','E5','G5','Gx5','A5','A4','C5','D5','E5','G5','Gx5','A5','A4','C5','D5','E5','G5','Gx5','A5'];var siMajeur = [];
var reMajeur = ['D3','Fx3','A3','D4','Fx4','A4','D5','Fx5','A5','A4','D5','Fx5','A5'];
var fadMineur = [ 'A2', 'Cx3', 'Fx3', 'A3', 'Cx4', 'Fx4', 'A4', 'Cx5', 'Fx5', 'A4', 'Cx5', 'Fx5'];


var keyboardList = [{name: 'silence', frq: 0.00},{name: 'C0', frq: 16.35},{name: 'Cx0', frq: 17.32},{name: 'D0', frq: 18.35},{name: 'Dx0', frq: 19.45},{name: 'E0', frq: 20.60},{name: 'F0', frq: 21.83},{name: 'Fx0', frq: 23.12},{name: 'G0', frq: 24.50},{name: 'Gx0', frq: 25.96},{name: 'A0', frq: 27.50},{name: 'Ax0', frq: 29.14},{name: 'B0', frq: 30.87},{name: 'C1', frq: 32.70},{name: 'Cx1', frq: 34.65},{name: 'D1', frq: 36.71},{name: 'Dx1', frq: 38.89},{name: 'E1', frq: 41.20},{name: 'F1', frq: 43.65},{name: 'Fx1', frq: 46.25},{name: 'G1', frq: 49.00},{name: 'Gx1', frq: 51.91},{name: 'A1', frq: 55.00},{name: 'Ax1', frq: 58.27},{name: 'B1', frq: 61.74},{name: 'C2', frq: 65.41},{name: 'Cx2', frq: 69.30},{name: 'D2', frq: 73.42},{name: 'Dx2', frq: 77.78},{name: 'E2', frq: 82.41},{name: 'F2', frq: 87.31},{name: 'Fx2', frq: 92.50},{name: 'G2', frq: 98.00},{name: 'Gx2', frq: 103.83},{name: 'A2', frq: 110.00},{name: 'Ax2', frq: 116.54},{name: 'B2', frq: 123.47},{name: 'C3', frq: 130.81},{name: 'Cx3', frq: 138.59},{name: 'D3', frq: 146.83},{name: 'Dx3', frq: 155.56},{name: 'E3', frq: 164.81},{name: 'F3', frq: 174.61},{name: 'Fx3', frq: 185.00},{name: 'G3', frq: 196.00},{name: 'Gx3', frq: 207.65},{name: 'A3', frq: 220.00},{name: 'Ax3', frq: 233.08},{name: 'B3', frq: 246.94},{name: 'C4', frq: 261.63},{name: 'Cx4', frq: 277.18},{name: 'D4', frq: 293.66},{name: 'Dx4', frq: 311.13},{name: 'E4', frq: 329.63},{name: 'F4', frq: 349.23},{name: 'Fx4', frq: 369.99},{name: 'G4', frq: 392.00},{name: 'Gx4', frq: 415.30},{name: 'A4', frq: 440.00},{name: 'Ax4', frq: 466.16},{name: 'B4', frq: 493.88},{name: 'C5', frq: 523.25},{name: 'Cx5', frq: 554.37},{name: 'D5', frq: 587.33},{name: 'Dx5', frq: 622.25},{name: 'E5', frq: 659.25},{name: 'F5', frq: 698.46},{name: 'Fx5', frq: 739.99},{name: 'G5', frq: 783.99},{name: 'Gx5', frq: 830.61},{name: 'A5', frq: 880.00},{name: 'Ax5', frq: 932.33},{name: 'B5', frq: 987.77},{name: 'C6', frq: 1046.50},{name: 'Cx6', frq: 1108.73},{name: 'D6', frq: 1174.66},{name: 'Dx6', frq: 1244.51},{name: 'E6', frq: 1318.51},{name: 'F6', frq: 1396.91},{name: 'Fx6', frq: 1479.98},{name: 'G6', frq: 1567.98},{name: 'Gx6', frq: 1661.22},{name: 'A6', frq: 1760.00},{name: 'Ax6', frq: 1864.66},{name: 'B6', frq: 1975.53},{name: 'C7', frq: 2093.00},{name: 'Cx7', frq: 2217.46},{name: 'D7', frq: 2349.32},{name: 'Dx7', frq: 2489.02},{name: 'E7', frq: 2637.02},{name: 'F7', frq: 2793.83},{name: 'Fx7', frq: 2959.96},{name: 'G7', frq: 3135.96},{name: 'Gx7', frq: 3322.44},{name: 'A7', frq: 3520.00},{name: 'Ax7', frq: 3729.31},{name: 'B7', frq: 3951.07},{name: 'C8', frq: 4186.01},{name: 'Cx8', frq: 4434.92},{name: 'D8', frq: 4698.63},{name: 'Dx8', frq: 4978.03},{name: 'E8', frq: 5274.04},{name: 'F8', frq: 5587.65},{name: 'Fx8', frq: 5919.91},{name: 'G8', frq: 6271.93},{name: 'Gx8', frq: 6644.88},{name: 'A8', frq: 7040.00},{name: 'Ax8', frq: 7458.62},{name: 'B8', frq: 7902.13}];
var keyboardMap = makeMapByAttrFromList(keyboardList, 'name');
var tempScalesDictionnary = [do_Majeur,do_mineur,re_Majeur,re_mineur,mi_Majeur,mi_mineur,fa_Majeur,fa_mineur,sol_Majeur,sol_mineur,la_Majeur,la_mineur,si_Majeur,si_mineur];


var do_Majeur_chordNotes = ['C2','E2','G2','C3','E3','G3','C4','E4','G4','C5','E5','G5'];
var do_Majeur7_chordNotes = ['C2','E2','G2','B3','C3','E3','G3','B4','C4','E4','G4','B5','C5','E5','G5','B6'];
var do_Majeur7m_chordNotes = ['C2','E2','G2','Ax3','C3','E3','G3','Ax4','C4','E4','G4','Ax5','C5','E5','G5','Ax6'];
var do_mineur_chordNotes = ['C2','Dx2','G2','C3','Dx3','G3','C4','Dx4','G4','C5','Dx5','G5'];
var do_mineur7_chordNotes = ['C2','Dx2','G2','B3','C3','Dx3','G3','B4','C4','Dx4','G4','B5','C5','Dx5','G5','B6'];
var do_mineur7m_chordNotes = ['C2','Dx2','G2','Ax3','C3','Dx3','G3','Ax4','C4','Dx4','G4','Ax5','C5','Dx5','G5','Ax6'];

var dox_Majeur_chordNotes = [];
var dox_Majeur7_chordNotes = [];
var dox_mineur_chordNotes = [];
var dox_mineur7_chordNotes = [];


var re_Majeur_chordNotes = [];
var rex_Majeur_chordNotes = [];
var re_Majeur7_chordNotes = [];
var rex_Majeur7_chordNotes = [];
var re_mineur_chordNotes = [];
var rex_mineur_chordNotes = [];
var re_mineur7_chordNotes = [];
var rex_mineur7_chordNotes = [];

var mi_Majeur_chordNotes = [];
var mi_Majeur7_chordNotes = [];
var mi_mineur_chordNotes = [];
var mi_mineur7_chordNotes = [];
var fa_Majeur_chordNotes = [];
var fax_Majeur_chordNotes = [];
var fa_Majeur7_chordNotes = [];
var fax_Majeur7_chordNotes = [];
var fa_mineur_chordNotes = [];
var fax_mineur_chordNotes = [];
var fa_mineur7_chordNotes = [];
var fax_mineur7_chordNotes = [];

var sol_Majeur_chordNotes = [];
var solx_Majeur_chordNotes = [];
var sol_Majeur7_chordNotes = [];
var solx_Majeur7_chordNotes = [];
var sol_mineur_chordNotes = [];
var solx_mineur_chordNotes = [];
var sol_mineur7_chordNotes = [];
var solx_mineur7_chordNotes = [];
var la_Majeur_chordNotes = [];
var lax_Majeur_chordNotes = [];
var la_Majeur7_chordNotes = [];
var lax_Majeur7_chordNotes = [];
var la_mineur_chordNotes = [];
var lax_mineur_chordNotes = [];
var la_mineur7_chordNotes = [];
var lax_mineur7_chordNotes = [];

var si_Majeur_chordNotes = [];
var si_Majeur7_chordNotes = [];
var si_mineur_chordNotes = [];
var si_mineur7_chordNotes = [];







var scalesDictionnaryMap = new Map();
// scalesDictionnaryMap.set('C', do_Majeur);

var chosenNotes;
// chosenNotes = ACDEGGd;
// chosenNotes = chroma;



var tonalitiesLoopsList = [
	[

		['A2','C3','E3','A3','C4','E4','A4','C5','E5','A5','C6','E6'],
		['D2','G2','B2','D3','G3','B3','D4','G4','B4','D5','G5','B5'],
		['C2','F2','A2','C3','F3','A3','C4','F4','A4','C5','F5','A5',],
		['E2','Gx2','B2','E3','Gx3','B3','D3','E4','Gx4','B4','D4','E5','Gx5','B5','D5']
	],
	[
		['C3','C4'],
		do_Majeur_chordNotes,
		do_Majeur7_chordNotes,
		do_Majeur7m_chordNotes,

		['C3','C4'],
		do_mineur_chordNotes,
		do_mineur_chordNotes,
		do_mineur7_chordNotes
	]
];










var chosenTonalityLoop = [];

chosenTonalityLoop = allTonalities.majors;
chosenTonalityLoop = [manaC, manaD, manaF];

chosenNotes = chosenTonalityLoop[0];













// playSettings.modulation.shouldModulate = true;

displayChosenNotes();

var changingKeyIntervalId;
var modulationLooper = 0;
var modulationCount = 0
var stopModulationEngine = false;

function startModulationEngine() {

	if(!isPlaying || stopModulationEngine) {
		clearInterval(changingKeyIntervalId);
		return false;
	}

	if(changingKeyIntervalId == null) {
		changingKeyIntervalId = setInterval(function() {
			modulationLooper++;
			if(modulationLooper >= chosenTonalityLoop.length) {
				modulationCount++;
				modulationLooper = 0;
			}

			handleSwitchToNewScale(chosenTonalityLoop[modulationLooper]);
		}, 4*tempoInMs);
	}
}





var scales = [];


var currentScale = {
	notes: [],
	notesLeftHand: [],
	notesRightHand: [],
	info: {
		currentScaleFrqProportions: null,
		scaleAverageFrequency: null
	}
};


let currentScaleAllFrequencies = [];
let scaleAverageFrequency = 0;

function initScale() {

	currentScale = {
		notes: [],
		notesLeftHand: [],
		notesRightHand: [],
		info: {
			currentScaleFrqProportions: null,
			scaleAverageFrequency: null
		}
	};

	for (i = 0; i < chosenNotes.length; i++) {
		let test = keyboardMap.get(chosenNotes[i]);
		currentScale.notes.push(keyboardMap.get(chosenNotes[i])[0]);
		currentScaleAllFrequencies.push(keyboardMap.get(chosenNotes[i])[0].frq);
	}
	let currentScaleFrqProportions = currentScaleAllFrequencies.map(
		function(frequence) {
			return {frenquencyInHz: frequence, heightProportionality: frequence/this};
		},
		Math.max.apply(0, currentScaleAllFrequencies)
	);
	currentScaleFrqProportions = [...new Map(currentScaleFrqProportions.map((item) => [item["frenquencyInHz"], item])).values()];
	currentScale.info.currentScaleFrqProportions = currentScaleFrqProportions;

	const sum = currentScaleAllFrequencies.reduce((a, b) => a + b, 0);
	currentScale.info.scaleAverageFrequency = (sum / currentScaleAllFrequencies.length) || 0;


	// split into two hands in the middle
	for (var i = 0; i < currentScale.notes.length; i++) {
	 	if(currentScale.notes[i].frq < currentScale.info.scaleAverageFrequency) {
	 		currentScale.notesLeftHand.push({...currentScale.notes[i]});
	 	} else {
			currentScale.notesRightHand.push({...currentScale.notes[i]});
	 	}
	} 

}




function injectVolumeRangesInDom() {
	let output = '';
	for(let i=0; i<voices.length; i++) {
		output += '<li>';
		let volumeNumber = parseInt(i)*1+1;
		output += '<label for="volume0">Volume ' + volumeNumber + '</label>';
		output += '<input type="range" class="volume-control" name="volume' + i + '" id="volume' + i + '" min="0" max="100" step="1" value="50">';
		output += '<output class="volume-output" id="output-volume' + i + '" for="volume"></output>';
		output += '</li>';
	}
	$('#volumeContainer ul').html(output);
}

/*
var r=[1, 80, 2000] ;

r.map(function(a){
   return a/this;
}, Math.max.apply(0,r) );

//==[0.0005,0.04,1]
*/
