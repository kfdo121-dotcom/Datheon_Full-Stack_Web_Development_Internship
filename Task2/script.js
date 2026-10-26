const KEY = "taskboard.tasks.v1";
let tasks = [];
let filter = "all", catFilter = "", query = "", editingId = null, dragId = null;
const $ = id => document.getElementById(id);

function saveToLocalStorage(){
  try{ localStorage.setItem(KEY, JSON.stringify(tasks)); }catch(e){ console.warn("Could not save", e); }
}
function loadFromLocalStorage(){
  try{
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data) ? data : [];
  }catch(e){ return []; }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const fmt = iso => new Date(iso+"T00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});

// CRUD
function addTask(title, category, due){
  tasks.unshift({id:uid(), title, category, due, done:false, created:Date.now()});
  persist();
}
function updateTask(id, patch){ tasks = tasks.map(t => t.id===id ? {...t,...patch} : t); persist(); }
function deleteTask(id){ tasks = tasks.filter(t => t.id!==id); persist(); }
function persist(){ saveToLocalStorage(); }

function visible(){
  const q = query.trim().toLowerCase();
  return tasks.filter(t =>
    (filter==="all" || (filter==="active" ? !t.done : t.done)) &&
    (!catFilter || t.category===catFilter) &&
    (!q || t.title.toLowerCase().includes(q)));
}

function el(tag, props={}, ...kids){
  const n = Object.assign(document.createElement(tag), props);
  kids.forEach(k => n.append(k));
  return n;
}
function field(tag, value, label){ const n = el(tag,{className:"field"}); n.setAttribute("aria-label",label); if(value!==undefined) n.value = value; return n; }

function taskRow(t){
  const li = el("li",{className:"task"+(t.done?" done":"")});
  li.dataset.id = t.id; li.dataset.cat = t.category;

  if(editingId===t.id){
    const title = field("input", t.title, "Title"); title.maxLength = 140;
    const cat = field("select", undefined, "Category");
    ["Work","Personal","Study","Other"].forEach(c => cat.append(el("option",{textContent:c})));
    cat.value = t.category;
    const due = field("input", t.due||"", "Due date"); due.type = "date";
    const save = () => {
      const v = title.value.trim();
      if(!v){ title.focus(); return; }
      editingId = null; updateTask(t.id,{title:v,category:cat.value,due:due.value}); render();
    };
    const cancel = () => { editingId = null; render(); };
    const box = el("div",{className:"edit"}, title, cat, due,
      el("button",{className:"btn",type:"button",textContent:"Save",onclick:save}),
      el("button",{className:"btn ghost",type:"button",textContent:"Cancel",onclick:cancel}));
    box.addEventListener("keydown", e => { if(e.key==="Enter") save(); if(e.key==="Escape") cancel(); });
    li.append(box);
    setTimeout(()=>title.focus());
    return li;
  }

  li.draggable = true;
  const check = el("input",{type:"checkbox",className:"check",checked:t.done});
  check.setAttribute("aria-label","Mark \u201C"+t.title+"\u201D complete");
  check.onchange = () => {
    updateTask(t.id,{done:check.checked});
    li.classList.toggle("done", check.checked);
    const hidden = (filter==="active" && check.checked) || (filter==="completed" && !check.checked);
    setTimeout(()=>{ if(hidden) li.classList.add("gone"); setTimeout(render, hidden?300:0); }, 450);
  };

  const meta = el("div",{className:"meta"}, el("span",{className:"cat",textContent:t.category}));
  if(t.due){
    const late = !t.done && t.due < today();
    meta.append(el("span",{className:late?"late":"",textContent:(late?"Overdue \u00B7 ":"Due ")+fmt(t.due)}));
  }
  const txt = el("span",{className:"txt",textContent:t.title});
  txt.ondblclick = () => { editingId = t.id; render(); };
  const body = el("div",{className:"body"}, el("div",{},txt), meta);

  const edit = el("button",{className:"icon",type:"button",textContent:"Edit",onclick:()=>{editingId=t.id;render();}});
  edit.setAttribute("aria-label","Edit "+t.title);
  const del = el("button",{className:"icon",type:"button",textContent:"Delete",onclick:()=>{
    li.classList.add("gone"); setTimeout(()=>{deleteTask(t.id); render();},300);}});
  del.setAttribute("aria-label","Delete "+t.title);

  li.append(check, body, el("div",{className:"acts"},edit,del));

  // drag and drop reorder
  li.addEventListener("dragstart", e => { dragId = t.id; li.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain",t.id); });
  li.addEventListener("dragend", () => { dragId = null; li.classList.remove("dragging"); });
  li.addEventListener("dragover", e => { if(dragId && dragId!==t.id){ e.preventDefault(); li.classList.add("over"); } });
  li.addEventListener("dragleave", () => li.classList.remove("over"));
  li.addEventListener("drop", e => {
    e.preventDefault(); li.classList.remove("over");
    if(!dragId || dragId===t.id) return;
    const from = tasks.findIndex(x=>x.id===dragId);
    const [moved] = tasks.splice(from,1);
    tasks.splice(tasks.findIndex(x=>x.id===t.id),0,moved);
    persist(); render();
  });
  return li;
}

function render(){
  const list = $("list"), shown = visible();
  list.replaceChildren(...shown.map(taskRow));
  if(!shown.length){
    const msg = tasks.length ? "No tasks match these filters." : "No tasks yet. Add your first one above.";
    list.append(el("li",{className:"empty",textContent:msg}));
  }
  const left = tasks.filter(t=>!t.done).length;
  $("count").textContent = left + (left===1 ? " task left" : " tasks left");
  $("clear").hidden = !tasks.some(t=>t.done);
}

// events
$("add").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("title").value.trim();
  if(!title){ $("err").textContent = "Enter a task title to add it."; $("title").focus(); return; }
  $("err").textContent = "";
  addTask(title, $("cat").value, $("due").value);
  $("title").value = ""; $("due").value = "";
  $("title").focus(); render();
});
$("status").addEventListener("click", e => {
  const b = e.target.closest("button"); if(!b) return;
  filter = b.dataset.f;
  [...$("status").children].forEach(x => x.setAttribute("aria-pressed", x===b));
  render();
});
$("cat-filter").onchange = e => { catFilter = e.target.value; render(); };
$("search").oninput = e => { query = e.target.value; render(); };
$("clear").onclick = () => { tasks = tasks.filter(t=>!t.done); persist(); render(); };

tasks = loadFromLocalStorage();
render();