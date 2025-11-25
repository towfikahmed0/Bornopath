import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, EmailAuthProvider, deleteUser, reauthenticateWithCredential, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, getDoc, updateDoc, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

import { ErrorHandler } from './error-handler.js';
import { FirebaseErrorHandler } from './firebase-error-handler.js';

let app, auth, db;

try {
    // Load environment variables
    Env.load();

    // Get Firebase config from environment
    const firebaseConfig = FirebaseConfig.getConfig();

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    console.log('✅ Firebase initialized successfully');

} catch (error) {
    console.error('❌ Firebase initialization failed:', error);

    // Show user-friendly error
    const status = document.getElementById('status');
    if (status) {
        status.innerHTML = `
            <div class="alert alert-danger">
                <strong>Configuration Error:</strong> Unable to initialize application.
            </div>
        `;
        status.style.display = 'block';
    }
    throw error;
}

// Access environment variables anywhere
const appVersion = Env.get('APP_VERSION');
console.log(`🚀 Bornopath v${appVersion}`);

// Get Firebase config
// const firebaseConfig = FirebaseConfig.getConfig();
// 
// Global variable to store user data once fetched
let currentUserData = null;
let score = 0; // Initialize score variable
let dictionary = [];
let practicedQuestionsIdx = [];
let sessionQuestionsIdx = [];
let dictionaryLoadedPromise = null;
const suggestionsContainer = document.getElementById('suggestions-container');
// Fetch dictionary data from the remote JSON file
async function fetchDictionary() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/towfikahmed0/e2b_dictionary/refs/heads/main/dictionary.json');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        dictionary = await response.json();
        console.log("Dictionary loaded successfully.");

    } catch (error) {
        ErrorHandler.handleError({
            type: ErrorHandler.ERROR_TYPES.DICTIONARY,
            message: error.message,
            showToast: true,
            allowRetry: true,
            retryAction: fetchDictionary
        });
        throw error; // Re-throw to stop execution
    }
}

// Use a promise to track dictionary loading
dictionaryLoadedPromise = fetchDictionary();
async function getUserData(email) {
    try {
        return await FirebaseErrorHandler.safeFirestoreOperation(async () => {
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.warn("No user data found for email:", email);
                return null;
            }

            currentUserData = querySnapshot.docs[0].data();

            await updateDoc(doc(db, "users", querySnapshot.docs[0].id), {
                lastActive: new Date()
            });

            return currentUserData;
        }, { operation: 'getUserData', email });

    } catch (error) {
        ErrorHandler.handleError({
            type: ErrorHandler.ERROR_TYPES.FIRESTORE,
            message: error.message,
            context: { action: 'getUserData', email },
            showToast: true
        });
        return null;
    }
}

function updateUIWithUserData(userData) {
    if (!userData) {
        console.error("No user data provided to update UI.");
        return;
    }


    // Load user data into the UI
    for (let i = 0; i < document.getElementsByClassName('profileAvatar').length; i++) {
        document.getElementsByClassName('profileAvatar')[i].alt = userData.name;
        document.getElementsByClassName('profileAvatar')[i].src = `https://placehold.co/600x400?text=${userData.name[0]}`; // Use a placeholder if no avatar
    }

    document.getElementById('user-name').textContent = userData.name;
    document.getElementById('user-email').textContent = userData.email;
    document.getElementById('user-dob').innerHTML = '<i class="fa fa-id-badge"></i> ' + userData.userClass;
    document.getElementById('user-gender').innerHTML = '<i class="fa fa-male"></i> ' + userData.gender; // Corrected to use the actual data

    // Load stats (still hardcoded - consider fetching from Firestore)

    for (let i = 0; i < document.getElementsByClassName('totalScore').length; i++) {
        document.getElementsByClassName('totalScore')[i].textContent = userData.points
    }
    for (let i = 0; i < document.getElementsByClassName('qnAtmpt').length; i++) {
        document.getElementsByClassName('qnAtmpt')[i].textContent = userData.totalQuestions;
    }
    for (let i = 0; i < document.getElementsByClassName('streak-days').length; i++) {
        document.getElementsByClassName('streak-days')[i].textContent = userData.streak;
    }
    for (let i = 0; i < document.getElementsByClassName('accuracy').length; i++) {
        document.getElementsByClassName('accuracy')[i].textContent = `${userData.accuracy * 100}%`;
    }
    for (let i = 0; i < document.getElementsByClassName('leaderboard-rank').length; i++) {
        document.getElementsByClassName('leaderboard-rank')[i].textContent = userData.leaderboardRank
    }
    //document.getElementsByClassName("user-streak")[0].innerHTML=userData.streak;
    fetchPracticeDataAndRenderChart(7);
    updateStreakDays();
    updateUserProgress();
    updateLeaderboardFromFirestore();
    console.log("UI updated successfully.");

}
// THIS IS THE CRUCIAL CHANGE:
// Attach the DOMContentLoaded listener directly at the global scope.
document.addEventListener('DOMContentLoaded', async function () {
    console.log("DOMContentLoaded event fired."); // Confirmation log

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log("No user signed in. Redirecting...");
            window.location.replace("index.html");
        } else {
            console.log("User signed in:", user.email);
            //save email in local storage
            localStorage.setItem("userEmail", user.email);
            // Fetch user data and then update the UI
            const userData = await getUserData(user.email);
            if (userData) {
                try {
                    updateUIWithUserData(userData);
                } catch (error) {
                    document.getElementsByTagName('body')[0].innerHTML = `
    <div class="container text-center m-5">
    <h1><i class="fa fa-exclamation-triangle"></i> Error Updating UI :(</h1>
    <p>There was an error loading the UI. Please try again later.</p>
    <button class="btn btn-primary" onclick="window.location.reload()">Reload</button>
    <button class="btn btn-danger" onclick="signOut()">Sign Out</button>
    </div>`;
                }
            }
        }
    });
});
window.signOut = function () {
    if (confirm("Do you really want to sign out?")) {
        signOut(auth).then(() => {
            console.log("User signed out successfully.");
            window.location.replace("index.html");
        }).catch((error) => {
            console.error("Error signing out:", error);
            alert("Sign out failed. Please try again.");
        });
    }
}
let timerInitialized = false;
document.addEventListener('DOMContentLoaded', function () {
    // Practice button event listeners
    document.querySelector('.quick-practice').addEventListener('click', function () {
        // Initialize quick practice
        restartQuizUI()
        document.getElementById('dashboardContant').style.display = 'none';
        document.getElementById("quizContainer").style.display = 'block';
        // document.getElementById("quiz-loadingSpinner").style.display = 'block';
        score = 0; // Initialize score before updating UI
        document.getElementById("quiz-point").innerText = `Point: ${score}`;
        document.getElementById('quizEnd').style.display = 'none';
        document.getElementById('customize_quiz').style.display = 'none';
        document.getElementById('unlimitedTest').style.display = 'none';
        document.getElementById('quiz').style.display = 'none';
        //document.getElementById("quiz-loadingSpinner").style.display = 'none';
        document.getElementById('practiceTypeSelectionContainer').style.display = 'block';

        return;
    });

    document.querySelector('.customized-test').addEventListener('click', function () {
        restartQuizUI()
        document.getElementById("quizContainer").style.display = 'block';
        document.getElementById("quiz-loadingSpinner").style.display = 'block';
        try {
            document.getElementById('dashboardContant').style.display = 'none';
            document.getElementById('quiz').style.display = 'none';
            document.getElementById('quizEnd').style.display = 'none';
            document.getElementById('unlimitedTest').style.display = 'none';
            document.getElementById("customize_quiz").style.display = 'block';
            document.getElementById("quizContainer").style.display = 'block';
            document.getElementById("quiz-loadingSpinner").style.display = 'none';
            score = 0; // Reset score for customized test


            // action handed over to intializeCustomizedTest function
        } catch (error) {
            console.error("Error initializing quick practice:", error);
            document.getElementById("quiz-loadingSpinner").style.display = 'block';
            return;
        }
    });

    document.querySelector('.unlimited-practice').addEventListener('click', function () {
        restartQuizUI()
        document.getElementById("unlimitedTest").style.display = 'block';
        document.getElementById('dashboardContant').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'block';
        document.getElementById('quiz').style.display = 'none';
        document.getElementById('quizEnd').style.display = 'none';
        document.getElementById('customize_quiz').style.display = 'none';
        //window.scrollTo({ top: document.getElementById('content').scrollHeight, behavior: 'smooth' });

    });
})
// --------------------------------Word of the Day--------------------------------------------------------------


fetchDictionary().then(() => {
    // After fetching the dictionary, check for the word of the day
    setWordOfDay();
});

window.setWordOfDay = function () {
    const container = document.getElementById('wordOfDay');
    container.innerHTML = `
        <h2 class="section-title">Word of the Day</h2>
        <div class="word-card">
            <div class="loading" id="btnSpinner"></div>
            <h5 class="loading-text">Word Loading...</h5>
        </div>`;

    onAuthStateChanged(auth, async (user) => {
        let wordofdayIdx;
        let highlightAccuracy = null;


        // fallback to random word
        const date = new Date().getDate();
        if (!wordofdayIdx) {
            if (localStorage.getItem(date)) {
                wordofdayIdx = localStorage.getItem(date);
            } else {
                localStorage.clear();
                wordofdayIdx = Math.floor(Math.random() * dictionary.length);
                localStorage.setItem(date, wordofdayIdx);
            }
        }

        const wordofday = dictionary[wordofdayIdx];

        try {
            displayWordDetails(wordofday, "wordOfDay")
        } catch (err) {
            console.error(err);
            container.innerHTML = `<h2 class="section-title">Word of the Day</h2>
                                   <div class="word-card">
                                     <h3>No word of the day available.</h3>
                                     <button onclick="localStorage.clear(); setWordOfDay()" class='btn'>Try Again</button>
                                   </div>`;
        }
    });
};





