import { Notify, Crypt, Peering, Talk, Media, Database } from "/modules.js";

const el = (x) => document.getElementById(x);
const THEMES = ["zen", "psi", "feb", "rho"]
const ELEMENTS = {
  notificationSpan: el("notificationSpan"), callPeer: el("callPeer"),
  logo: document.getElementsByClassName("logo"), myID: el("myID"),
  connPeer: el("connPeer"), previewItemBox: el("previewItemBox"),
  screenCheck: el("screenCheck"), audioCheck: el("audioCheck"),
  videoCheck: el("videoCheck"), faceCamCheck: el("faceCamCheck"),
  autoSaveLocalCheck: el("autoSaveLocalCheck"), files: el("files"),
  autoSaveDBCheck: el("autoSaveDBCheck"), preview: el("preview"),
  getStreamBtn: el("getStreamBtn"), newID: el("newID"),
  remoteID: el("remoteID"), connBtn: el("connBtn"),
  callBtn: el("callBtn"), myPlayer: el("myPlayer"),
  othPlayer: el("othPlayer"), encKey: el("encKey"),
  messages: el("messages"), fileInput: el("fileInput"),
  textInput: el("textInput"), sendBtn: el("sendBtn"),
  sendForm: el("sendForm"), botSendForm: el("botSendForm"),
  botMessages: el("botMessages"), botFileInput: el("botFileInput"),
  botTextInput: el("botTextInput"), voiceChatBtn: el("voiceChatBtn"),
  email: el("email"), password: el("password"), loginBtn: el("loginBtn"),
  searchFile: el("searchFile"), fileList: el("fileList"),
  fileName: el("fileName"), saveFileBtn: el("saveFileBtn"),
};
const nf = new Notify(ELEMENTS.notificationSpan, "/notify.mp3");
const cr = new Crypt((msg) => nf.notify(msg, null, 4000));
const pr = new Peering((msg) => nf.notify(msg, null, 4000));
const tk = new Talk((msg) => nf.notify(msg, null, 4000));
const md = new Media((msg) => nf.notify(msg, null, 4000));
const db = new Database("https://filestore-api.vercel.app", (msg) => nf.notify(msg, null, 4000))

