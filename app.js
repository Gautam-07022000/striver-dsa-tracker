(() => {
  const data = window.STRIVER_TRACKER_DATA;
  const key = "striver-dsa-tracker-v1";
  const state = JSON.parse(localStorage.getItem(key) || '{"done":{}}');
  const githubRepo = "Gautam-07022000/striver-dsa-tracker";
  const githubTreeApi = `https://api.github.com/repos/${githubRepo}/git/trees/main?recursive=1`;
  const githubRawBase = `https://raw.githubusercontent.com/${githubRepo}/main`;
  const githubNotesUpload = `https://github.com/${githubRepo}/upload/main/notes`;
  const githubNotes = new Map();
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
  function noteFolder(question) {
    const slug = question.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${question.id}-${slug}`;
  }
  function githubPathUrl(path) {
    return `${githubRawBase}/${path.split("/").map(encodeURIComponent).join("/")}`;
  }
  function renderNotes(question, container) {
    container.replaceChildren();
    const notes = githubNotes.get(noteFolder(question)) || [];
    if (!notes.length) {
      const empty = document.createElement("span"); empty.className = "note-empty"; empty.textContent = "No GitHub notes yet"; container.append(empty); return;
    }
    notes.forEach(note => {
      const link = document.createElement("a"); link.className = "note-chip"; link.href = note.url; link.target = "_blank"; link.rel = "noopener"; link.textContent = note.name; container.append(link);
    });
  }
  async function loadGitHubNotes() {
    try {
      const response = await fetch(githubTreeApi, { headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) return;
      const tree = await response.json();
      tree.tree.filter(file => file.type === "blob").forEach(file => {
        const match = file.path.match(/^notes\/([^/]+)\/(.+)$/);
        if (!match || match[2] === "note.md") return;
        const note = { name: match[2], url: githubPathUrl(file.path) };
        githubNotes.set(match[1], [...(githubNotes.get(match[1]) || []), note]);
      });
    } catch (_) {
      // Notes are optional; the tracker remains usable if GitHub is unavailable.
    } finally {
      render();
    }
  }
  async function loadTextNote(folder, textarea, button) {
    if (textarea.dataset.loaded === "true") return;
    textarea.value = "Loading GitHub text note…";
    button.disabled = true;
    try {
      const response = await fetch(githubPathUrl(`notes/${folder}/note.md`));
      textarea.value = response.ok ? await response.text() : "No text note has been added yet.";
      textarea.dataset.loaded = "true";
    } catch (_) {
      textarea.value = "The GitHub text note could not be loaded. Please try again.";
    } finally {
      button.disabled = false;
    }
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
        const folder = noteFolder(question);
        const upload = node.querySelector(".note-upload"); upload.href = `${githubNotesUpload}/${encodeURIComponent(folder)}`;
        upload.title = `Upload a PDF or image to this question's GitHub folder`;
        const editor = node.querySelector(".note-editor"); editor.href = `https://github.com/${githubRepo}/edit/main/notes/${encodeURIComponent(folder)}/note.md`;
        node.querySelector(".note-key").textContent = `GitHub folder: notes/${folder}`;
        const textarea = node.querySelector(".note-text");
        const loadButton = node.querySelector(".load-note");
        loadButton.addEventListener("click", () => loadTextNote(folder, textarea, loadButton));
        renderNotes(question, node.querySelector(".note-list"));
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
  document.querySelector("#resetButton").addEventListener("click", () => { if (confirm("Reset all completion checkmarks? GitHub notes will remain.")) { state.done = {}; save(); render(); updateProgress(); } });
  updateProgress(); render(); loadGitHubNotes();
})();