//---------------------------------------!IMPORTANT!------------------------------------------------------------------
//-------------------------------------MAIN QUIZ FUNCTION-------------------------------------------------------------
//-------------------------------------MAIN QUIZ FUNCTION-------------------------------------------------------------
window.intialQuestions = async function (QNo, limit, mood) {

    try {
        await dictionaryLoadedPromise;

        if (!dictionary || dictionary.length === 0) {
            throw new Error('Dictionary not loaded');
        }


        await dictionaryLoadedPromise;
        restartQuizUI();

        if (QNo === undefined) QNo = 0;
        // Unlimited practice: limit is NaN
        const isUnlimited = isNaN(limit);

        if (!dictionary || dictionary.length === 0) {
            window.location.reload();
            return;
        }

        // End condition for unlimited practice
        if (QNo == limit) {
            document.getElementById("quiz").style.display = 'none';
            document.getElementById('quizEnd').style.display = 'block';

            // prevent page reload/navigation while final score is being processed
            window.preventReload = true;

            // show browser "are you sure" dialog on refresh/close/navigation
            window.onbeforeunload = function (e) {
                if (!window.preventReload) return;
                e.preventDefault();
                e.returnValue = '';
                return '';
            };

            // block common reload shortcuts (F5, Ctrl/Cmd+R)
            function _blockReloadKeys(e) {
                if (!window.preventReload) return;
                const k = e.key;
                if (
                    k === 'F5' ||
                    k === 'f5' ||
                    (e.ctrlKey && (k === 'r' || k === 'R')) ||
                    (e.metaKey && (k === 'r' || k === 'R'))
                ) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const st = document.getElementById('stutas');
                    if (st) {
                        st.innerText = 'Reload is disabled while score is being processed.';
                        setTimeout(() => { st.innerText = ''; }, 2000);
                    } else {
                        console.warn('Reload prevented.');
                    }
                }
            }
            window.addEventListener('keydown', _blockReloadKeys, true);

            document.getElementById("finalScore").innerHTML = `${score}/${limit}`;
            document.getElementById("prac_accuracy").innerHTML = `${((score / limit) * 100).toFixed(2)}%`;
            await updateScoreInFirestore(score, limit);
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    console.log("No user signed in. Redirecting...");
                    window.location.replace("index.html");
                } else {
                    console.log("User signed in:", user.email);
                    // Fetch user data and then update the UI
                    const userData = await getUserData(user.email);
                    if (userData) {
                        // Update the UI with user data
                        try {
                            updateUIWithUserData(userData)
                        } catch (error) {
                            console.error("Error updating UI with user data:", error);
                        }
                    }
                }
            });
            return; // End the practice session
        }

        // Unlimited practice: generate a random question each time
        let questions_idx;
        if (isUnlimited) {
            questions_idx = Math.floor(Math.random() * dictionary.length);
        } else {
            // Only generate if not already done
            if (sessionQuestionsIdx.length === 0) {
                sessionQuestionsIdx = await generateQuestionsIdxArray(parseInt(limit));
                if (!sessionQuestionsIdx || sessionQuestionsIdx.length === 0) {
                    console.error("generateQuestionsIdxArray returned empty array!");
                    return;
                }
            }
            questions_idx = sessionQuestionsIdx[QNo];
        }

        let today = new Date();
        let dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

        let practicedQuestionsIdxData = { [questions_idx]: { pracDate: dateStr, correctAttempts: 0, totalAttempts: 0 } };
        practicedQuestionsIdx.push(practicedQuestionsIdxData);

        let questionsWrd = dictionary[questions_idx];

        // Generate random options
        let genaratedOptions = [];
        if (mood === 'en2bn') {
            // For English to Bangla practice
            console.log("Initializing English to Bangla practice");
            const correctAnswer = questionsWrd['bn'][Math.floor(Math.random() * questionsWrd['bn'].length)];
            const optionsSet = new Set();
            optionsSet.add(correctAnswer);

            while (optionsSet.size < 4) {
                const randomEntry = dictionary[Math.floor(Math.random() * dictionary.length)];
                const randomBn = randomEntry['bn'][Math.floor(Math.random() * randomEntry['bn'].length)];
                optionsSet.add(randomBn);
            }
            genaratedOptions = Array.from(optionsSet);
        } else if (mood === 'en2en') {
            // For English to English practice
            console.log("Initializing English to English practice");
            const correctAnswer = questionsWrd['syn'][Math.floor(Math.random() * questionsWrd['syn'].length)];
            const optionsSet = new Set();
            optionsSet.add(correctAnswer);

            while (optionsSet.size < 4) {
                const randomEntry = dictionary[Math.floor(Math.random() * dictionary.length)];
                const randomSynArr = randomEntry['syn'];
                if (Array.isArray(randomSynArr) && randomSynArr.length > 0) {
                    const randomSyn = randomSynArr[Math.floor(Math.random() * randomSynArr.length)];
                    optionsSet.add(randomSyn);
                }
            }
            genaratedOptions = Array.from(optionsSet);
        }
        //display the question and options
        document.getElementById("questionIdx").innerText = questions_idx;
        if (Math.random() < 0.5) {
            // Option 1: Shuffle the options array
            genaratedOptions = genaratedOptions.sort(() => Math.random() - 0.5);
        } else {
            // Option 2: Reverse the options array
            genaratedOptions = genaratedOptions.reverse();
        }
        document.getElementById("questionText").innerHTML = `What is the correct meaning of the word <span style='color: #159895; font-weight: bold;' 
  onclick='speakWord("${questionsWrd['en']}")'>"${questionsWrd['en']}"</span>?`;

        for (let i = 0; i < document.getElementsByClassName('option-text').length; i++) {
            document.getElementsByClassName('option-text')[i].innerText = "";
            document.getElementsByClassName('option-text')[i].innerText = genaratedOptions[i];
        }
        for (let i = 0; i < document.getElementsByClassName('quiz-option').length; i++) {
            document.getElementsByClassName('quiz-option')[i].removeAttribute("onclick");
            if (mood === 'en2en') {
                document.getElementsByClassName('quiz-option')[i].setAttribute("onclick", `selectOption(this, "${mood}"); speakWord("${genaratedOptions[i]}")`);
            } else {
                document.getElementsByClassName('quiz-option')[i].setAttribute("onclick", `selectOption(this, "${mood}")`);
            }
        }
        timerInitialized = true;
        document.getElementById("quizTimer").style.display = 'block';
        document.getElementById('btnNext').removeAttribute("onclick");
        document.getElementById("stutas").innerHTML = `Question <span>${QNo + 1}</span>`;
        if (isUnlimited) {
            document.getElementById("progressText").style.display = 'none';
            document.getElementById('quizTimer').innerHTML = 'Infinity';
            document.getElementsByClassName('progress-bar')[0].style.display = 'none';
            document.getElementById('endUnlimitedPractice').removeAttribute("onclick");
            document.getElementById("endUnlimitedPractice").setAttribute("onclick", `intialQuestions(${QNo + 1}, ${QNo + 1}, "${mood}")`);
            document.getElementById("endUnlimitedPractice").style.display = 'block';
            document.getElementById("btnNext").setAttribute("onclick", `intialQuestions(${QNo + 1}, ${limit}, "${mood}")`);

            return; // Exit for unlimited practice
        }
        document.getElementById("btnNext").setAttribute("onclick", `intialQuestions(${QNo + 1}, ${limit}, "${mood}")`);

        limit = parseInt(limit)
        document.getElementById("progressText").innerHTML = `Question ${QNo + 1}/<span id='Qlimit'>${limit}</span>`;
        document.getElementById("quizProgress").style.width = `${((QNo + 1) / limit) * 100}%`;
        if (QNo !== 0) {
            startTimer(((parseInt(document.getElementById('quizTimer').innerHTML.split(':')[1].trim()) * 60) + parseInt(document.getElementById('quizTimer').innerHTML.split(':')[2].trim())) - 1);
        }
        speakWord(questionsWrd['en']);
        return;
    } catch (error) {
        ErrorHandler.handleError({
            type: ErrorHandler.ERROR_TYPES.QUIZ,
            message: error.message,
            context: { QNo, limit, mood },
            showToast: true,
            allowRetry: true,
            retryAction: () => window.intialQuestions(QNo, limit, mood)
        });
    }
}

