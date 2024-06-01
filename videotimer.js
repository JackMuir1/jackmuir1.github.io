
const startButton = document.getElementById('startButton');
const timeset = document.getElementById('timerlength');
const Passset = document.getElementById('passSet');

let pass = "3325"

const startmenu = document.getElementById('start');
const gamemenu = document.getElementById('game');
const resultmenu = document.getElementById('result');

let timerDisplay = null;
let submitButton = null;
let passcodeInput = null;

let timerInterval;
let timeInSeconds = 20;

    submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', submitCode);
    passcodeInput = document.getElementById('passcodeInput');

function submitCode() {
    const passcode = passcodeInput.value.trim();
    if (passcode.length === 4) {
        if (passcode === pass) { // Change this to your desired passcode
            win();
        } else {
            passcodeInput.value = '';
            alert('Passcode incorrect. Try again.');
        }
    }
    else
    {
        alert('Passcode must be 4 digits');
    }
}

function win()
{
    gamemenu.innerHTML = "";
    resultmenu.innerHTML = "<center><img src='victory.png' width='66%'></center>";
}
function lose()
{
    gamemenu.innerHTML = "";
    resultmenu.innerHTML = "<center><h2>Time's Up</h2><video width='640' height='360' controls autoplay><source src='explosion.mp4' type='video/mp4'>Your browser does not support the video tag.</video></center>";
}

// function updateTimer() {
//     timeInSeconds--;

//     if(timeInSeconds <= 0)
//     {
//         stopTimer();
//         lose();
//     }

//     const minutes = Math.floor(timeInSeconds / 60);
//     const seconds = timeInSeconds % 60;
//     timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
// }

// function stopTimer() {
//     clearInterval(timerInterval);
//     startButton.disabled = false;
//     timeInSeconds = 0;
//     timerDisplay.textContent = '00:00';
// }

//startButton.addEventListener('click', startTimer);


const video = document.getElementById('myVideo');

    video.addEventListener('ended', function() {
        videoEnded();
    });

    function videoEnded() {
        lose()
    }