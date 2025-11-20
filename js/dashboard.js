import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, EmailAuthProvider, deleteUser, reauthenticateWithCredential, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, getDoc, updateDoc, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
// import { generateQuestionsIdxArray } from './quiz.js';
const firebaseConfig = {
    apiKey: "AIzaSyB12GMrNdELvkdSKxF8Ij2IGKRqUh63WTc",
    authDomain: "wordvo-bb47d.firebaseapp.com",
    projectId: "wordvo-bb47d",
    storageBucket: "wordvo-bb47d.firebasestorage.app",
    messagingSenderId: "1050344621419",
    appId: "1:1050344621419:web:29909f4d722e58b1e9b82e",
    measurementId: "G-LCXCH1X6C2"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Global variable to store user data once fetched
let currentUserData = null;
let score = 0; // Initialize score variable
let dictionary = [];
let practicedQuestionsIdx = [];
let sessionQuestionsIdx = [];
let dictionaryLoadedPromise = null; // Add this line
// Fetch dictionary data from the remote JSON file
async function fetchDictionary() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/towfikahmed0/e2b_dictionary/refs/heads/main/dictionary.json');
        dictionary = await response.json();
        console.log("Dictionary loaded successfully.");
    } catch (error) {
        console.error("Error loading dictionary:", error);
        document.getElementsByTagName('body')[0].innerHTML = `
    <div class="container text-center m-5">
    <h1><i class="fa fa-exclamation-triangle"></i> Error Loading Dictionary :(</h1>
    <p>There was an error loading the dictionary. Please try again later.</p>
    <button class="btn btn-primary" onclick="window.location.reload()">Reload</button>
    <button class="btn btn-danger" onclick="signOut()">Sign Out</button>
    </div>`;
        return;
    }
}

// Use a promise to track dictionary loading
dictionaryLoadedPromise = fetchDictionary();