async function startTimer(time) {
    if (time === undefined) {
        return; // Exit if time is not valid
    }
    const timerElement = document.getElementById('quizTimer');
    let timeLeft = time;
    const timerInterval = setInterval(() => {
        if (document.getElementById("quizContainer").style.display === 'none') {
            clearInterval(timerInterval);
            restartQuizUI()
            return; // Exit if quiz container is not visible
        }
        if (!timerInitialized) {
            clearInterval(timerInterval);
            return; // Exit if timer is not initialized
        }
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById("quiz").style.display = 'none';
            document.getElementById('quizEnd').style.display = 'block';
            intialQuestions(parseInt(document.getElementById("stutas").childNodes[1].innerText), parseInt(document.getElementById("stutas").childNodes[1].innerText));

        } else {
            timerElement.textContent = `Time left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
            timeLeft--;
        }
    }, 1000);
}

window.intializeCustomizedTest = async function () {
    // Wait for dictionary to load
    await dictionaryLoadedPromise;

    // Initialize customized test settings
    document.getElementById("quizContainer").style.display = 'block';
    document.getElementById('customize_quiz').style.display = 'none';
    document.getElementById('dashboardContant').style.display = 'none';
    document.getElementById('quizEnd').style.display = 'none';
    score = 0; // Reset score for customized test
    timerInitialized = true; // Start the timer
    practicedQuestionsIdx = []; // Reset practiced questions index
    sessionQuestionsIdx = []; // Reset session questions index
    intialQuestions(0, document.getElementById('quizLimit').value, document.getElementById('practiceType').value);
    startTimer(parseInt(document.getElementById('quizTime').value) * 60); // Convert minutes to seconds
}

window.intialUnlimitedPractice = async function () {
    // Wait for dictionary to load
    await dictionaryLoadedPromise;

    document.getElementById("quizContainer").style.display = 'block';
    document.getElementById('dashboardContant').style.display = 'none';
    document.getElementById('unlimitedTest').style.display = 'none';
    score = 0; // Reset score for unlimited practice
    practicedQuestionsIdx = []; // Reset practiced questions index
    sessionQuestionsIdx = []; // Reset session questions index
    intialQuestions(0, NaN, document.getElementById('unlimited_practiceType').value); // Call the function to initialize unlimited practice
}

//---------------MOOD SELECTION FOR QUICK PRACTICE----------------
window.moodselection = async function (QNo, limit, mood) {
    // Wait for dictionary to load
    await dictionaryLoadedPromise;

    document.getElementById("quizContainer").style.display = 'block';
    document.getElementById("quiz-loadingSpinner").style.display = 'block';
    practicedQuestionsIdx = []; // Reset practiced questions index
    sessionQuestionsIdx = []; // Reset session questions index
    try {
        score = 0; // Initialize score before updating UI

        document.getElementById("quiz-point").innerText = `Point: ${score}`;
        document.getElementById('dashboardContant').style.display = 'none';
        document.getElementById('quizEnd').style.display = 'none';
        document.getElementById('customize_quiz').style.display = 'none';
        document.getElementById('unlimitedTest').style.display = 'none';
        document.getElementById("quiz-loadingSpinner").style.display = 'none';
        document.getElementById('quiz').style.display = 'block';
        document.getElementById('practiceTypeSelectionContainer').style.display = 'none';
        timerInitialized = true; // Start the timer
        document.getElementById("quizTimer").innerHTML = "Time left: 5:00";
        startTimer(300) // Start the timer for 5 minutes
        document.getElementById("quizTimer").style.display = 'block';
        intialQuestions(QNo, limit, mood);
        return;
    } catch (error) {
        console.error("Error initializing quick practice:", error);
        document.getElementById("quiz-loadingSpinner").style.display = 'block';
        return;
    }

}


//-----------------------SELECTING AN OPTION---------------------------
window.selectOption = function (selectedOption, mood) {
    let userSelectedOption = selectedOption.children[1].innerText;
    let questionIdx = document.getElementById("questionIdx").innerText;
    let isAnswerCorrect = false;

    // If this is the first attempt, set default score value
    if (!dictionary[questionIdx].attemptScore && dictionary[questionIdx].attemptScore !== 0) {
        dictionary[questionIdx].attemptScore = 1.0;
    }

    // Find or create practicedQuestionsIdx entry for this question (new format: { [idx]: { correctAttempts, totalAttempts } })
    let practicedIdxObj = practicedQuestionsIdx.find(obj => Object.keys(obj)[0] == questionIdx);
    if (!practicedIdxObj) {
        practicedIdxObj = { [questionIdx]: { correctAttempts: 0, totalAttempts: 0 } };
        practicedQuestionsIdx.push(practicedIdxObj);
    }
    practicedIdxObj[questionIdx].totalAttempts += 1;

    if (mood === 'en2bn') {
        // For English to Bangla practice
        for (let i = 0; i < dictionary[questionIdx]['bn'].length; i++) {
            if (userSelectedOption === dictionary[questionIdx]['bn'][i]) {
                selectedOption.classList.add('correct');
                document.getElementById("stutas").innerText = "Correct! Well done.";
                isAnswerCorrect = true;

                score += dictionary[questionIdx].attemptScore;

                document.getElementById("btnNext").style.display = 'block';
                timerInitialized = false;

                // Disable further clicks
                let options = document.getElementsByClassName('quiz-option');
                for (let i = 0; i < options.length; i++) {
                    options[i].removeAttribute("onclick");
                }
                document.getElementById("quiz-point").innerText = `Point: ${score}`;
                let alloptions = [];
                for (let i = 0; i < document.getElementsByClassName('quiz-option').length; i++) {
                    alloptions[i] = document.getElementsByClassName('quiz-option')[i].innerText.slice(2);
                }
                showCorrectAnsDtls(questionIdx, alloptions, dictionary[questionIdx]['bn'][i]);

                practicedIdxObj[questionIdx].correctAttempts += 1;

                return;
            }
        }
    } else if (mood === 'en2en') {
        // For English to English practice
        for (let i = 0; i < dictionary[questionIdx]['syn'].length; i++) {
            if (userSelectedOption === dictionary[questionIdx]['syn'][i]) {
                selectedOption.classList.add('correct');
                document.getElementById("stutas").innerText = "Correct! Well done.";
                isAnswerCorrect = true;

                score += dictionary[questionIdx].attemptScore;

                document.getElementById("btnNext").style.display = 'block';
                timerInitialized = false;

                // Disable further clicks
                let options = document.getElementsByClassName('quiz-option');
                for (let i = 0; i < options.length; i++) {
                    options[i].removeAttribute("onclick");
                }
                document.getElementById("quiz-point").innerText = `Point: ${score}`;
                let alloptions = [];
                for (let i = 0; i < document.getElementsByClassName('quiz-option').length; i++) {
                    alloptions[i] = document.getElementsByClassName('quiz-option')[i].innerText.slice(2);
                }
                showCorrectAnsDtls(questionIdx, alloptions, dictionary[questionIdx]['syn'][i]);

                practicedIdxObj[questionIdx].correctAttempts += 1;

                return;
            }
        }
    } else {
        document.getElementById("stutas").innerText = "Invalid mood selected. Please try again.";
        return;
    }

    if (!isAnswerCorrect) {
        selectedOption.classList.add('incorrect');
        document.getElementById("stutas").innerText = "Incorrect!";
        dictionary[questionIdx].attemptScore = Math.max(0, dictionary[questionIdx].attemptScore - 0.5);
        document.getElementById("quiz-point").innerText = `Point: ${score}`;
    }
    document.getElementById("quiz-point").innerText = `Point: ${score}`;
}

//-----------------------SHOW CORRECT ANSWER DETAILS---------------------------
function showCorrectAnsDtls(ansIdx, options, correctOption) {
    let correctAnsData = dictionary[ansIdx]
    document.getElementById('additionalWordInfo').style.display = 'block';

    document.getElementById('additionalWordInfo').innerHTML = `
  <h2 class="section-title">Answer Details</h2>
          <div class="word-card">
            <div class="word-header">
              <h1 id="ansWrd"><span>${correctAnsData['en']}</span> <button class="btn" onclick="speakWord('${correctAnsData['en']}')">🔊 Pronounce</button></h1>
            </div>

            <div class="word-definition">
              <p>${correctAnsData['def']}</p>
              <p class="example">"${correctAnsData['bn']}"</p>
            </div>

            <div class="word-details">
              <div class="synonyms">
                <h4><i class="fa fa-sync"></i> Synonyms</h4>
                <p>${correctAnsData['syn']}</p>
              </div>

              <div class="antonyms">
                <h4><i class="fa fa-exchange"></i> Antonyms</h4>
                <p>${correctAnsData['ant']}</p>
              </div>
            </div>
            <div>
                    <img src="https://www.english-bangla.com/public/images/words/D${correctAnsData['en'][0].toLowerCase()}/${correctAnsData['en'].toLowerCase()}" style="width: 100%; height: auto; border-radius: 8px; margin-top: 10px;" alt="Image related to ${correctAnsData['en']}" onerror="this.style.display='none'">
            </div>
            <br>
            <button class="btn btn-primary" 
  onclick="
    generateAIExplanation(
      '${correctAnsData['en']}',
      '${options}',
      '${correctOption}'
    );
    this.style.display='none';
    window.scrollTo({ top: document.getElementById('quizContainer').scrollHeight, behavior: 'smooth' });
  ">
  AI Explanation
</button>
            <br>
            <div id="ai-explanation-2" class="mb-3" style="display: none;">
              <div class="loading" id="loadingDiv">
              <span id="btnSpinner" class="loading-spinner"></span><br>
              <h5 class="loading-text">Generating AI Explanation...</h5>
              </div>
            </div>
          </div>

        `;
}

//-----------------------AI EXPLANATION USING PUTER.AI---------------------------
// Function to generate AI explanation
window.generateAIExplanation = async function (word, options, correctOption) {
    document.getElementById('ai-explanation-2').style.display = 'block';
    //Generate prompt
    const prompt = `
"${word}" এই ইংরেজি শব্দটির অর্থ ${options} অপশনগুলোর মধ্যে থেকে ${correctOption} কেন সঠিক, তা ব্যাখ্যা করো।
উত্তরের ব্যাখ্যার মধ্যে:
- শব্দটির বাংলা অর্থ দাও
- কেন ${correctOption} সঠিক তা ব্যাখ্যা করো
- শব্দটির ব্যাকরণগত শ্রেণি (noun/verb/adjective ইত্যাদি) উল্লেখ করো(in english)
- শব্দটির অর্থ বোঝাতে অন্তত ৩টি ইংরেজি বাক্যে ব্যবহার করে উদাহরণ দাও(in english)
ফলাফলটি বাংলায় উপস্থাপন করো এবং <b>, <i>, <p>, <ul>, <li> ইত্যাদি HTML ট্যাগ ও inline-css ব্যবহার করে সুন্দরভাবে ফরম্যাট করো। h1, h2, h3, h4 ট্যাগ ব্যবহার করো না। ইংরেজি সব্দকে বাংলায় লিখো না।`;
    try {
        // Call AI API to get explanation
        const aiExplaination = await puter.ai.chat(prompt, { model: "gpt-4.1-nano" });
        // Display AI explanation in the modal
        if (document.getElementById("ansWrd").childNodes[0].innerText !== word) {
            return; // Exit if the word has changed
        }

        document.getElementById("ai-explanation-2").innerHTML = `
      <h3><i class="fa fa-graduation-cap" aria-hidden="true"></i> AI Explanation</h3><br>
      <div>${aiExplaination.message.content}</div>`;
    } catch (error) {
        console.error("Error calling API:", error);
        document.getElementById("ai-explanation-2").innerHTML = `
      <p>AI explanation not available :( </p>`;
    }
}


//-----------------------UPDATE SCORE IN FIRESTORE---------------------------
async function updateScoreInFirestore(correctAnswersThisSession, questionsThisSession) {
    try {
        return await FirebaseErrorHandler.safeFirestoreOperation(async () => {
            const user = auth.currentUser;
            if (!user) throw new Error("No user signed in");



            const userRef = collection(db, "users");
            const userQuery = query(userRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(userQuery);

            if (querySnapshot.empty) {
                console.warn("No user data found for email:", user.email);
                return Promise.reject("No user data found for email: " + user.email);
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // পুরনো মান বের করা
            const currentPoints = userData.points || 0;
            const currentTotalQuestions = userData.totalQuestions || 0;
            const currentPracData = userData.pracData || {};

            // নতুন মান হিসাব করা
            const newPoints = currentPoints + correctAnswersThisSession;
            const newTotalQuestions = currentTotalQuestions + questionsThisSession;
            console.log(new Date().toISOString().split('T')[0]);

            const today = getLocalDate();
            const newPracData = {
                ...currentPracData,
                [today]: {
                    correctAnswers: (currentPracData[today]?.correctAnswers || 0) + correctAnswersThisSession,
                    totalQuestions: (currentPracData[today]?.totalQuestions || 0) + questionsThisSession
                }
            };


            const newAccuracy = newTotalQuestions > 0
                ? parseFloat((newPoints / newTotalQuestions).toFixed(2))
                : 0;

            // Update practiced questions data (convert array to object format)
            let mergedPracticedQuestionsIdx = typeof userData.practicedQuestionsIdx === "object" && !Array.isArray(userData.practicedQuestionsIdx)
                ? { ...userData.practicedQuestionsIdx }
                : {};

            practicedQuestionsIdx.forEach(newItem => {
                const newIdx = Object.keys(newItem)[0];
                const newStats = newItem[newIdx];

                if (mergedPracticedQuestionsIdx[newIdx]) {
                    // Merge attempts
                    mergedPracticedQuestionsIdx[newIdx].correctAttempts += newStats.correctAttempts;
                    mergedPracticedQuestionsIdx[newIdx].totalAttempts += newStats.totalAttempts;
                    // Update pracDate to latest
                    mergedPracticedQuestionsIdx[newIdx].pracDate = newStats.pracDate || mergedPracticedQuestionsIdx[newIdx].pracDate;
                } else {
                    mergedPracticedQuestionsIdx[newIdx] = { ...newStats };
                }
            });

            await updateDoc(userDoc.ref, {
                practicedQuestionsIdx: mergedPracticedQuestionsIdx
            });

            // ইউজারের স্কোর, প্রশ্ন সংখ্যা, অ্যাকিউরেসি আপডেট করা
            console.log(userDoc)
            await updateDoc(userDoc.ref, {
                points: newPoints,
                totalQuestions: newTotalQuestions,
                accuracy: newAccuracy,
                pracData: newPracData
            });

            // এখন leaderboard র‍্যাংক বের করা
            const leaderboardQuery = query(userRef, orderBy("points", "desc"));
            const allUsersSnapshot = await getDocs(leaderboardQuery);

            let rank = 1;
            for (const doc of allUsersSnapshot.docs) {
                const data = doc.data();
                if (data.email === user.email) {
                    break; // user found
                }
                rank++;
            }

            // leaderboardRank আপডেট করা
            await updateDoc(userDoc.ref, {
                leaderboardRank: rank
            });

            console.log("User data and leaderboard rank updated successfully.");

            return;
        }, {
            operation: 'updateScore',
            correctAnswers: correctAnswersThisSession,
            totalQuestions: questionsThisSession
        });

    } catch (error) {
        ErrorHandler.handleError({
            type: ErrorHandler.ERROR_TYPES.FIRESTORE,
            message: error.message,
            context: {
                action: 'updateScore',
                score: correctAnswersThisSession,
                total: questionsThisSession
            },
            showToast: true,
            allowRetry: true
        });
        throw error;
    }
}

//-----------------------RESTART QUIZ UI---------------------------
function restartQuizUI() {
    document.getElementById('additionalWordInfo').innerHTML = '';
    document.getElementById('additionalWordInfo').style.display = 'none';
    for (let i = 0; i < document.getElementsByClassName('quiz-option').length; i++) {
        document.getElementsByClassName('quiz-option')[i].classList.remove('correct', 'incorrect');
    }
    document.getElementById("quiz-loadingSpinner").style.display = 'none';
    document.getElementById("quiz").style.display = 'block';
    document.getElementById("progressText").style.display = 'block';
    document.getElementsByClassName('progress-bar')[0].style.display = 'block'
    document.getElementById("quizProgress").style.display = 'block';
    document.getElementById('quizEnd').style.display = 'none';
    document.getElementById("btnNext").style.display = 'none';
    document.getElementById("endUnlimitedPractice").style.display = 'none';
    document.getElementById("endUnlimitedPractice").style.display = 'none';
    document.getElementById('practiceTypeSelectionContainer').style.display = 'none';
    document.getElementById("no-results-message").style.display = 'none';
}

//-----------------------DASHBOARD CHART & STREAK UPDATE---------------------------
function getLastDates(numDays) {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < numDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const dd = String(date.getDate()).padStart(2, '0');

        dates.push(`${yyyy}-${mm}-${dd}`);
    }

    return dates;
}

// Fetch practice data and render chart
function fetchPracticeDataAndRenderChart(numDays) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        const q = query(collection(db, "users"), where("email", "==", user.email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.error("User data not found.");
            return;
        }

        const userDoc = snapshot.docs[0];
        const practiceData = userDoc.data().pracData || {};

        const labels = getLastDates(numDays);
        const data1 = labels.map(date => {
            return practiceData[date]?.correctAnswers || 0;
        });
        const data2 = labels.map(date => {
            return practiceData[date]?.totalQuestions || 0;
        });
        renderChart(labels, data1, data2, document.getElementById('progressChart'));
    });
}
function renderChart(labels, data1, data2, canvasElement) {
    // Check if canvas element exists
    if (!canvasElement) return;

    // Get the existing chart instance from the canvas
    const existingChart = Chart.getChart(canvasElement);

    // Destroy existing chart if it exists
    if (existingChart) {
        existingChart.destroy();
    }

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') return;

    // Create new chart
    window.progressChartInstance = new Chart(canvasElement.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'You',
                data: data1,
                borderColor: '#159895',
                backgroundColor: 'rgba(21, 152, 149, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Question Attempted',
                data: data2,
                borderColor: '#f39c12',
                backgroundColor: 'rgba(243, 156, 18, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    return window.progressChartInstance;
}
function updateStreakDays() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        const usersSnapshot = await getDocs(collection(db, "users"));

        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            const pracData = userData.pracData || {};

            const practicedDates = Object.keys(pracData).sort((a, b) => new Date(b) - new Date(a));

            let streakDays = 0;
            let currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0); // Normalize to midnight

            for (const dateStr of practicedDates) {
                const practicedDate = new Date(dateStr);
                practicedDate.setHours(0, 0, 0, 0); // Normalize too

                if (practicedDate.getTime() === currentDate.getTime()) {
                    streakDays++;
                    currentDate.setDate(currentDate.getDate() - 1); // Check the day before
                } else {
                    break; // If a day is missed, streak ends
                }
            }

            // If current user, update UI
            if (user.email === userData.email) {
                document.querySelectorAll('.streak-days').forEach(el => {
                    el.textContent = streakDays;
                });
            }
            // Update streak in Firestore
            await updateDoc(doc.ref, { streak: streakDays });
        }
    });
}

async function updateUserProgress() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        try {
            // Get user's document from Firestore
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            let practicedQuestionsIdxData = {};
            if (userSnap.exists()) {
                const userData = userSnap.data();
                practicedQuestionsIdxData = userData.practicedQuestionsIdx || {};
            }
            // console.log("Practiced Questions Index Data:", practicedQuestionsIdxData[0][16]);

            // Count only words with correctAttempts / totalAttempts >= 50%
            let practicedCount = 0;
            for (const stats of Object.values(practicedQuestionsIdxData)) {
                if (stats.totalAttempts > 0) {
                    const accuracy = stats.correctAttempts / stats.totalAttempts;
                    if (accuracy >= 0.5) {
                        practicedCount++;
                    }
                }
            }

            const totalWords = dictionary?.length || 1;
            const percentage = ((practicedCount / totalWords) * 100).toFixed(1);

            // Update progress UI
            const progressContainer = document.getElementById("progressOverview");
            if (progressContainer) {
                progressContainer.innerHTML = `
        <div class="progress-overview">
            <h2 class="section-title">
                <i class="fa fa-line-chart" aria-hidden="true"></i> Progress Overview
            </h2>
            <div class="progress-bar-wrapper" progress-bar-wrapper style="
    height: 24px;
    border-radius: 14px;
">
                <div class="overall-progress-bar" role="progressbar"
                    style="width: ${percentage}%;"
                    aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                </div>
            </div>
            <p>
                Practiced <strong>${practicedCount}</strong> of <strong>${totalWords}</strong> words (more than 50% accuracy)
            </p>
            <button class="btn" onclick="showDetailedProgress()" style="width: 100%; font-weight: bold;">
                See more
            </button>
        </div>
    `;
            }

            console.log(`Progress: ${practicedCount}/${totalWords} (${percentage}%)`);

        } catch (err) {
            console.error("Error fetching user progress:", err);
        }
    });
}




async function fetchAllUsersFromFirestore() {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
function renderLeaderboard(allUsers, currentUserEmail) {
    const leaderboardBody = document.getElementById("leaderboard-data");
    leaderboardBody.innerHTML = ""; // Clear existing rows

    // Sort users by points (highest first)
    allUsers.sort((a, b) => b.points - a.points);

    allUsers.forEach((user, index) => {
        const isCurrentUser = user.email === currentUserEmail;
        const nameInitial = user.name?.[0]?.toUpperCase() || "?";

        const userRow = document.createElement("div");
        userRow.className = `leaderboard-row ${isCurrentUser ? "current-user" : ""}`;
        userRow.innerHTML = `
      <div class="rank rank-${index + 1}" data-label="Rank">${index + 1}</div>
      <div class="user" data-label="User">
        <img src="https://placehold.co/40x40?text=${nameInitial}" alt="Avatar of ${user.name}" class="user-avatar">
        <span class="user-name">${user.name}</span>
      </div>
      <div class="score" data-label="Score">${user.points}</div>
      <div class="accuracy" data-label="Accuracy">${(user.accuracy * 100).toFixed(2)}%</div>
      <div class="streak" data-label="Streak">${user.streak} days</div>
    `;
        userRow.setAttribute('onclick', `showUser('${JSON.stringify(user)}')`);
        leaderboardBody.appendChild(userRow);
    });
}
function updateLeaderboardFromFirestore() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        const allUsers = await fetchAllUsersFromFirestore();
        renderLeaderboard(allUsers, user.email);
    });
}


window.searchDictionary = async function (query) {
    console.log("Searching for:", query);
    return;
}

// Replace existing window.renderQuestionBank with an efficient initializer
window.renderQuestionBank = async function () {
    // Build lightweight index for searching
    console.log("Building dictionary index...");
    updateWordCount();
    let searchInput = document.getElementById("searchInput");
    searchInput.addEventListener('input', filterSuggestions);
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dictionary-search')) {
            suggestionsContainer.style.display = 'none';
        }
    });
};

window.showWordDtls = async function (wordDetails) {
    document.getElementById("searchInput").value = wordDetails[0];
    try {
        const response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + wordDetails[0]);
        const data = await response.json();

        document.getElementById("wordDetailsModalContent").style.display = 'block';
        document.getElementById("dictionary-word-list").style.display = 'none';

        // Defensive checks for API response
        const apiEntry = Array.isArray(data) && data.length > 0 ? data[0] : {};
        const meanings = Array.isArray(apiEntry.meanings) ? apiEntry.meanings : [];

        // Collect definitions, synonyms, antonyms from API
        let apiDefinitions = "";
        let apiSynonyms = [];
        let apiAntonyms = [];

        meanings.forEach(meaning => {
            if (Array.isArray(meaning.definitions)) {
                meaning.definitions.forEach(def => {
                    apiDefinitions += `<li>${def.definition}${def.example ? `<br><i>Example: ${def.example}</i>` : ""}</li>`;
                    if (Array.isArray(def.synonyms)) apiSynonyms.push(...def.synonyms);
                    if (Array.isArray(def.antonyms)) apiAntonyms.push(...def.antonyms);
                });
            }
        });

        // Merge your custom data with API data
        const customDef = Array.isArray(wordDetails[2]) ? wordDetails[2].join(", ") : wordDetails[2];
        const customBn = Array.isArray(wordDetails[1]) ? wordDetails[1].join(", ") : wordDetails[1];
        const customSyn = Array.isArray(wordDetails[3]) ? wordDetails[3].join(", ") : wordDetails[3];
        const customAnt = Array.isArray(wordDetails[4]) ? wordDetails[4].join(", ") : wordDetails[4];

        const allDefinitions = `
            <ul>
              <li>${customDef} <br></li>
              ${apiDefinitions}
            </ul>`;

        const allSynonyms = [...new Set([...(customSyn ? customSyn.split(",") : []), ...apiSynonyms])].filter(Boolean).join(", ") || "N/A";
        const allAntonyms = [...new Set([...(customAnt ? customAnt.split(",") : []), ...apiAntonyms])].filter(Boolean).join(", ") || "N/A";

        // Render styled card
        document.getElementById('wordDetailsModalContent').innerHTML = `
            <div class="word-card">
              <div class="word-header">
                <h1 id="dictionaryWrd">
                  <span>${wordDetails[0]}</span> 
                  <button class="btn" onclick="speakWord('${wordDetails[0]}')">🔊 Pronounce</button>
                </h1>
                <p class="pronunciation">${apiEntry.phonetic || 'N/A'}</p>
                <p class="word-type">${meanings[0]?.partOfSpeech || 'N/A'}</p>
              </div>
            <div class="word-definition">
              <p class="example">"${customBn}"</p>
            </div>

              <div class="word-definition">
                <h3><i class="fa fa-book"></i> Definitions</h3>
                ${allDefinitions}
              </div>

              <div class="word-details">
                <div class="synonyms">
                  <h4><i class="fa fa-sync"></i> Synonyms</h4>
                  <p>${allSynonyms}</p>
                </div>

                <div class="antonyms">
                  <h4><i class="fa fa-exchange"></i> Antonyms</h4>
                  <p>${allAntonyms}</p>
                </div>
              </div>
              <div>
                    <img src="https://www.english-bangla.com/public/images/words/D${wordDetails[0][0].toLowerCase()}/${wordDetails[0].toLowerCase()}" style="width: 100%; height: auto; border-radius: 8px; margin-top: 10px;" alt="Image related to ${wordDetails[0]}" onerror="this.style.display='none'">
            </div>
            <br>

              <div id="ai-explanation" class="mb-3">
                <div class="loading" id="loadingDiv">
                  <span id="btnSpinner" class="loading-spinner"></span><br>
                  <h5 class="loading-text">Generating AI Explanation...</h5>
                </div>
              </div>

              <a href='#'>
                <button class="btn btn-primary" onclick="document.getElementById('wordDetailsModalContent').style.display='none'; document.getElementById('dictionary-word-list').style.display='block';">Close</button>
              </a>
            </div>`;

    } catch (error) {
        document.getElementById("wordDetailsModalContent").innerHTML = `
        <div class='word-card'>
          <h2 class="section-title">:( Word Not Found</h2>
          <p>Sorry, we couldn't find the word "${wordDetails[0]}". Please try another word.</p>
          <p style="color: grey;">Error: ${error} <p>
          <p>Alternatively, you can <button class="btn-primary btn" onclick="askAI_searchword()">Ask AI</button> for help.</p>
        </div>`;
        return;
    }

    // Generate AI explanation
    const prompt = `"${wordDetails[0]}" এই ইংরেজি শব্দটির বাংলা অর্থ বিস্তারিতভাবে ব্যাখ্যা কর। এর ব্যাকরণগত শ্রেণি (noun/verb/adjective ইত্যাদি) উল্লেখ করো। শব্দটির অর্থ স্পষ্টভাবে বোঝাতে অন্তত ৩টি উদাহরণ বাক্য দাও।
                  ফলাফলটি বাংলায় লেখো এবং HTML ট্যাগ ব্যবহার করে উপস্থাপন করো (কিন্তু h1, h2, h3, h4 ট্যাগ ব্যবহার করো না)। <b>, <i>, <p>, <ul>, <li> ইত্যাদি ট্যাগ ও inline-css ব্যবহার করে তথ্যগুলো সুন্দরভাবে ফরম্যাট করো।`;

    try {
        const aiExplaination = await puter.ai.chat(prompt, { model: "gpt-4.1-nano" });

        if (document.getElementById("dictionaryWrd").childNodes[0].innerText !== wordDetails[0]) {
            return; // Exit if user searched another word meanwhile
        }

        document.getElementById("ai-explanation").innerHTML = `
          <h3><i class="fa fa-graduation-cap"></i> AI Explanation</h3><br>
          <div>${aiExplaination.message.content}</div>`;
    } catch (error) {
        console.error("Error calling AI:", error);
        document.getElementById("ai-explanation").innerHTML = `<p>AI explanation not available :(</p>`;
    }
}

window.speakWord = function (word) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
}
window.showUser = function (user) {
    let userData = JSON.parse(user);

    // Function to convert timestamp to "X hours ago" format
    function formatTimeAgo(timestamp) {
        if (!timestamp) return "Unknown";

        let date;

        // Handle different timestamp formats
        if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
            // Firestore Timestamp (may be stringified)
            date = new Date(timestamp.seconds * 1000);
        } else if (timestamp instanceof Date) {
            // Already a Date object
            date = timestamp;
        } else if (typeof timestamp === 'string') {
            // ISO string
            date = new Date(timestamp);
        } else if (typeof timestamp === 'number') {
            // Unix timestamp (check if seconds or milliseconds)
            date = new Date(timestamp < 1000000000000 ? timestamp * 1000 : timestamp);
        } else {
            return "Unknown";
        }

        // If we couldn't create a valid date
        if (isNaN(date.getTime())) return "Unknown";

        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        // Calculate time intervals
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        // Find the largest appropriate interval
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
            }
        }

        return "Just now";
    }

    const lastActiveFormatted = formatTimeAgo(userData.lastActive);

    // Rest of your UI code
    document.getElementsByClassName("leaderboard-container")[0].style.display = 'none';
    document.getElementById('leaderboard').style.padding = 0;
    document.getElementById('user2user_Profile').style.display = 'block';
    //friends profile
    document.getElementById('user2user_Profile').innerHTML = `
  <div class="profile-container">
<button class="btn" onclick="document.getElementById('user2user_Profile').style.display='none';
        document.getElementsByClassName('leaderboard-container')[0].style.display = 'block';document.getElementById('leaderboard').style.padding = '19px';">
        <i class="fa fa-angle-left"></i>
          Back</button>
        <!-- Profile Header Section -->
        <div class="profile-header">
          <div class="avatar-section">
            <div class="avatar-wrapper">
              <img src="https://placehold.co/600x400?text=${userData.name[0]}" alt="Profile Picture" class="profile-avatar">
            </div>
            <div class="basic-info">
              <h1 class="profile-name" id="user-name">${userData.name}</h1>
              <div class="profile-meta">
              <span class="meta-item" id="user-dob"><i class="fa fa-id-badge"></i> ${userData.userClass}</span>
              <span class="meta-item" id="user-gender"><i class="fa fa-male"></i> ${userData.gender}</span>
              </div>
              <p class="profile-bio m-1 example" id="user-bio" style="font-style: italic; color: grey;">Last Active: ${lastActiveFormatted}</p>
            </div>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="stats-section">
          <div class="stat-card">
            <div class="stat-icon"><i class="fa fa-trophy"></i></div>
            <div class="stat-info">
              <span class="stat-value"> ${userData.points}</span>
              <span class="stat-label">Total Score</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><i class="fa fa-calendar-check-o"></i></div>
            <div class="stat-info">
              <span class="stat-value"> ${userData.streak}</span>
              <span class="stat-label">Day Streak</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><i class="fa fa-line-chart"></i></div>
            <div class="stat-info">
              <span class="stat-value"> ${userData.accuracy * 100}%</span>
              <span class="stat-label">Accuracy</span>
            </div>
          </div>
        </div>

        <!-- Progress Graph -->
        <div class="graph-section">
          <h2 class="section-title"><i class="fa fa-bar-chart"></i> Learning Progress</h2>
          <div class="graph-container">
            <canvas id="user2user_progressChart"></canvas>
          </div>
        </div>
      </div>
  `;
    const numDays = 7; // Default to 7 days
    const labels = getLastDates(numDays);
    const practiceData = userData.pracData || {};
    const correctAnswersData_user1 = labels.map(date => {
        return practiceData[date]?.correctAnswers || 0;
    });
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        const q = query(collection(db, "users"), where("email", "==", user.email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.error("User data not found.");
            return;
        }

        const userDoc = snapshot.docs[0];
        const practiceData = userDoc.data().pracData || {};

        const labels = getLastDates(numDays);
        const correctAnswersData_user2 = labels.map(date => {
            return practiceData[date]?.correctAnswers || 0;
        });
        // Render chart with both datasets
        renderMultiDatasetChart(labels,
            correctAnswersData_user1,
            correctAnswersData_user2, userData.name,
            document.getElementById('user2user_progressChart'));
    });

}
function renderMultiDatasetChart(labels, dataset1, dataset2, userName, canvasElement) {
    const ctx = canvasElement.getContext('2d');

    // Destroy previous chart if it exists
    if (canvasElement.chart) {
        canvasElement.chart.destroy();
    }

    canvasElement.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: userName,
                    data: dataset1,
                    borderColor: '#FF6B6B',  // Soft coral (complementary contrast)
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',  // Lighter translucent coral
                    borderWidth: 2,
                    pointBackgroundColor: '#FF6B6B',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'You',
                    data: dataset2,
                    borderColor: '#159895',  // Primary teal
                    backgroundColor: 'rgba(21, 152, 149, 0.1)',  // Lighter translucent teal
                    borderWidth: 2,         // Thicker line for emphasis
                    pointBackgroundColor: '#159895',  // Match border color
                    tension: 0.3,           // Smoother curve
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Points'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

//
window.deleteAccount = async function (password) {
    document.getElementsByClassName('configpagebg')[0].innerHTML = `
    <div class="confirmation-modal">
        <div class="loading" id="loadingDiv">
            <span id="btnSpinner" class="loading-spinner"></span><br>
            <h5 class="loading-text">Deleting your account...</h5>
          </div>
          </div>`;
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;

    if (!user) {
        alert("No user is signed in.");
        return;
    }

    try {
        const credential = EmailAuthProvider.credential(user.email, password.trim());  // trim just in case
        await reauthenticateWithCredential(user, credential);
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(user);
        alert("Account deleted successfully.");
    } catch (error) {
        if (error.code === 'auth/invalid-login-credentials') {
            document.getElementsByClassName('configpagebg')[0].innerHTML = `
    <div class="confirmation-modal">
        <div class="loading" id="loadingDiv">
            <h5 class="loading-text" style="color: #dc3545;">:( Failed to delete account. Please try again.</h5>
            <p>error: ${error.code}</p>
            <button class="btn" onclick="document.getElementsByClassName('configpagebg')[0].style.display='none';">Back</button>
          </div>
          </div>`;
        } else {
            alert("Error: " + error.message);
        }
    }
}

//
window.showDeleteConfirmation = function () {
    //get email from local storage
    const email = localStorage.getItem("userEmail");
    document.getElementsByClassName('configpagebg')[0].style.display = 'block';
    document.getElementsByClassName('configpagebg')[0].innerHTML = `
    <div class="confirmation-modal">
        <h2>Are you sure you want to delete your account?</h2>
        <p>This action cannot be undone.</p>
        <input type="email" id="confirm-email" placeholder="Enter your email" value='${email}' class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 transition-colors duration-200" disabled>
        <br>
        <input type="password" id="confirm-password" placeholder="Enter your password" class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 transition-colors duration-200" required>
        <br>
        <button class="btn btn-danger m-3" onclick="if(document.getElementById('confirm-password').value) {deleteAccount(document.getElementById('confirm-password').value)}">Delete Account</button>
        <button class="btn btn-secondary m-3" onclick="document.getElementsByClassName('configpagebg')[0].style.display='none';">Cancel</button>
     </div>`;

}

window.sendResetEmail = async function () {
    const configPageBg = document.getElementsByClassName('configpagebg')[0];
    configPageBg.style.display = 'block';
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        alert("No user is signed in.");
        return;
    }

    const email = user.email;
    if (!email) {
        configPageBg.innerHTML = `
        <div class="confirmation-modal">
            <h5 class="loading-text" style="color: #dc3545;">Failed to send email... Try again later.</h5>
            <button class="btn" onclick="document.getElementsByClassName('configpagebg')[0].style.display='none';">Back</button>

            </div>`;
        return;
    }

    // Countdown display before sending email
    let countdown = 5;
    configPageBg.innerHTML = `
    <div class="confirmation-modal">
        <div class="loading" id="loadingDiv">
            <span id="btnSpinner" class="loading-spinner"></span><br>
            <h5 class="loading-text">Sending password reset email to <span style="color: #28a745;">${email}</span> in <span id="countdownForSendingEmail">${countdown}</span> seconds...</h5>
            <button class="btn" onclick="document.getElementsByClassName('configpagebg')[0].style.display='none';document.getElementsByClassName('configpagebg')[0].innerHTML='';">Back</button>
        </div>
        </div>`;

    // Update countdown every second
    const interval = setInterval(() => {
        if (countdown <= 0) {
            if (document.getElementById('countdownForSendingEmail')) {
                clearInterval(interval);
                actuallySendEmail();
                document.getElementById('loadingDiv').childNodes[1].innerText = "Sending password reset email...";
                document.getElementById('loadingDiv').childNodes[3].disabled = true;
                return;
            } else {
                clearInterval(interval);
                return; // Exit if the element is not found
            }
        }
        countdown--;
        if (document.getElementById('countdownForSendingEmail')) {
            document.getElementById('countdownForSendingEmail').textContent = countdown;
        } else {
            clearInterval(interval);
        }
    }, 1000);

    async function actuallySendEmail() {
        try {
            await sendPasswordResetEmail(auth, email);
            configPageBg.innerHTML = `
            <div class="confirmation-modal">
            <h5 class="loading-text" style="color: #28a745;">:) Password reset email sent! Check your inbox.</h5>
            <button class="btn" onclick="document.getElementsByClassName('configpagebg')[0].style.display='none';">Back</button>
            </div>`;
            document.getElementById('changePassword').disabled = true;
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                alert("No user found with this email.");
            } else if (error.code === 'auth/invalid-email') {
                alert("Invalid email address.");
            } else {
                alert("Error: " + error.message);
            }
        }
    }
}

window.askAI_searchword = async function () {
    const query = document.getElementById('searchInput').value;
    document.getElementById("wordDetailsModalContent").style.display = 'none';
    document.getElementById('no-results-message').style.display = 'block';
    document.getElementById('no-results-message').innerHTML = `<div class="loading" id="loadingDiv">
    <span id="btnSpinner" class="loading-spinner"></span><br>
    <h5 class="loading-text">Getting "${query}" meaning...</h5>
    </div>`;
    if (!query) {
        return;
    }
    const prompt = `${query} শব্দটির অর্থ ও ব্যাখ্যা বাংলায় দাও। এর ব্যাকরণগত শ্রেণি (noun/verb/adjective ইত্যাদি) উল্লেখ করো। শব্দটির অর্থ বোঝাতে অন্তত ৩টি উদাহরণ বাক্য দাও। ফলাফলটি বাংলায় লেখো এবং HTML ট্যাগ ব্যবহার করে উপস্থাপন করো (কিন্তু h1, h2, h3, h4 ট্যাগ ব্যবহার করো না)। <b>, <i>, <p>, <ul>, <li> ইত্যাদি ট্যাগ ও inline-css ব্যবহার করে তথ্যগুলো সুন্দরভাবে ফরম্যাট করো।`;
    try {
        // Call AI API to get explanation
        const aiResponse = await puter.ai.chat(prompt, { model: "gpt-4.1-nano" });
        document.getElementById('no-results-message').innerHTML = aiResponse;
    } catch (error) {
        console.error("Error fetching AI explanation:", error);
    }

}

window.updateChartRange = function () {
    const selectedValue = document.getElementById('chartRangeSelector').value;
    // Update the chart based on the selected value
    fetchPracticeDataAndRenderChart(selectedValue);
}

window.showDetailedProgress = async function () {
    const container = document.getElementById('progressOverviewModal');
    container.style.display = 'block';
    document.getElementById('settings').style.display = 'none';
    document.getElementById('profile').style.display = 'none';

    // Show loading state
    container.innerHTML = `
        <div class="progress-loading">
            <div class="spinner"></div>
            <p>Loading your progress data...</p>
        </div>
    `;

    const user = auth.currentUser;
    if (!user) {
        container.innerHTML = `<p class="no-data">Please sign in to view your progress.</p>`;
        return;
    }

    let practicedQuestionsIdxData = {};
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            practicedQuestionsIdxData = userSnap.data().practicedQuestionsIdx || {};
        }
    } catch (err) {
        console.error("Error fetching user progress:", err);
        container.innerHTML = `<p class="error-message">Error loading progress data. Please try again later.</p>`;
        return;
    }

    if (Object.keys(practicedQuestionsIdxData).length === 0) {
        container.innerHTML = `
            <div class="no-progress-container">
                <div class="no-progress-icon">📊</div>
                <h3>No Progress Data Yet</h3>
                <p>Complete some practice sessions to see your progress here.</p>
            </div>
        `;
        return;
    }

    let totalCorrect = 0;
    let totalAttempts = 0;
    let masteredWords = 0;
    let strugglingWords = 0;

    Object.values(practicedQuestionsIdxData).forEach(stats => {
        const correct = stats.correctAttempts || 0;
        const total = stats.totalAttempts || 0;
        totalCorrect += correct;
        totalAttempts += total;

        const accuracy = total > 0 ? (correct / total) : 0;
        if (accuracy >= 0.8) masteredWords++;
        if (accuracy <= 0.5) strugglingWords++;
    });

    const overallAccuracy = totalAttempts > 0 ? ((totalCorrect / totalAttempts) * 100).toFixed(1) : 0;

    // Build content
    let content = `
        <div class="progress-header">
            <h2>Your Learning Progress</h2>
            <div class="progress-stats">
                <div class="stat-box">
                    <span class="stat-value">${Object.keys(practicedQuestionsIdxData).length}</span>
                    <span class="stat-label">Words Practiced</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">${overallAccuracy}%</span>
                    <span class="stat-label">Overall Accuracy</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">${masteredWords}</span>
                    <span class="stat-label">Mastered</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">${strugglingWords}</span>
                    <span class="stat-label">Need Practice</span>
                </div>
            </div>
        </div>

        <div class="progress-controls">
            <div class="sort-filter">
                <select id="progressSort">
                    <option value="accuracy-desc">Highest Accuracy</option>
                    <option value="accuracy-asc">Lowest Accuracy</option>
                    <option value="attempts-desc">Most Practiced</option>
                    <option value="attempts-asc">Least Practiced</option>
                    <option value="alphabetical">A-Z</option>
                </select>
                <select id="progressFilter">
                    <option value="all">All Words</option>
                    <option value="mastered">Mastered (>80%)</option>
                    <option value="struggling">Needs Practice (<50%)</option>
                </select>
            </div>
        </div>

        <div class="progress-container" id="progressItemsContainer">
    `;

    const progressItems = [];
    Object.entries(practicedQuestionsIdxData).forEach(([idx, stats]) => {
        const word = dictionary[idx]?.en || 'Unknown word';
        const wordMeaning = dictionary[idx]?.bn || 'Unknown word-meaning';
        const correct = stats.correctAttempts || 0;
        const total = stats.totalAttempts || 0;
        const practiceData = stats.pracDate || {};
        console.log(practiceData);
        const accuracy = total > 0 ? (correct / total) : 0;
        const accuracyPercent = (accuracy * 100).toFixed(1);

        progressItems.push({ idx, word, wordMeaning, correct, total, accuracy, accuracyPercent, practiceData });
    });

    progressItems.sort((a, b) => b.accuracy - a.accuracy);

    progressItems.forEach(item => {
        const barColor = item.accuracy <= 0.5 ? '#e74c3c' :
            item.accuracy <= 0.8 ? '#f39c12' : '#27ae5fdc';
        const practiceLevel = item.accuracy <= 0.5 ? 'needs-practice' :
            item.accuracy <= 0.8 ? 'getting-better' : 'mastered';

        content += `
            <div class="progress-item ${practiceLevel}" data-accuracy="${item.accuracy}" data-attempts="${item.total}" data-word="${item.word.toLowerCase()}">
                <div class="word-header">
                    <span class="word">${item.word}</span>
                    <span class="word-meaning pronunciation">${item.wordMeaning}</span>
                    <span class="accuracy-text">${item.correct}/${item.total} (${item.accuracyPercent}%)</span>
                    <span class="practice-date" style="color: #ddd; width: 100%; text-align: right;">${item.practiceData}</span>
                    </div>
                    <div class="progress-bar-wrapper" style=" background-color: #27ae5fdc;display: flex;flex-direction: row-reverse;">
                        <div class="overall-progress-bar" style="width:${100 - item.accuracyPercent}%; background:${barColor};">
                    <div class="progress-tooltip">${item.accuracyPercent}% accuracy</div>
                    </div>
                </div>
            </div>
        `;
    });

    content += `</div>`; // Close container
    container.innerHTML = content;

    // Event listeners
    document.getElementById('progressSort').addEventListener('change', sortProgressItems);
    document.getElementById('progressFilter').addEventListener('change', filterProgressItems);
    document.getElementById('progressSearch').addEventListener('input', searchProgressItems);

    // Add styles
    addProgressStyles();
};

// Styles included
// Add styles once
function addProgressStyles() {
    if (document.getElementById('progress-styles')) return;

    const style = document.createElement('style');
    style.id = 'progress-styles';
    style.textContent = `
        .progress-modal {
            max-width: 700px;
            margin: 50px auto;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            font-family: 'Segoe UI', sans-serif;
        }
        .progress-header {
            background: linear-gradient(135deg, #159895, #16a085);
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 14px 14px 0px 0px;
        }
        .progress-header h2 { margin-bottom: 15px; }
        .progress-stats { display: flex; justify-content: space-around; flex-wrap: wrap; }
        .stat-box { text-align: center; margin: 5px 0; }
        .stat-value { font-size: 24px; font-weight: bold; display: block; }
        .stat-label { font-size: 14px; opacity: 0.9; }
        .progress-controls {
            display: flex;
            justify-content: space-between;
            padding: 15px 20px;
            background: #ecf0f1;
            border-bottom: 1px solid #bdc3c7;
            flex-wrap: wrap;
            gap: 10px;
        }
        .search-box { position: relative; flex: 1; min-width: 200px; }
        #progressSearch { width: 100%; padding: 10px 15px 10px 35px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #7f8c8d; }
        .sort-filter { display: flex; gap: 10px; }
        #progressSort, #progressFilter { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; background: white; }
        .progress-container { padding: 10px; }
        .progress-item {
            background: #fff;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 10px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.05);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .progress-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .progress-item.mastered { border-left: 5px solid #27ae60; }
        .progress-item.getting-better { border-left: 5px solid #f39c12; }
        .progress-item.needs-practice { border-left: 5px solid #e74c3c; }
        .word-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .word { font-weight: 600; font-size: 18px; }
        .accuracy-text { font-size: 14px; color: #7f8c8d; }
        .progress-bar-wrapper { height: 10px; background: #ecf0f1; border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
        .progress-bar { height: 100%; border-radius: 4px; position: relative; transition: width 0.5s ease; }
        .progress-bar:hover .progress-tooltip { opacity: 1; transform: translateY(-100%); }
        .progress-tooltip {
            position: absolute;
            right: 0;
            top: -5px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            opacity: 0;
            transform: translateY(0);
            transition: opacity 0.2s, transform 0.2s;
            pointer-events: none;
        }
        .progress-loading { text-align: center; padding: 40px; color: #7f8c8d; }
        .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #1abc9c; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .no-progress-container { text-align: center; padding: 40px 20px; color: #7f8c8d; }
        .no-progress-icon { font-size: 48px; margin-bottom: 15px; }
        .no-progress-container h3 { margin: 0 0 10px 0; color: #34495e; }
        @media (max-width: 768px) {
            .progress-controls { flex-direction: column; }
            .search-box { width: 100%; }
            .sort-filter { width: 100%; justify-content: space-between; }
            #progressSort, #progressFilter { width: 48%; }
            .progress-stats { flex-wrap: wrap; }
            .stat-box { width: 50%; }
        }
    `;
    document.head.appendChild(style);
}

// Call once at the start
addProgressStyles();



// Sorting function
function sortProgressItems() {
    const sortValue = document.getElementById('progressSort').value;
    const container = document.getElementById('progressItemsContainer');
    const items = Array.from(container.getElementsByClassName('progress-item'));

    items.sort((a, b) => {
        const aAcc = parseFloat(a.getAttribute('data-accuracy'));
        const bAcc = parseFloat(b.getAttribute('data-accuracy'));
        const aAtt = parseInt(a.getAttribute('data-attempts'));
        const bAtt = parseInt(b.getAttribute('data-attempts'));
        const aWord = a.getAttribute('data-word');
        const bWord = b.getAttribute('data-word');

        switch (sortValue) {
            case 'accuracy-desc': return bAcc - aAcc;
            case 'accuracy-asc': return aAcc - bAcc;
            case 'attempts-desc': return bAtt - aAtt;
            case 'attempts-asc': return aAtt - bAtt;
            case 'alphabetical': return aWord.localeCompare(bWord);
            default: return 0;
        }
    });

    // Re-append sorted items to container
    items.forEach(item => container.appendChild(item));
}


async function generateQuestionsIdxArray(totalQuestions) {
    // Validate totalQuestions
    totalQuestions = parseInt(totalQuestions);
    if (isNaN(totalQuestions) || totalQuestions <= 0) {
        console.error("Invalid totalQuestions value:", totalQuestions);
        return [];
    }

    // Get current user
    const user = auth.currentUser;
    if (!user || !user.uid) {
        console.error("User not signed in or missing UID!");
        return [];
    }
    let practicedQuestionsIdxData = {};

    // Fetch practiced questions data from Firestore
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            practicedQuestionsIdxData = userSnap.data().practicedQuestionsIdx || {};
        }
    } catch (err) {
        console.error("Error fetching user progress:", err);
        return [];
    }

    // Extract practiced question indices and stats
    const practicedQuestionsIdxArray = Object.keys(practicedQuestionsIdxData)
        .map(idx => parseInt(idx))
        .filter(idx => !isNaN(idx) && idx >= 0 && idx < dictionary.length);

    // Calculate wrong attempts for each practiced question
    const mostWrongAttemptedQuestionsIdx = practicedQuestionsIdxArray
        .map(idx => {
            const data = practicedQuestionsIdxData[idx];
            const wrongAttempts = (data.totalAttempts || 0) - (data.correctAttempts || 0);
            return { idx, wrongAttempts };
        })
        .filter(item => item.wrongAttempts > 0)
        .sort((a, b) => b.wrongAttempts - a.wrongAttempts);

    // Start with most wrong attempted questions
    let combinedArray = mostWrongAttemptedQuestionsIdx.map(item => item.idx);

    // Fill up with random questions if needed
    const usedIdx = new Set(combinedArray);
    while (combinedArray.length < totalQuestions) {
        const randomIdx = Math.floor(Math.random() * dictionary.length);
        if (!usedIdx.has(randomIdx)) {
            combinedArray.push(randomIdx);
            usedIdx.add(randomIdx);
        }
        // Prevent infinite loop if dictionary is too small
        if (usedIdx.size >= dictionary.length) break;
    }

    // If practicedQuestionsIdxData is empty, just pick random indices
    if (combinedArray.length === 0) {
        while (combinedArray.length < totalQuestions && combinedArray.length < dictionary.length) {
            const randomIdx = Math.floor(Math.random() * dictionary.length);
            if (!combinedArray.includes(randomIdx)) {
                combinedArray.push(randomIdx);
            }
        }
    }

    // Trim to required length
    combinedArray = combinedArray.slice(0, totalQuestions);

    return combinedArray;
}


function getLocalDate() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
}

// Add global overlay helpers to block user interaction while fetching data
function showGlobalLoader(message = "Loading...") {
    // If already present, just update message and show
    let overlay = document.getElementById('global-blocking-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-blocking-overlay';
        overlay.setAttribute('role', 'status');
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999999',
            cursor: 'wait'
        });
        const inner = document.createElement('div');
        inner.id = 'global-blocking-overlay-inner';
        Object.assign(inner.style, {
            padding: '18px 22px',
            background: 'rgba(255,255,255,0.95)',
            color: '#222',
            borderRadius: '8px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
            fontSize: '16px',
            fontWeight: '500'
        });
        inner.innerText = message;
        overlay.appendChild(inner);
        // Prevent pointer events from reaching underlying UI
        overlay.addEventListener('click', e => e.stopPropagation(), { capture: true });
        document.body.appendChild(overlay);
    } else {
        const inner = document.getElementById('global-blocking-overlay-inner');
        if (inner) inner.innerText = message;
        overlay.style.display = 'flex';
    }
    // Also prevent tab focus navigation to page controls
    document.documentElement.setAttribute('data-loading-block', 'true');
    document.body.style.pointerEvents = 'auto'; // overlay captures clicks
}

function hideGlobalLoader() {
    const overlay = document.getElementById('global-blocking-overlay');
    if (overlay) overlay.style.display = 'none';
    document.documentElement.removeAttribute('data-loading-block');
    // restore any page-level pointer handling if needed
}



// function of dictionary
function updateWordCount() {
    const count = dictionary.length;
    document.getElementById('word_count').textContent = count.toLocaleString();
    let synonymCount = 0;
    dictionary.forEach(w => {
        if (w.syn && w.syn.length > 0) {
            synonymCount = synonymCount + w.syn.length;
        }
    });
    document.getElementById('synonym_count').textContent = synonymCount.toLocaleString();
    let bnCount = 0;
    dictionary.forEach(w => {
        if (w.bn && w.bn.length > 0) {
            bnCount = bnCount + w.bn.length;
        }
    });
    document.getElementById('translation_count').textContent = bnCount.toLocaleString();
}

function filterSuggestions() {
    let searchInput = document.getElementById("searchInput");
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
        suggestionsContainer.style.display = 'none';
        return;
    }

    const suggestions = dictionary
        .filter(w => w.en.toLowerCase().startsWith(query))
        .slice(0, 10);
    displaySuggestions(suggestions);
}

function displaySuggestions(list) {
    suggestionsContainer.innerHTML = '';
    if (!list.length) {
        suggestionsContainer.innerHTML = '<div class="suggestion-item">No words found</div>';
    } else {
        list.forEach(w => {
            const el = document.createElement('div');
            el.className = 'suggestion-item';
            el.innerHTML = `
                        <span class='suggestion-word'>${w.en}</span>
                        <span class='suggestion-bangla'>${w.bn?.[0] || ''}</span>
                    `;
            el.addEventListener('click', () => displayWordDetails(w));
            suggestionsContainer.appendChild(el);
        });
    }
    suggestionsContainer.style.display = 'block';
}

async function displayWordDetails(word, ele_id) {
    const wordDetails = document.getElementById(ele_id);
    // ask api to fetch more details about the word if needed
    try {
        const response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + word.en);
        const data = await response.json();
        const wordData = data[0];

        let phonetics = wordData.phonetics?.map(p => p.text).filter(Boolean).join(", ") || "Not available";
        let pos = wordData.meanings?.map(m => m.partOfSpeech).filter(Boolean).join(", ") || "Not available";
        //make pos an array of unique values
        pos = [...new Set(wordData.meanings?.map(m => m.partOfSpeech).filter(Boolean))].join(", ") || "Not available";
        // convert pos an array
        pos = wordData.meanings?.map(m => m.partOfSpeech).filter(Boolean) || [];

        let audioUrl = wordData.phonetics?.find(p => p.audio)?.audio || null;

        let examples = [];
        wordData.meanings?.forEach(m => {
            m.definitions?.forEach(d => {
                if (d.example) {
                    examples.push(d.example);
                }
            });
        });
        if (examples.length > 0) {
            word.sen = examples;
        }

        let dictionary_img = `https://www.english-bangla.com/public/images/words/D${word.en[0]}/${word.en}`;
        //https://www.english-bangla.com/public/images/words/D{first letter of the word}/{word}

        wordDetails.innerHTML = `
                    <div class="word-header-dictionary">
                        <h1 style="font-style: italic;" onclick="pronounce('${audioUrl}')">${word.en} <i class="fas fa-volume-up"></i></h1>
                    </div>
                    <p>${phonetics}</p>
                    <div class="synonym-list">${pos.map(p => `<span class="synonym">${p}</span>`).join('') || ""}</div>
                    <h3><i class="fas fa-language"></i> Bangla Meaning</h3>
                    <p>${word.bn?.join(', ') || 'No translation available'}</p>
                    <h3><i class="fas fa-book"></i> Definition</h3>
                    <ul style="list-style: disc; margin-left: 20px;">
                        ${word.def ? word.def.map(d => `<li>${d}</li>`).join('') : '<li>No definition available</li>'}
                    </ul>
                    ${word.syn ? `
                        <h3><i class="fas fa-sync-alt"></i> Synonyms</h3>
                        <div class="synonym-list">
                            ${word.syn.map(s => `<span class="synonym">${s}</span>`).join('') || "No synonyms available"}
                        </div>
                    ` : ''}
                    ${word.ant ? `
                        <h3><i class="fas fa-exchange-alt"></i> Antonyms</h3>
                        <div class="synonym-list">
                            ${word.ant.map(a => `<span class="synonym">${a}</span>`).join('') || "No antonyms available"}
                        </div>` : ''}
                    ${word.sen ? `
                        <h3><i class="fas fa-comment"></i> Example Sentences</h3>
                        <ul style="margin-left: 20px;">
                            ${word.sen.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    ` : ''}
                    <h3><i class="fas fa-images"></i> From Dictionary</h3>
                    <div class="dictionary_img">
                        <img src="${dictionary_img}" alt="Dictionary Image" onerror="this.onerror=null;this.outerHTML='<span>Not available for this word</span>';">
                    </div>
                `;
        wordDetails.style.display = 'block';
        suggestionsContainer.style.display = 'none';
        if (ele_id === 'word_details') {
            searchInput.value = word.en;
        }
        wordDetails.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error('Failed to fetch additional word details:', err);
    }
}

function pronounce(audioUrl) {
    if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
    } else {
        alert('Pronunciation audio not available.');
    }
}