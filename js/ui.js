function switchtab(ele) {
    ele.classList.add("active");
    if (ele.id == "tab_1") {
        document.getElementById("tab_2").classList.remove("active")
        document.getElementById("tab_3").classList.remove("active")
        document.getElementById("tab_4").classList.remove("active")
        document.getElementById("dashboardContant").style.display = "block";
        document.getElementById("questionBank").style.display = "none";
        document.getElementById("leaderboard").style.display = "none";
        document.getElementById("profileContant").style.display = "none";
        document.getElementById("quizContainer").style.display = 'none';
    } else if(ele.id == 'tab_2') {
        document.getElementById("tab_1").classList.remove("active")
        document.getElementById("tab_3").classList.remove("active")
        document.getElementById("tab_4").classList.remove("active")
        document.getElementById("dashboardContant").style.display = "none";
        document.getElementById("questionBank").style.display = "block";
        document.getElementById("leaderboard").style.display = "none";
        document.getElementById("profileContant").style.display = "none";
        document.getElementById("quizContainer").style.display = 'none';
        renderQuestionBank();
    } else if(ele.id == 'tab_3') {
        document.getElementById("tab_1").classList.remove("active")
        document.getElementById("tab_2").classList.remove("active")
        document.getElementById("tab_4").classList.remove("active")
        document.getElementById("dashboardContant").style.display = "none";
        document.getElementById("questionBank").style.display = "none";
        document.getElementById("leaderboard").style.display = "block";
        document.getElementById("profileContant").style.display = "none";
        document.getElementById("quizContainer").style.display = 'none';
    }
    else{
        document.getElementById("tab_1").classList.remove("active")
        document.getElementById("tab_2").classList.remove("active")
        document.getElementById("tab_3").classList.remove("active")
        document.getElementById("dashboardContant").style.display = "none";
        document.getElementById("questionBank").style.display = "none";
        document.getElementById("leaderboard").style.display = "none";
        document.getElementById("profileContant").style.display = "block";
        document.getElementById("quizContainer").style.display = 'none';
    }
}

function selectOption(ele) {
    const container = document.getElementById("optionsContainer");
    if (container) {
        Array.from(container.children).forEach(child => {
            child.classList.remove("selected");
        });
    }
    ele.classList.add("selected");
    document.getElementById("opton-selected").innerText = ele.innerText;
}

window.addEventListener("beforeunload", function (e) {
  // Standard message (some browsers ignore custom text)
  e.preventDefault(); // Modern way
  e.returnValue = ''; // For backward compatibility
});