async function getUserData(email) {
	// Show blocking overlay to deactivate clicks while fetching user data
	showGlobalLoader("Fetching user data...");

	try {
		const q = query(
			collection(db, "users"),
			where("email", "==", email)
		);
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			console.warn("No user data found for email:", email);
			// hide overlay before redirecting
			return null; // overlay will be hidden in finally
		} else {
			currentUserData = querySnapshot.docs[0].data(); // Store data
			// update user's last active time
			await updateDoc(doc(db, "users", querySnapshot.docs[0].id), {
				lastActive: new Date()
			});
			return currentUserData; // Return the fetched data
		}
	} catch (err) {
		console.error("Error fetching user data:", err);
		// propagate or return null — caller handles redirect
		return null;
	} finally {
		// Always remove overlay so UI becomes interactive again
		hideGlobalLoader();
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
            const response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + wordofday.en);
            const data = await response.json();
            const wordData = data[0];

            let phonetics = wordData.phonetics?.map(p => p.text).filter(Boolean).join(", ") || "Not available";

            // Merge definitions
            let definitions = [];
            if (wordofday.def) definitions.push(wordofday.def);
            wordData.meanings.forEach(meaning => {
                meaning.definitions.forEach(d => definitions.push(d.definition + (d.example ? ` <br><span class="example">"${d.example}"</span>` : "")));
            });
            let definitionsHTML = definitions.map(d => `<li>${d}</li>`).join("");

            // Merge synonyms
            let allSynonyms = [];
            if (wordofday.syn) allSynonyms.push(wordofday.syn);
            wordData.meanings.forEach(meaning => {
                allSynonyms = allSynonyms.concat(meaning.synonyms || []);
                meaning.definitions.forEach(d => allSynonyms = allSynonyms.concat(d.synonyms || []));
            });
            allSynonyms = [...new Set(allSynonyms)];
            let synonymsHTML = allSynonyms.length ? allSynonyms.join(", ") : "None";

            // Merge antonyms
            let allAntonyms = [];
            if (wordofday.ant) allAntonyms.push(wordofday.ant);
            wordData.meanings.forEach(meaning => {
                allAntonyms = allAntonyms.concat(meaning.antonyms || []);
                meaning.definitions.forEach(d => allAntonyms = allAntonyms.concat(d.antonyms || []));
            });
            allAntonyms = [...new Set(allAntonyms)];
            let antonymsHTML = allAntonyms.length ? allAntonyms.join(", ") : "None";

            container.innerHTML = `
                <h2 class="section-title">Word of the Day</h2>
                <div class="word-card" onclick="speakWord('${wordofday.en}')">
                    <div class="word-header">
                        <h1>${wordofday.en}</h1>
                        <p class="pronunciation">${phonetics}</p>
                        ${highlightAccuracy ? `<p class="accuracy-note">⚡ Weak Word – Accuracy: <b>${highlightAccuracy}%</b></p>` : ''}
                    </div>
                <div class="word-definition">
                    <p class="example">${wordofday.bn || ''}</p>
                </div>

                    <div class="word-definition">
                        <h4>Definitions</h4>
                        <ul>${definitionsHTML}</ul>
                    </div>

                    <div class="word-details">
                        <div class="synonyms">
                            <h4><i class="fa fa-sync"></i> Synonyms</h4>
                            <p>${synonymsHTML}</p>
                        </div>
                        <div class="antonyms">
                            <h4><i class="fa fa-exchange"></i> Antonyms</h4>
                            <p>${antonymsHTML}</p>
                        </div>
                    </div>
                </div>
            `;
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
    const user = auth.currentUser;
    if (!user) {
        console.error("No user is currently signed in.");
        return Promise.reject("No user is currently signed in.");
    }

    try {
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
    } catch (error) {
        console.error("Error in updateScoreInFirestore:", error);
        return Promise.reject(error);
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

// --- New: efficient question-bank rendering & search helpers ---
let dictionaryIndex = [];            // lightweight index: { en, bn, def, syn, ant, lower }
let currentSearchResults = [];       // filtered indices into dictionaryIndex
let currentRenderPos = 0;
const PAGE_SIZE = 200;               // number of items to render per batch
const INITIAL_SHOW = 100;            // initial sample when no search

function debounce(fn, wait) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

async function initializeDictionaryIndex() {
    if (dictionaryIndex.length > 0) return; // already initialized
    await dictionaryLoadedPromise; // ensure dictionary loaded
    dictionaryIndex = dictionary.map((entry, idx) => ({
        en: entry.en || '',
        bn: Array.isArray(entry.bn) ? entry.bn.join(', ') : (entry.bn || ''),
        def: entry.def || '',
        syn: Array.isArray(entry.syn) ? entry.syn.join(', ') : (entry.syn || ''),
        ant: Array.isArray(entry.ant) ? entry.ant.join(', ') : (entry.ant || ''),
        lower: (entry.en || '').toLowerCase(),
        origIdx: idx
    }));
}

function makeWordListItem(entry) {
    // Use textContent-safe creation and avoid heavy innerHTML when possible
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = "#";
    a.addEventListener('click', (e) => {
        e.preventDefault();
        // Use existing showWordDtls() which expects an array of values as string inputs
        showWordDtls([entry.en, [entry.bn], [entry.def], [entry.syn], [entry.ant]]);
    });
    a.textContent = entry.en;
    const btn = document.createElement('button');
    btn.className = 'pronounce-btn';
    btn.innerHTML = '<i class="fa fa-angle-right"></i>';
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        showWordDtls([entry.en, [entry.bn], [entry.def], [entry.syn], [entry.ant]]);
    });
    a.appendChild(btn);
    li.appendChild(a);
    return li;
}