const newDiv = col => {
  const div = document.createElement("div")
  div.classList.add("flex")
  col && div.classList.add("flex-column")
  return div
}
const newBtn = (text, sec) => {
  const btn = document.createElement("button")
  btn.classList.add("btn", "pointer", sec ? "sec-bg" : "prim-bg")
  btn.innerText = text
  return btn
}
const newDlBtn = (fname, href, sec) => {
  const a = document.createElement("a")
  a.download = fname
  a.href = href
  const btn = newBtn("Download", sec)
  btn.onclick = () => a.click()
  return btn
}
const generateMediaSaveBtns = (fname, ftype, fdata, fsize, sec) => {
  const dlBtn = newDlBtn(fname, URL.createObjectURL(fdata), sec)
  ELEMENTS.autoSaveLocalCheck.checked && dlBtn.click();
  if (db.user) {
    const ulBtn = newBtn("Upload", sec)
    ulBtn.onclick = () => cr.encryptFile(fdata, true, txt => { db.saveFile({ name: fname, type: ftype, content: txt, size: fsize }) })
    ELEMENTS.autoSaveDBCheck.checked && ulBtn.click()
    const div = newDiv()
    div.append(dlBtn, ulBtn)
    return div
  }
  return dlBtn;
};
const generateEncSaveBtns = (fname, ftype, fdata, fsize, sec) => {
  const dlBtn = newBtn("Download", sec)
  dlBtn.onclick = () => cr.decryptFile(fdata, true, blob => { newDlBtn(fname, URL.createObjectURL(blob)).click() })
  ELEMENTS.autoSaveLocalCheck.checked && dlBtn.click();
  if (db.user) {
    const ulBtn = newBtn("Upload", sec)
    ulBtn.onclick = () => db.saveFile({ name: fname, type: ftype, content: fdata, size: fsize })
    ELEMENTS.autoSaveDBCheck.checked && ulBtn.click()
    const div = newDiv()
    div.append(dlBtn, ulBtn)
    return div
  }
  return dlBtn;
};
const snapshot = (player) => {
  if (!player.srcObject) return
  const canvas = document.createElement("canvas");
  canvas.height = player.videoHeight;
  canvas.width = player.videoWidth;
  canvas.style.maxHeight = "20vh";
  canvas.getContext("2d").drawImage(player, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    const btns = generateMediaSaveBtns(`Img-${new Date().toString()}.png`, blob.type, blob, blob.size);
    const div = newDiv(true)
    div.append(canvas, btns);
    nf.notify("Snapshot Captured", div, 5000);
  });
};
const listFileMsg = (from, container, fname, ftype, fsize, fdata) => {
  const div = newDiv()
  div.innerText = `${from}: ${fname} (${fsize} Bytes) `;
  if (from !== "ME") {
    const btns = typeof fdata === "string" ? generateEncSaveBtns(fname, ftype, fdata, fsize, true) : generateMediaSaveBtns(fname, ftype, fdata, fsize, true)
    div.append(btns);
  }
  container.append(div);
  container.scrollTop = container.scrollHeight;
};
const listMsg = (from, data, bot = false) => {
  const msgDiv = bot ? ELEMENTS.botMessages : ELEMENTS.messages;
  if (data.text) {
    const div = newDiv()
    div.innerText = from + ": " + data.text;
    msgDiv.append(div);
    msgDiv.scrollTop = msgDiv.scrollHeight;
  }
  if (data.body) {
    const div = newDiv()
    div.innerText = from + ": ";
    div.append(data.body)
    msgDiv.append(div);
    msgDiv.scrollTop = msgDiv.scrollHeight;
  }
  if (data.file) {
    listFileMsg(from, msgDiv, data.file.name, data.file.type, data.file.size, data.file.content)
  }
};
const ipLookup = async ip => {
  try {
    const url = ip ? `https://ipapi.co/${ip}/json/` : `https://ipapi.co/json/`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) {
      nf.notify(data.reason, null, 4000)
    } else {
      const a = document.createElement("a")
      a.classList.add("nav-link")
      a.innerText = "on Google Maps"
      a.href = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
      a.rel = "noreferrer noopener nofollow"
      a.target = "_blank"
      return {
        body: a,
        ip: data.ip,
        text: `IP: ${data.ip}\nCity: ${data.city}\nCountry: ${data.country_name}\nLatitude: ${data.latitude}\nLongitude: ${data.longitude}\nOrg: ${data.org}`
      }
    }
  } catch (e) { nf.notify(e.message || e.error || "Something went wrong.", null, 4000) }
}
const botHandle = async (txt, speak) => {
  const fl = ELEMENTS.botFileInput.files[0];
  ELEMENTS.botFileInput.value = "";
  ELEMENTS.botTextInput.value = "";
  const lower = txt.toLowerCase().replaceAll(" ", "");
  if (!lower) return;
  const data = { text: txt, file: null }
  if (fl) {
    data.file = { name: fl.name, type: fl.type, size: fl.size, content: fl }
  }
  listMsg("ME", data, true)
  if (lower.includes("encrypt") && fl) {
    cr.encryptFile(fl, true, (enctxt) => {
      const blob = new Blob([enctxt]);
      let resData = { text: "File encrypted successfully", file: { name: fl.name + ".uru", type: "text/uru", size: blob.size, content: blob } };
      listMsg("BOT", resData, true);
      speak && tk.speak(resData.text);
    });
  } else if (lower.includes("decrypt") && fl) {
    const reader = new FileReader();
    reader.onload = (e) => {
      cr.decryptFile(e.target.result, true, (blob) => {
        let resData = { text: "File decrypted successfully", file: { name: fl.name.split(".uru")[0], type: "application/uru", size: blob.size, content: blob } };
        listMsg("BOT", resData, true);
        speak && tk.speak(resData.text);
      });
    };
    reader.readAsText(fl);
  } else if (lower.includes("upload") && fl && db.user) {
    cr.encryptFile(fl, true, txt => { db.saveFile({ name: fl.name, type: fl.type, content: txt, size: fl.size }) })
  } else if (lower.includes("myip")) {
    const endpoints = ['https://api.ipify.org?format=json', 'https://api6.ipify.org?format=json']
    endpoints.forEach(url => fetch(url).then(res => res.json()).then(body => listMsg("BOT", { text: body.ip }, true)).catch(e => nf.notify(e.message || e.error || "Something went wrong.", null, 4000)));
    let resData = await ipLookup() || { text: "Error loading IP data." }
    listMsg("BOT", resData, true)
    resData.ip && speak && tk.speak(`Your IP address is: ${resData.ip}`)
  } else if (lower.includes("checkip")) {
    let resData = await ipLookup(lower.replace("checkip", "")) || { text: "Error loading IP data." }
    listMsg("BOT", resData, true)
    resData.ip && speak && tk.speak(`Fetched IP details for: ${resData.ip}`)
  } else {
    let resData = { text: "unknown command" };
    listMsg("BOT", resData, true);
    speak && tk.speak(resData.text);
  }
};
const sendMsg = () => {
  if (!pr.conn) return
  const tx = ELEMENTS.textInput.value.trim();
  const fl = ELEMENTS.fileInput.files[0];
  ELEMENTS.textInput.value = "";
  ELEMENTS.fileInput.value = "";
  if (fl) {
    const data = { text: tx, file: { name: fl.name, type: fl.type, size: fl.size, content: fl } }
    listMsg("ME", data);
    cr.encryptFile(fl, true, (txt) => {
      data.file.content = txt
      pr.send(JSON.stringify(data));
    });
  } else if (tx) {
    const data = { text: tx, file: null }
    pr.send(JSON.stringify(data));
    listMsg("ME", data);
  }
};
const recordHandle = e => {
  e.preventDefault();
  if (e.target.srcObject) {
    md.mediaRecorders[e.target.id] ? md.mediaRecorders[e.target.id].stop() : md.recordStream(e.target.id, e.target.srcObject);
  }
}
const getStream = async btn => {
  if (btn.innerText === "Start") {
    const stream = ELEMENTS.screenCheck.checked ? await md.getDisplayMedia("ME", { video: ELEMENTS.videoCheck.checked, audio: ELEMENTS.audioCheck.checked }) : await md.getUserMedia("ME", { video: ELEMENTS.videoCheck.checked ? { facingMode: ELEMENTS.faceCamCheck.checked ? "user" : "environment" } : false, audio: ELEMENTS.audioCheck.checked });
    if (stream) {
      ELEMENTS.myPlayer.srcObject = stream;
      btn.innerText = "Stop";
    }
  } else {
    md.mediaRecorders["myPlayer"] && md.mediaRecorders["myPlayer"].stop();
    md.stopStream("ME");
    ELEMENTS.myPlayer.srcObject = null;
    btn.innerText = "Start";
  }
};
const loadFile = async (file, cb) => {
  if (file.data) {
    cb()
  } else {
    const fl = await db.getFile(file._id)
    fl && cr.decryptFile(fl.data, true, (blob) => {
      file.data = URL.createObjectURL(blob)
      cb()
    })
  }
}
const generatePreviewBtns = file => {
  const div = newDiv()
  const previewBtn = newBtn("Preview", true)
  previewBtn.onclick = () => {
    loadFile(file, async () => {
      if (file.type.includes("image")) {
        file.preview = document.createElement("img")
        file.preview.src = file.data
      } else if (file.type.includes("video")) {
        file.preview = document.createElement("video")
        file.preview.controls = true
        file.preview.src = file.data
      } else if (file.type.includes("text")) {
        file.preview = document.createElement("textarea")
        file.preview.rows = 10
        file.preview.cols = 35
        file.preview.classList.add("rubik-text")
        const res = await fetch(file.data)
        file.preview.value = await res.text()
      } else {
        return nf.notify("Preview not available.", null, 4000)
      }
      file.preview.id = "previewItem"
      file.preview.doc = file._id
      file.preview.ftype = file.type
      ELEMENTS.fileName.value = file.name
      ELEMENTS.previewItemBox.textContent = ""
      ELEMENTS.previewItemBox.append(file.preview)
    })
  }
  const dlBtn = newBtn("Download", true)
  dlBtn.onclick = () => {
    dlBtn.disabled = true
    loadFile(file, () => {
      newDlBtn(file.name, file.data).click()
      dlBtn.disabled = false
    })
  }
  const delBtn = newBtn("Delete", true)
  delBtn.onclick = async () => {
    delBtn.disabled = true
    await db.deleteFile(file._id)
    listFiles()
  }
  div.append(previewBtn, dlBtn, delBtn)
  return div
}
const listFiles = async (query) => {
  if (!db.user) return
  ELEMENTS.fileList.innerHTML = ""
  const files = await db.getFiles(query)
  files?.forEach(file => {
    const div = newDiv()
    div.innerText = `${file.name} (${file.size} Bytes)`
    div.append(generatePreviewBtns(file))
    ELEMENTS.fileList.append(div)
  });
}
const loadTheme = next => {
  const a = localStorage.getItem("theme")
  if (!next) return document.documentElement.setAttribute("data-theme", a || THEMES[0])
  let i = 0
  if (a) i = THEMES.indexOf(a)
  let j = 0
  if (i < THEMES.length - 1) j = i + 1
  const b = THEMES[j]
  document.documentElement.setAttribute("data-theme", b)
  localStorage.setItem("theme", b)
}

