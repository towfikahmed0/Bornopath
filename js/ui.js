function switchtab(ele) {
  const tabIds = ["tab_1", "tab_2", "tab_3", "tab_4"];
  const contentIds = ["dashboardContant", "questionBank", "leaderboard", "profileContant"];
  const index = tabIds.indexOf(ele.id);

  tabIds.forEach((id, i) => {
    document.getElementById(id).classList.toggle("active", i === index);
    document.getElementById(contentIds[i]).style.display = i === index ? "block" : "none";
  });

  document.getElementById("quizContainer").style.display = 'none';
  if (ele.id === "tab_2") renderQuestionBank();
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
