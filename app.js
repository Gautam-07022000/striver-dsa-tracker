(() => {
  const data = window.STRIVER_TRACKER_DATA;
  const key = "striver-dsa-tracker-v1";
  const state = JSON.parse(localStorage.getItem(key) || '{"done":{},"notes":{}}');
  const topicsNode = document.querySelector("#topics");
  const template = document.querySelector("#questionTemplate");
  const search = document.querySelector("#searchInput");
  const status = document.querySelector("#statusFilter");
  const difficulty = document.querySelector("#difficultyFilter");

  function save() { localStorage.setItem(key, JSON.stringify(state)); }
  function matches(question, topic) {
    const term = search.value.trim().toLowerCase();
    const complete = Boolean(state.done[question.id]);
    return (!term || `${question.name} ${topic} ${question.difficulty}`.toLowerCase().includes(term)) &&
      (status.value === "all" || (status.value === "done") === complete) &&
      (difficulty.value === "all" || difficulty.value === question.difficulty);
  }
  function updateProgress() {
    const all = data.topics.flatMap(topic => topic.questions);
    const count = all.filter(question => state.done[question.id]).length;
    const percent = Math.round((count / all.length) * 100);
    document.querySelector("#progressRing").style.setProperty("--progress", `${percent * 3.6}deg`);
    document.querySelector("#progressPercent").textContent = `${percent}%`;
    document.querySelector("#progressLabel").textContent = `${count} of ${all.length} complete`;
  }
  function renderNotes(question, container) {
    container.replaceChildren();
    (state.notes[question.id] || []).forEach((note, index) => {
      const link = document.createElement("a"); link.className = "note-chip"; link.href = note.data; link.target = "_blank"; link.rel = "noopener"; link.textContent = note.name;
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.title = "Remove note";
      remove.addEventListener("click", event => { event.preventDefault(); state.notes[question.id].splice(index, 1); save(); renderNotes(question, container); });
      link.append(remove); container.append(link);
    });
  }
  function addResources(question, node) {
    [[question.leetcode, "LeetCode", ""], [question.gfg, "GeeksforGeeks", ""], [question.youtube, "Video", "video"]].forEach(([url, label, cls]) => {
      if (!url) return; const link = document.createElement("a"); link.href = url; link.target = "_blank"; link.rel = "noopener"; link.textContent = label; link.className = cls; node.append(link);
    });
  }
  function render() {
    topicsNode.replaceChildren();
    data.topics.forEach((topic, topicIndex) => {
      const questions = topic.questions.filter(question => matches(question, topic.name));
      if (!questions.length) return;
      const section = document.createElement("details"); section.className = "topic"; section.open = topicIndex === 0 || Boolean(search.value || status.value !== "all" || difficulty.value !== "all");
      const summary = document.createElement("summary"); summary.innerHTML = `<span>${topic.name}</span><small>${questions.filter(q => state.done[q.id]).length}/${questions.length} complete</small>`; section.append(summary);
      questions.forEach(question => {
        const node = template.content.firstElementChild.cloneNode(true);
        const checkbox = node.querySelector(".done-checkbox"); checkbox.checked = Boolean(state.done[question.id]); node.classList.toggle("is-done", checkbox.checked);
        checkbox.addEventListener("change", () => { state.done[question.id] = checkbox.checked; save(); render(); updateProgress(); });
        node.querySelector(".question-name").textContent = question.name;
        const badge = node.querySelector(".difficulty"); badge.textContent = question.difficulty; badge.dataset.level = question.difficulty;
        addResources(question, node.querySelector(".resources"));
        const list = node.querySelector(".note-list"); renderNotes(question, list);
        node.querySelector(".note-input").addEventListener("change", event => {
          [...event.target.files].forEach(file => { const reader = new FileReader(); reader.onload = () => { (state.notes[question.id] ||= []).push({name:file.name, data:reader.result}); save(); renderNotes(question, list); }; reader.readAsDataURL(file); });
        });
        section.append(node);
      });
      topicsNode.append(section);
    });
    if (!topicsNode.children.length) topicsNode.innerHTML = '<p class="empty">No questions match these filters.</p>';
  }
  [search, status, difficulty].forEach(control => {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  });
  document.querySelector("#resetButton").addEventListener("click", () => { if (confirm("Reset all completion checkmarks? Notes will remain.")) { state.done = {}; save(); render(); updateProgress(); } });
  updateProgress(); render();
})();