md.onRecStop = (blob) => nf.notify(`File size: ${blob.size} Bytes`, generateMediaSaveBtns(`Rec-${new Date().toString()}.mp4`, blob.type, blob, blob.size), 5000);
pr.onPeerOpen = (id) => {
  ELEMENTS.myID.innerText = id;
  ELEMENTS.myID.classList.add("pointer");
  ELEMENTS.myID.onclick = () => navigator.clipboard.writeText(id);
  ELEMENTS.callBtn.disabled = false;
  ELEMENTS.connBtn.disabled = false;
  nf.notify(`Connected as ${id}`, null, 4000)
};
pr.onConnData = (from, data) => {
  listMsg(from, JSON.parse(data))
}
pr.onCallStream = (id, stream) => {
  ELEMENTS.othPlayer.srcObject = stream;
  ELEMENTS.callPeer.innerText = id;
};
pr.onInCall = async (id) => {
  if (window.confirm(`${id} is calling`)) {
    const stream = md.streams["ME"] || await md.getUserMedia("ME", { video: { facingMode: "user" }, audio: true });
    if (stream) {
      pr.answerCall(stream);
      ELEMENTS.myPlayer.srcObject = stream;
    }
  }
};
pr.onConnOpen = (id) => {
  ELEMENTS.connPeer.innerText = id;
  ELEMENTS.sendBtn.disabled = false;
};
tk.onRecStart = (e) => { ELEMENTS.voiceChatBtn.innerText = "Stop" }
tk.onRecEnd = (e) => {
  ELEMENTS.voiceChatBtn.innerText = "Talk";
  nf.notify("Voice recognition stopped", null, 4000);
};
tk.onRecResult = (e) => {
  const x = e.results[e.resultIndex][0];
  x.confidence > 0.7 && botHandle(x.transcript, true);
};
db.onAuthChanged = async user => {
  if (user) {
    ELEMENTS.loginBtn.innerText = "Logout"
    ELEMENTS.email.classList.add("d-none")
    ELEMENTS.password.classList.add("d-none")
    ELEMENTS.files.classList.remove("d-none")
    ELEMENTS.preview.classList.remove("d-none")
    listFiles()
  } else {
    ELEMENTS.loginBtn.innerText = "Login"
    ELEMENTS.email.classList.remove("d-none")
    ELEMENTS.password.classList.remove("d-none")
    ELEMENTS.files.classList.add("d-none")
    ELEMENTS.preview.classList.add("d-none")
  }
  ELEMENTS.loginBtn.disabled = false
}

