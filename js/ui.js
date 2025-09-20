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
        document.getElementsByClassName('configpagebg')[0].style.display = 'none';
    } else if (ele.id == 'tab_2') {
        console.time("renderQuestionBank");
        document.getElementById("tab_1").classList.remove("active")
        document.getElementById("tab_3").classList.remove("active")
        document.getElementById("tab_4").classList.remove("active")
        document.getElementById("dashboardContant").style.display = "none";
        document.getElementById("questionBank").style.display = "block";
        document.getElementById("leaderboard").style.display = "none";
        document.getElementById("profileContant").style.display = "none";
        document.getElementById("quizContainer").style.display = 'none';
        document.getElementById('wordDetailsModalContent').style.display = 'none';
        document.getElementById('dictionary-word-list').style.display = 'block';
        document.getElementsByClassName('configpagebg')[0].style.display = 'none';
        if (document.getElementById('dictionary-word-list').children.length === 0) {
            renderQuestionBank();
        }
        console.timeEnd("renderQuestionBank");
    } else if (ele.id == 'tab_3') {
        document.getElementById("tab_1").classList.remove("active")
        document.getElementById("tab_2").classList.remove("active")
        document.getElementById("tab_4").classList.remove("active")
        document.getElementById("dashboardContant").style.display = "none";
        document.getElementById("questionBank").style.display = "none";
        document.getElementById("leaderboard").style.display = "block";
        document.getElementById("profileContant").style.display = "none";
        document.getElementById("quizContainer").style.display = 'none';
        document.getElementById('user2user_Profile').style.display = 'none';
        document.getElementsByClassName("leaderboard-container")[0].style.display = 'block';
        document.getElementById('leaderboard').style.padding = '19px';
        document.getElementsByClassName('configpagebg')[0].style.display = 'none';

    }
    else {
        document.getElementById("tab_1").classList.remove("active")
        document.getElementById("tab_2").classList.remove("active")
        document.getElementById("tab_3").classList.remove("active")
        document.getElementById("dashboardContant").style.display = "none";
        document.getElementById("questionBank").style.display = "none";
        document.getElementById("leaderboard").style.display = "none";
        document.getElementById("profileContant").style.display = "block";
        document.getElementById("quizContainer").style.display = 'none';
        document.getElementsByClassName('configpagebg')[0].style.display = 'none';
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

// document.getElementById('backToLeaderboardBtn').onclick = function() {
//     document.getElementsByClassName("leaderboard-container")[0].style.display = 'block';
//     document.getElementById('user2user_Profile').style.display = 'none';
//   }
// window.addEventListener("beforeunload", function (e) {
//   // Standard message (some browsers ignore custom text)
//   e.preventDefault(); // Modern way
//   e.returnValue = ''; // For backward compatibility
// });

function searchword() {
    console.time('searchWord');
    document.getElementById("dictionary-word-list").style.display = "block";
    document.getElementById("wordDetailsModalContent").style.display = 'none';
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById("searchInput");
    filter = input.value.toUpperCase();
    ul = document.getElementById("dictionary-word-list");
    li = ul.getElementsByTagName("li");
    
    var noResults = document.getElementById("no-results-message");
    noResults.innerHTML = `No results found. <button class="btn-primary btn" onclick="askAI_searchword()">Ask AI</button>`;
    var foundItems = 0;
    for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            li[i].style.display = "";
            foundItems++;
        } else {
            li[i].style.display = "none";
        }
    }

    // Show or hide the "no results" message
    if (foundItems === 0 && filter.length > 0) {
        noResults.style.display = "block";
    } else {
        noResults.style.display = "none";
    }
    
    console.timeEnd('searchWord');
}
// document.getElementById("searchInput").addEventListener('focus', () => {
//   document.getElementById("dictionary-word-list").style.display = 'block';
// });
// document.getElementById("searchInput").addEventListener('blur', () => {
//   setTimeout(() => {
//     document.getElementById("dictionary-word-list").style.display = 'none';
//   }, 2000); // Delay to allow click events on list items
// });

function switchProfileTab(tab) {
    const tabs = document.querySelectorAll('.pf-tab-btn');
    const tabBtn = document.getElementById(tab+'Tab');
    tabs.forEach(t => {
        t.classList.remove('active');
    });
    tabBtn.classList.add('active');

    const tabContent = document.querySelectorAll('.profile-tab-content');
    tabContent.forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(tab).style.display = 'block';
}