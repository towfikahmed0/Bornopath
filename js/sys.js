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

import { SecurityUtils } from './security.js';
import { AuthSecurity } from './auth-security.js';
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
    const email = SecurityUtils.sanitizeInput(emailInput.value.trim());

    if (!email) {
        showError("*Please enter your email");
        emailInput.focus();
        return;
    }

    if (!SecurityUtils.validateEmail(email)) {
        showError("*Please enter a valid email address");
        emailInput.focus();
        return;
    }

    setButtonLoading(nextBtn, true);

    const exists = await ErrorHandler.withRetry(
        () => findUserByEmail(email),
        3, // max retries
        1000 // initial delay
    );



    // Show loading state
    setButtonLoading(nextBtn, true);

    try {
        const exists = await findUserByEmail(email);

        // Sanitize all inputs when showing forms
        if (!exists) {
            showElement(nameInput);
            showElement(genderInput);
            showElement(classInput);
            showElement(passwordInput);
            hideElement(nextBtn);
            showElement(signInBtn);
            emailInput.disabled = true;
            clearError();
        } else {
            showElement(passwordInput);
            hideElement(nextBtn);
            showElement(loginBtn);
            clearError();
            passwordInput.focus();
        }
    } catch (error) {
        console.error("Login next error:", error);
        ErrorHandler.handleError({
            type: ErrorHandler.ERROR_TYPES.AUTH,
            message: error.message,
            context: { action: 'login_next' },
            showToast: true
        });
    } finally {
        setButtonLoading(nextBtn, false);
    }
};

window.signUp = async function () {
    const email = SecurityUtils.sanitizeInput(emailInput.value.trim());
    const name = SecurityUtils.sanitizeInput(nameInput.value.trim());
    const gender = SecurityUtils.sanitizeInput(genderInput.value);
    const userClass = SecurityUtils.sanitizeInput(classInput.value);
    const password = passwordInput.value; // Don't sanitize password

    // Enhanced validation
    const validation = AuthSecurity.validateSignupInput({
        email, password, name, gender, userClass
    });

    if (!validation.valid) {
        showError(`*${validation.message}`);
        return;
    }

    setButtonLoading(signInBtn, true);

    try {
        const userCredential = await ErrorHandler.withRetry(
            () => createUserWithEmailAndPassword(auth, email, password),
            2,
            1000
        );
        const user = userCredential.user;

        await sendEmailVerification(user);

        // Create user document with sanitized data
        await setDoc(doc(db, "users", user.uid), {
            name: SecurityUtils.sanitizeInput(name),
            email: SecurityUtils.sanitizeInput(email),
            userClass: SecurityUtils.sanitizeInput(userClass),
            gender: SecurityUtils.sanitizeInput(gender),
            points: 0,
            accuracy: 0,
            streak: 0,
            totalQuestions: 0,
            lastActive: serverTimestamp(),
            mistakeWords: [],
            pracData: [],
            savedWordsIdx: [],
            leaderboardRank: 0,
            createdAt: serverTimestamp()
        });

        showSuccess("<i class='fa fa-check'></i> Verification email sent! Please verify your email and <a href='index.html'>Log in</a> again");

        setTimeout(() => window.location.replace("index.html"), 10000);
    } catch (error) {
        FirebaseErrorHandler.handleAuthError(error);
    } finally {
        setButtonLoading(signInBtn, false);
    }
};

// Replace the existing login function
window.login = async function () {
    const email = SecurityUtils.sanitizeInput(emailInput.value.trim());
    const password = passwordInput.value;

    // Enhanced validation with rate limiting
    const validation = AuthSecurity.validateLoginInput(email, password);
    if (!validation.valid) {
        showError(`*${validation.message}`);
        return;
    }

    setButtonLoading(loginBtn, true);

    try {
        const userCredential = await ErrorHandler.withRetry(
            () => signInWithEmailAndPassword(auth, email, password),
            2,
            1000
        );
        const user = userCredential.user;

        if (!user.emailVerified) {
            showError("*Please verify your email first. Check your inbox.");
            await sendEmailVerification(user);
            return;
        }

        // Reset login attempts on successful login
        AuthSecurity.resetLoginAttempts();

        await setDoc(doc(db, "users", user.uid), {
            lastActive: serverTimestamp()
        }, { merge: true });

        window.location.replace("dashboard.html");
    } catch (error) {
        FirebaseErrorHandler.handleAuthError(error);
    } finally {
        setButtonLoading(loginBtn, false);
    }
};

// Helper functions
function showError(message) {
    status.style.display = "block";
    status.innerHTML = SecurityUtils.sanitizeInput(message, true);
    status.className = "alert alert-danger";
}

function showSuccess(message) {
    status.style.display = "block";
    status.innerHTML = SecurityUtils.sanitizeInput(message, true);
    status.className = "alert alert-success";
}

function clearError() {
    status.style.display = "none";
    status.innerHTML = "";
}

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = "<div class='spinner-border spinner-border-sm' role='status'><span class='visually-hidden'>Loading...</span></div>";
    } else {
        button.disabled = false;
        button.innerHTML = button === nextBtn ? 'Next' :
            button === signInBtn ? 'Sign in' : 'Log in';
    }
}

function handleAuthError(error) {
    FirebaseErrorHandler.handleAuthError(error);
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