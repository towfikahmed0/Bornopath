 import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    setDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB12GMrNdELvkdSKxF8Ij2IGKRqUh63WTc",
    authDomain: "wordvo-bb47d.firebaseapp.com",
    projectId: "wordvo-bb47d",
    storageBucket: "wordvo-bb47d.firebasestorage.app",
    messagingSenderId: "1050344621419",
    appId: "1:1050344621419:web:29909f4d722e58b1e9b82e",
    measurementId: "G-LCXCH1X6C2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const status = document.getElementById("status");
const emailInput = document.getElementById("email");
const nameInput = document.getElementById("name");
const genderInput = document.getElementById("gender");
const classInput = document.getElementById("class");
const passwordInput = document.getElementById("password");
const nextBtn = document.getElementById("nextbtn");
const signInBtn = document.getElementById("signinbtn");
const loginBtn = document.getElementById("loginbtn");

// Enhanced user check with error handling
async function findUserByEmail(emailToFind) {
    try {
        const q = query(
            collection(db, "users"),
            where("email", "==", emailToFind)
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error("Error checking user:", error);
        status.innerHTML = "*Error checking user. Please try again.";
        return false;
    }
}

// Improved login_next function
window.login_next = async function () {
    const email = emailInput.value.trim();

    if (!email) {
        status.innerHTML = "*Please enter your email";
        emailInput.focus();
        return;
    }

    if (!validateEmail(email)) {
        status.innerHTML = "*Please enter a valid email address";
        emailInput.focus();
        return;
    }
    document.getElementById("nextbtn").innerHTML = "<div class='spinner-border' role='status'><span class='visually-hidden'>Loading...</span></div>";
    try {
        const exists = await findUserByEmail(email);

        if (!exists) {
            // New user flow
            showElement(nameInput);
            showElement(genderInput);
            showElement(classInput);
            showElement(passwordInput);
            hideElement(nextBtn);
            showElement(signInBtn);
            emailInput.disabled = true;
            status.innerHTML = "";
        } else {
            // Existing user flow
            showElement(passwordInput);
            hideElement(nextBtn);
            showElement(loginBtn);
            status.innerHTML = "";
            passwordInput.focus();
        }
    } catch (error) {
        console.error("Login next error:", error);
        status.style.display = "block";
        status.innerHTML = "*Something went wrong. Please try again.";
        document.getElementById("nextbtn").innerHTML = 'Next';
    }
};

// Enhanced signUp function with email verification
window.signUp = async function () {
    const email = emailInput.value.trim();
    const name = nameInput.value.trim();
    const gender = genderInput.value;
    const user_class = classInput.value;
    const password = passwordInput.value;

    // Validation
    if (!name || !gender || !user_class || !password) {
        status.style.display = "block";
        status.innerHTML = "*Please fill all fields";
        return;
    }

    if (password.length < 6) {
        status.style.display = "block";
        status.innerHTML = "*Password must be at least 6 characters";
        passwordInput.focus();
        return;
    }
    document.getElementById("signinbtn").innerHTML = "<div class='spinner-border' role='status'><span class='visually-hidden'>Loading...</span></div>";
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Send email verification
        await sendEmailVerification(user);

        // Create user document with additional stats for ranking
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            userClass: user_class,
            gender: gender,
            points: 0,           // For ranking
            accuracy: 0,       // 100% as float (0-1)
            streak: 0,
            totalQuestions: 0,
            lastActive: serverTimestamp(),
            mistakeWords: [],
            pracData: [],
            savedWordsIdx: [],
            leaderboardRank: 0, // For ranking
            createdAt: serverTimestamp()
        });
        status.style.display = "block";
        status.innerHTML = "<p style='color: #159895d6;'><i class='fa fa-check'></i> Verification email sent! Please verify your email And <a href = 'index.html'>Log in</a> again</p>";
        document.getElementById("signinbtn").innerHTML = 'Sign in';
        setTimeout(() => window.location.replace("index.html"), 10000);
    } catch (error) {
        console.error("Sign up error:", error);
        document.getElementById("signinbtn").innerHTML = 'Sign in';
        handleAuthError(error);
    }
};

// Improved login function
window.login = async function () {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!password) {
        status.style.display = "block";
        status.innerHTML = "*Please enter your password";
        passwordInput.focus();
        return;
    }
    document.getElementById("loginbtn").innerHTML = "<div class='spinner-border' role='status'><span class='visually-hidden'>Loading...</span></div>";
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
            status.style.display = "block";
            status.innerHTML = "*Please verify your email first. Check your inbox.";
            await sendEmailVerification(user);
            return;
        }

        // Update last active timestamp
        await setDoc(doc(db, "users", user.uid), {
            lastActive: serverTimestamp()
        }, { merge: true });

        window.location.replace("dashboard.html");
    } catch (error) {
        console.error("Login error:", error);
        document.getElementById("loginbtn").innerHTML = 'Log in';
        handleAuthError(error);
    }
};

// Helper functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function handleAuthError(error) {
    switch (error.code) {
        case "auth/email-already-in-use":
            status.style.display = "block";
            status.innerHTML = "*Email already in use";
            break;
        case "auth/invalid-email":
            status.style.display = "block";
            status.innerHTML = "*Invalid email address";
            break;
        case "auth/weak-password":
            status.style.display = "block";
            status.innerHTML = "*Password should be at least 6 characters";
            break;
        case "auth/user-not-found":
            status.style.display = "block";
            status.innerHTML = "*User not found";
            break;
        case "auth/wrong-password":
            status.style.display = "block";
            status.innerHTML = "*Wrong password";
            break;
        default:
            status.style.display = "block";
            status.innerHTML = "*Something went wrong. Please try again.";
    }
}

function showElement(element) {
    element.style.display = "block";
}

function hideElement(element) {
    element.style.display = "none";
}

// Auth state listener
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        window.location.replace("dashboard.html");
    }
})