function renderWordList(append = false) {
    const container = document.getElementById("dictionary-word-list");
    if (!container) return;
    if (!append) {
        container.innerHTML = '';
    }
    // Decide source list: currentSearchResults if non-empty else default sample
    const source = currentSearchResults.length > 0 ? currentSearchResults : dictionaryIndex.map((_, i) => i);
    const frag = document.createDocumentFragment();
    const end = Math.min(source.length, currentRenderPos + PAGE_SIZE);
    for (let i = currentRenderPos; i < end; i++) {
        const entry = dictionaryIndex[source[i]];
        frag.appendChild(makeWordListItem(entry));
    }
    container.appendChild(frag);
    currentRenderPos = end;

    // Manage "Load more" UI
    let moreBtn = document.getElementById('loadMoreWordsBtn');
    if (currentRenderPos < source.length) {
        if (!moreBtn) {
            moreBtn = document.createElement('button');
            moreBtn.id = 'loadMoreWordsBtn';
            moreBtn.className = 'btn';
            moreBtn.style.margin = '10px 0';
            moreBtn.textContent = 'Load more';
            moreBtn.addEventListener('click', () => renderWordList(true));
            container.parentNode.insertBefore(moreBtn, container.nextSibling);
        } else {
            moreBtn.style.display = 'inline-block';
        }
    } else if (moreBtn) {
        moreBtn.style.display = 'none';
    }

    // Show/hide no-results
    const noResults = document.getElementById('no-results-message');
    if (source.length === 0) {
        if (noResults) {
            noResults.style.display = 'block';
            noResults.innerHTML = `No results found. <button class="btn-primary btn" onclick="askAI_searchword()">Ask AI</button>`;
        }
    } else if (noResults) {
        noResults.style.display = 'none';
    }
}

window.searchDictionary = async function(query) {
    await initializeDictionaryIndex();
    query = (query || '').trim().toLowerCase();
    currentRenderPos = 0;
    currentSearchResults = [];

    if (!query) {
        // show initial sample (first INITIAL_SHOW unique alphabetical entries)
        currentSearchResults = dictionaryIndex
            .slice()
            .sort((a,b)=> a.lower.localeCompare(b.lower))
            .slice(0, INITIAL_SHOW)
            .map((_, i)=> i);
        // but because we sorted a copy, map index won't reflect original indices; instead use direct slice:
        currentSearchResults = dictionaryIndex
            .slice(0, INITIAL_SHOW)
            .map((_, i) => i);
        renderWordList(false);
        return;
    }

    // Fast two-pass filtering: prefix matches first, then includes
    const prefixMatches = [];
    const includesMatches = [];

    for (let i = 0; i < dictionaryIndex.length; i++) {
        const item = dictionaryIndex[i];
        if (item.lower.startsWith(query)) {
            prefixMatches.push(i);
        } else if (item.lower.indexOf(query) !== -1) {
            includesMatches.push(i);
        }
    }
    currentSearchResults = prefixMatches.concat(includesMatches);
    renderWordList(false);
};

// Replace existing window.renderQuestionBank with an efficient initializer
window.renderQuestionBank = async function () {
    await initializeDictionaryIndex();
    // render initial sample only (no 19k DOM nodes)
    currentSearchResults = dictionaryIndex.slice(0, INITIAL_SHOW).map((_, i) => i);
    currentRenderPos = 0;
    // Clear previous container and any "load more" button
    const container = document.getElementById("dictionary-word-list");
    if (container) container.innerHTML = '';
    const existingBtn = document.getElementById('loadMoreWordsBtn');
    if (existingBtn) existingBtn.remove();

    renderWordList(false);

    // Hook search box (debounced) if not already hooked
    const searchInput = document.getElementById('searchInput');
    if (searchInput && !searchInput._fastSearchBound) {
        const debounced = debounce((e) => {
            const q = e.target.value;
            window.searchDictionary(q);
        }, 180);
        searchInput.addEventListener('input', debounced);
        searchInput._fastSearchBound = true;
    }
};

// ...existing code...
