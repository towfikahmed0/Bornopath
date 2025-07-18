import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

async function getUserData(email) {
  const q = query(
    collection(db, "users"),
    where("email", "==", email)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.warn("No user data found for email:", email);
    window.location.replace("index.html");
    return null; // Return null if no data
  } else {
    currentUserData = querySnapshot.docs[0].data(); // Store data
    // console.log("Fetched user data:", currentUserData);
    return currentUserData; // Return the fetched data
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
  updateStreakDays();
  updateLeaderboardFromFirestore();

  document.getElementById('user-name').textContent = userData.name;
  document.getElementById('user-email').textContent = userData.email;
  document.getElementById('user-dob').innerHTML = '<i class="fa fa-birthday-cake"></i> ' + userData.birthDate;
  document.getElementById('user-gender').innerHTML = '<i class="fa fa-genderi> ' + userData.gender; // Corrected to use the actual data
  
  // Load stats (still hardcoded - consider fetching from Firestore)
  
  for (let i = 0; i < document.getElementsByClassName('totalScore').length; i++) {
    document.getElementsByClassName('totalScore')[i].textContent = userData.points
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
  fetchPracticeDataAndRenderChart();
  
}
document.addEventListener('DOMContentLoaded', async function () {
  console.log("DOMContentLoaded event fired."); // Confirmation log

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.log("No user signed in. Redirecting...");
      window.location.replace("index.html");
    } else {
      console.log("User signed in:", user.email);
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
  const $ = id => document.getElementById(id);
  const hideAll = () => {
    ["dashboardContant", "quiz", "quizEnd", "customize_quiz", "unlimitedTest"].forEach(id => $(id).style.display = 'none');
  };

  document.querySelector('.quick-practice').addEventListener('click', function () {
    $("quizContainer").style.display = 'block';
    $("quiz-loadingSpinner").style.display = 'block';

    try {
      score = 0;
      $("quiz-point").innerText = `Point: ${score}`;
      hideAll();
      $("quiz-loadingSpinner").style.display = 'none';
      $("quiz").style.display = 'block';
      startTimer(300);
      intialQuestions(0, 10);
      timerInitialized = true;
    } catch (error) {
      console.error("Error initializing quick practice:", error);
      $("quiz-loadingSpinner").style.display = 'block';
    }
  });

  document.querySelector('.customized-test').addEventListener('click', function () {
    try {
      score = 0;
      hideAll();
      $("quizContainer").style.display = 'block';
      $("quiz-loadingSpinner").style.display = 'none';
      $("customize_quiz").style.display = 'block';
    } catch (error) {
      console.error("Error initializing customized test:", error);
      $("quiz-loadingSpinner").style.display = 'block';
    }
  });

  document.querySelector('.unlimited-practice').addEventListener('click', function () {
    hideAll();
    $("quizContainer").style.display = 'block';
    $("unlimitedTest").style.display = 'block';
  });
});

// Word of the Day
let wordofdayIdx
// Fetch dictionary data from the remote JSON file
async function fetchDictionary() {
  document.getElementById('wordOfDay').innerHTML = `<div class='spinner-border' role='status'><span class='visually-hidden'>Loading...</span></div>`;

  try {
    const response = await fetch('https://raw.githubusercontent.com/towfikahmed0/Bornopath/refs/heads/main/dictionary.json');
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
fetchDictionary().then(() => {
  console.log("Dictionary is ready to use.");
  // After fetching the dictionary, check for the word of the day
  setWordOfDay();
});
async function setWordOfDay() {
  // Check if a word of the day is already set for today
  if (localStorage.getItem(new Date().getDate())) {
    wordofdayIdx = localStorage.getItem(new Date().getDate());
  } else {
    // If no word of the day is set for today, select a random word
    localStorage.clear();
    const date = new Date().getDate();
    wordofdayIdx = Math.floor(Math.random() * dictionary.length); // Replace with actual word of the day logic
    localStorage.setItem(date, wordofdayIdx);
  }

  if (wordofdayIdx) {
    const wordofday = dictionary[wordofdayIdx];
    const response = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + wordofday['en']);
    const data = await response.json();
    document.getElementById('wordOfDay').innerHTML = `
    <h2 class="section-title">Word of the Day</h2>
        <div class="word-card" onclick="speakWord('${wordofday['en']}')">
          <div class="word-header">
            <h1 id="word-of-day">${wordofday['en']}</h1>
             <p class="pronunciation">${data[0]['phonetic']}</p>
            <p class="word-type">${data[0]['meanings'][0]['partOfSpeech']}</p>
          </div>

          <div class="word-definition">
            <p>${wordofday['def']}</p>
            <p class="example">"${wordofday['bn']}"</p>
          </div>

          <div class="word-details">
            <div class="synonyms">
              <h4><i class="fa fa-sync"></i> Synonyms</h4>
              <p>${wordofday['syn']}</p>
            </div>

            <div class="antonyms">
              <h4><i class="fa fa-exchange"></i> Antonyms</h4>
              <p>${wordofday['ant']}</p>
            </div>
          </div>
        </div>
    `;
  }
  else {
    console.error("No word of the day found.");
    document.getElementById('wordOfDay').innerHTML = `
    <h2 class="section-title">Word of the Day</h2>
    <div class="word-card">
      <h3>No word of the day available.</h3>
      <p>Please check back tomorrow for a new word.</p>
      <p class="note">Note: The word of the day is randomly selected from the dictionary.</p>
      <button onclick="setWordOfDay()" class="btn btn-primary">Refresh</button>
    </div>
    `;
  }
}
//quiz functions
window.intialQuestions = async function (QNo = 0, limit) {
  restartQuizUI();

  const quizContainer = document.getElementById("quizContainer");
  const questionIdxEl = document.getElementById("questionIdx");
  const questionTextEl = document.getElementById("questionText");
  const progressTextEl = document.getElementById("progressText");
  const quizProgressEl = document.getElementById("quizProgress");
  const stutasEl = document.getElementById("stutas");
  const quizTimerEl = document.getElementById("quizTimer");
  const btnNext = document.getElementById("btnNext");
  const endBtn = document.getElementById("endUnlimitedPractice");
  const optionEls = document.getElementsByClassName("option-text");

  const randomWord = () => dictionary[Math.floor(Math.random() * dictionary.length)];
  const randomBN = (word) => word['bn'][Math.floor(Math.random() * word['bn'].length)];

  // For unlimited practice
  if (limit === undefined) {
    console.log("Initializing unlimited practice");
    quizContainer.style.display = 'block';

    const questionsWrd = randomWord();
    const correctAnswer = randomBN(questionsWrd);

    let genaratedOptions = Array.from({ length: 4 }, () => randomBN(randomWord()));
    genaratedOptions[Math.floor(Math.random() * 4)] = correctAnswer;

    questionIdxEl.innerText = dictionary.indexOf(questionsWrd);
    questionTextEl.innerHTML = `What is the correct meaning of the word <span style='color: #159895; font-weight: bold;' onclick='speakWord("${questionsWrd['en']}")'>"${questionsWrd['en']}"</span>?`;
    progressTextEl.style.display = quizProgressEl.style.display = 'none';
    stutasEl.innerText = `Question ${QNo + 1}`;
    quizTimerEl.innerHTML = " Infinity";
    quizTimerEl.style.display = 'block';

    speakWord(questionsWrd['en']);
    Array.from(optionEls).forEach((el, i) => el.innerText = genaratedOptions[i]);

    btnNext.setAttribute("onclick", `intialQuestions(${QNo + 1})`);
    endBtn.style.display = 'block';
    endBtn.setAttribute('onclick', `intialQuestions(${QNo}, ${QNo})`);
    return;
  }

  console.log("Quick Practice initialized with question number:", QNo);

  if (QNo === limit) {
    document.getElementById("quiz").style.display = 'none';
    document.getElementById("quizEnd").style.display = 'block';
    document.getElementById("finalScore").innerHTML = `${score}/${limit}`;
    document.getElementById("prac_accuracy").innerHTML = `${((score / limit) * 100).toFixed(2)}%`;

    updateScoreInFirestore(score, limit);
    updateUIWithUserData(currentUserData.email).then(() => {
      console.log("User data updated successfully after practice session.");
    }).catch((error) => {
      console.error("Error updating user data after practice session:", error);
    });
    return;
  }

  const questionsWrd = randomWord();
  const correctAnswer = randomBN(questionsWrd);

  let genaratedOptions = Array.from({ length: 4 }, () => randomBN(randomWord()));
  genaratedOptions[Math.floor(Math.random() * 4)] = correctAnswer;

  questionIdxEl.innerText = dictionary.indexOf(questionsWrd);
  questionTextEl.innerHTML = `What is the correct meaning of the word <span style='color: #159895; font-weight: bold;' onclick='speakWord("${questionsWrd['en']}")'>"${questionsWrd['en']}"</span>?`;
  progressTextEl.innerHTML = `Question ${QNo + 1}/<span id='Qlimit'>${limit}</span>`;
  quizProgressEl.style.width = `${((QNo + 1) / limit) * 100}%`;
  stutasEl.innerText = `Question ${QNo + 1}`;

  Array.from(optionEls).forEach((el, i) => el.innerText = genaratedOptions[i]);

  speakWord(questionsWrd['en']);
  quizTimerEl.style.display = 'block';

  btnNext.setAttribute("onclick", `intialQuestions(${QNo + 1}, ${limit})`);

  if (QNo !== 0) {
    const timeParts = quizTimerEl.innerHTML.split(':');
    if (timeParts.length >= 3) {
      const remainingSeconds = parseInt(timeParts[1].trim()) * 60 + parseInt(timeParts[2].trim()) - 1;
      startTimer(remainingSeconds);
    }
  }
}
window.intializeCustomizedTest = async function () {
  document.getElementById("quizContainer").style.display = 'block';
  document.getElementById('customize_quiz').style.display = 'none';
  document.getElementById('dashboardContant').style.display = 'none';
  document.getElementById('quizEnd').style.display = 'none';
  score = 0;
  timerInitialized = true;
  intialQuestions(0, document.getElementById('quizLimit').value);
  startTimer(parseInt(document.getElementById('quizTime').value) * 60);
}
async function startTimer(time) {
  if (time === undefined) return;
  const timerElement = document.getElementById('quizTimer');
  let timeLeft = time;
  const timerInterval = setInterval(() => {
    if (document.getElementById("quizContainer").style.display === 'none' || !timerInitialized) {
      clearInterval(timerInterval);
      restartQuizUI();
      return;
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      document.getElementById("quiz").style.display = 'none';
      document.getElementById('quizEnd').style.display = 'block';
    } else {
      timerElement.textContent = `Time left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
      timeLeft--;
    }
  }, 1000);
}
window.intialUnlimitedPractice = function () {
  document.getElementById("quizContainer").style.display = 'block';
  document.getElementById('dashboardContant').style.display = 'none';
  document.getElementById('unlimitedTest').style.display = 'none';
  score = 0;
  intialQuestions(0);
}
window.selectOption = function (selectedOption) {
  let userSelectedOption = selectedOption.children[1].innerText;
  let questionIdx = document.getElementById("questionIdx").innerText;

  if (!dictionary[questionIdx].attemptScore && dictionary[questionIdx].attemptScore !== 0) {
    dictionary[questionIdx].attemptScore = 1.0;
  }

  let isAnswerCorrect = dictionary[questionIdx]['bn'].includes(userSelectedOption);

  if (isAnswerCorrect) {
    selectedOption.classList.add('correct');
    document.getElementById("stutas").innerText = "Correct! Well done.";
    score += dictionary[questionIdx].attemptScore;
    document.getElementById("btnNext").style.display = 'block';
    timerInitialized = false;
    Array.from(document.getElementsByClassName('quiz-option')).forEach(opt => opt.removeAttribute("onclick"));
  } else {
    selectedOption.classList.add('incorrect');
    document.getElementById("stutas").innerHTML = "Incorrect!";
    dictionary[questionIdx].attemptScore = Math.max(0, dictionary[questionIdx].attemptScore - 0.5);
  }
  document.getElementById("quiz-point").innerText = `Point: ${score}`;
}

async function updateScoreInFirestore(correctAnswersThisSession, questionsThisSession) {
  const user = auth.currentUser;
  if (!user) return Promise.reject("No user is currently signed in.");

  try {
    const userRef = collection(db, "users");
    const userQuery = query(userRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(userQuery);

    if (querySnapshot.empty) return Promise.reject("No user data found for email: " + user.email);

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    const currentPoints = userData.points || 0;
    const currentTotalQuestions = userData.totalQuestions || 0;
    const currentPracData = userData.pracData || {};

    const today = new Date().toISOString().split('T')[0];
    const newPoints = currentPoints + correctAnswersThisSession;
    const newTotalQuestions = currentTotalQuestions + questionsThisSession;
    const newPracData = {
      ...currentPracData,
      [today]: {
        correctAnswers: (currentPracData[today]?.correctAnswers || 0) + correctAnswersThisSession,
        totalQuestions: (currentPracData[today]?.totalQuestions || 0) + questionsThisSession
      }
    };

    const newAccuracy = newTotalQuestions > 0
      ? parseFloat((newPoints / newTotalQuestions).toFixed(1))
      : 0;

    await updateDoc(userDoc.ref, {
      points: newPoints,
      totalQuestions: newTotalQuestions,
      accuracy: newAccuracy,
      pracData: newPracData
    });

    const leaderboardQuery = query(userRef, orderBy("points", "desc"));
    const allUsersSnapshot = await getDocs(leaderboardQuery);

    let rank = 1;
    for (const doc of allUsersSnapshot.docs) {
      if (doc.data().email === user.email) break;
      rank++;
    }

    await updateDoc(userDoc.ref, { leaderboardRank: rank });
    updateUIWithUserData(user.email);
    return;
  } catch (error) {
    return Promise.reject(error);
  }
}

function restartQuizUI() {
  Array.from(document.getElementsByClassName('quiz-option')).forEach(opt => {
    opt.classList.remove('correct', 'incorrect');
    opt.setAttribute("onclick", "selectOption(this)");
  });
  document.getElementById("quiz-loadingSpinner").style.display = 'none';
  document.getElementById("quiz").style.display = 'block';
  document.getElementById('quizEnd').style.display = 'none';
  document.getElementById("btnNext").style.display = 'none';
  document.getElementById("endUnlimitedPractice").style.display = 'none';
}

function getLast7Dates() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function fetchPracticeDataAndRenderChart() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const q = query(collection(db, "users"), where("email", "==", user.email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const userDoc = snapshot.docs[0];
    const practiceData = userDoc.data().pracData || {};
    const labels = getLast7Dates();
    const data = labels.map(date => practiceData[date]?.correctAnswers || 0);
    renderChart(labels, data);
  });
}

function renderChart(labels, data) {
  const ctx = document.getElementById('progressChart');
  if (typeof Chart === 'undefined' || !ctx) return;
  new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Correct Answers',
        data: data,
        borderColor: '#159895',
        backgroundColor: 'rgba(21, 152, 149, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function updateStreakDays() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const q = query(collection(db, "users"), where("email", "==", user.email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const userDoc = snapshot.docs[0];
    const pracData = userDoc.data().pracData || {};
    const practicedDates = Object.keys(pracData).sort((a, b) => new Date(b) - new Date(a));
    let streakDays = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    for (const dateStr of practicedDates) {
      const practicedDate = new Date(dateStr);
      practicedDate.setHours(0, 0, 0, 0);
      if (practicedDate.getTime() === currentDate.getTime()) {
        streakDays++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    document.querySelectorAll('.streak-days').forEach(el => el.textContent = streakDays);
    await updateDoc(userDoc.ref, { streak: streakDays });
  });
}

async function fetchAllUsersFromFirestore() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function renderLeaderboard(allUsers, currentUserEmail) {
  const leaderboardBody = document.getElementById("leaderboard-data");
  leaderboardBody.innerHTML = "";
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

window.renderQuestionBank = async function () {
  const container = document.getElementById("dictionary-list");
  dictionary.forEach(entry => {
    const card = document.createElement("div");
    card.className = "word-card";
    card.innerHTML = `
      <div class="word-title">
        ${entry.en}
        <button class="pronounce-btn" onclick="speakWord('${entry.en}')">🔊</button>
      </div>
      <div class="word-details">
        <p><span>বাংলা অর্থ:</span> ${entry.bn.join(", ")}</p>
        <p><span>Definition:</span> ${entry.def.join("; ")}</p>
        <p><span>Synonyms:</span> ${entry.syn.join(", ") || 'N/A'}</p>
        <p><span>Antonyms:</span> ${entry.ant.join(", ") || 'N/A'}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

window.speakWord = function (word) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
}