ELEMENTS.searchFile.onchange = e => listFiles(e.target.value.trim())
ELEMENTS.encKey.onchange = (e) => cr.updateKey(e.target.value.trim())
ELEMENTS.botTextInput.onchange = (e) => botHandle(e.target.value.trim());
ELEMENTS.connBtn.onclick = (e) => pr.connectChat(ELEMENTS.remoteID.value.trim())
ELEMENTS.textInput.onchange = sendMsg
ELEMENTS.sendBtn.onclick = sendMsg
ELEMENTS.voiceChatBtn.onclick = (e) => e.target.innerText === "Talk" ? tk.start() : tk.stop()
ELEMENTS.autoSaveLocalCheck.onchange = (e) => localStorage.setItem("asl", e.target.checked);
ELEMENTS.autoSaveDBCheck.onchange = (e) => localStorage.setItem("asdb", e.target.checked);
ELEMENTS.myPlayer.onclick = (e) => snapshot(e.target);
ELEMENTS.othPlayer.onclick = (e) => snapshot(e.target);
ELEMENTS.myPlayer.oncontextmenu = recordHandle
ELEMENTS.othPlayer.oncontextmenu = recordHandle
ELEMENTS.getStreamBtn.onclick = e => getStream(e.target)
ELEMENTS.newID.onchange = (e) => {
  pr.init(e.target.value.trim());
  e.target.value = ""
}
ELEMENTS.loginBtn.onclick = e => {
  e.target.disabled = true
  db.user ? db.logout() : db.login(ELEMENTS.email.value, ELEMENTS.password.value)
}
ELEMENTS.callBtn.onclick = async (e) => {
  const stream = md.streams["ME"] || await md.getUserMedia("ME", { video: { facingMode: "user" }, audio: true });
  if (stream) {
    pr.makeCall(ELEMENTS.remoteID.value.trim(), stream);
    ELEMENTS.myPlayer.srcObject = stream;
  }
}
ELEMENTS.saveFileBtn.onclick = () => {
  const fname = ELEMENTS.fileName.value.trim()
  const pv = el("previewItem")
  if (db.user && fname) {
    if (!pv.ftype || pv.ftype.includes("text")) {
      const blob = new Blob([pv.value.trim()])
      cr.encryptFile(blob, true, txt => {
        const f = { name: fname, type: pv.ftype || "text/plain", content: txt, size: blob.size }
        if (pv.doc) f.id = pv.doc
        db.saveFile(f)
      })
    } else {
      db.saveFile({ name: fname, id: pv.doc })
    }
  }
}

const init = () => {
  for (const x of ELEMENTS.logo) x.onclick = e => loadTheme(true);
  ELEMENTS.autoSaveLocalCheck.checked = localStorage.getItem("asl") === "true" ? true : false;
  ELEMENTS.autoSaveDBCheck.checked = localStorage.getItem("asdb") === "true" ? true : false;
  loadTheme()
  cr.updateKey(ELEMENTS.encKey.value)
  db.checkAuth()
};
init();