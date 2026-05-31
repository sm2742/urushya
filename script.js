import { Notify, Crypt, Peering, Talk, MediaFile } from "/modules.js";

const el = (x) => document.getElementById(x);
const ELEMENTS = {
  notificationSpan: el("notificationSpan"),
  logo: document.getElementsByClassName("logo"),myID: el("myID"),
  connPeer: el("connPeer"),callPeer: el("callPeer"),
  screenCheck: el("screenCheck"),audioCheck: el("audioCheck"),
  videoCheck: el("videoCheck"),faceCamCheck: el("faceCamCheck"),
  autoSaveLocalCheck: el("autoSaveLocalCheck"),
  autoSaveDBCheck: el("autoSaveDBCheck"),
  getStreamBtn: el("getStreamBtn"),newID: el("newID"),
  remoteID: el("remoteID"),connBtn: el("connBtn"),
  callBtn: el("callBtn"),myPlayer: el("myPlayer"),
  othPlayer: el("othPlayer"),encpass: el("encpass"),
  messages: el("messages"),fileInput: el("fileInput"),
  textInput: el("textInput"),sendBtn: el("sendBtn"),
  sendForm: el("sendForm"),botSendForm: el("botSendForm"),
  botMessages: el("botMessages"),botFileInput: el("botFileInput"),
  botTextInput: el("botTextInput"),voiceChatBtn: el("voiceChatBtn"),
  email: el("email"),password: el("password"),loginBtn: el("loginBtn"),
};
const nf = new Notify(ELEMENTS.notificationSpan, "/notify.mp3");
const cr = new Crypt((msg) => nf.notify(msg, null, 4000));
const pr = new Peering((msg) => nf.notify(msg, null, 4000));
const tk = new Talk((msg) => nf.notify(msg, null, 4000));
const md = new MediaFile((msg) => nf.notify(msg, null, 4000));

const generateSaveBtns = (filename, filedata) => {
  const link = document.createElement("a");
  link.download = filename;
  link.href =
    typeof filedata === "string" ? filedata : URL.createObjectURL(filedata);
  const btn1 = document.createElement("button");
  btn1.innerText = "Save local";
  btn1.classList.add("btn", "pointer", "prim-bg");
  btn1.onclick = () => link.click();
  ELEMENTS.autoSaveLocalCheck.checked && btn1.click();
  // if (db.auth.currentUser) {
  //     const btn2 = document.createElement("button")
  //     btn2.innerText = "Save DB"
  //     btn2.classList.add("btn", "pointer", "prim-bg")
  //     btn2.onclick = () => cr.encryptFile(filedata, true, txt => { db.createDocument("files", { name: filename, data: txt }) })
  //     ELEMENTS.autoSaveDBCheck.checked && db.auth.currentUser && btn2.click()
  //   const dv = document.createElement("div")
  //   dv.classList.add("flex")
  //     dv.append(btn1, btn2)
  //     return dv
  // }
  return btn1;
};
const snapshot = (player) => {
  const canvas = document.createElement("canvas");
  canvas.height = player.videoHeight;
  canvas.width = player.videoWidth;
  canvas.style.maxHeight = "20vh";
  canvas.getContext("2d").drawImage(player, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    const btns = generateSaveBtns(`Img-${Date.now()}.png`, blob);
    const div = document.createElement("div");
    div.classList.add("flex", "flex-column");
    div.append(canvas, btns);
    nf.notify("Snapshot Captured", div, 5000);
  });
};
const addFile = (from, container, fname, fsize, fdata) => {
  const x = document.createElement("div");
  x.innerText = `${from}: ${fname} (${fsize} Bytes) `;
  x.append(generateSaveBtns(fname, fdata));
  container.append(x);
  container.scrollTop = container.scrollHeight;
};
const addMessage = (from, data, bot = false) => {
  const dataJSON = JSON.parse(data);
  const msgDiv = bot ? ELEMENTS.botMessages : ELEMENTS.messages;
  if (dataJSON.text) {
    const x = document.createElement("div");
    x.innerText = from + ": " + dataJSON.text;
    msgDiv.append(x);
    msgDiv.scrollTop = msgDiv.scrollHeight;
  }
  if (dataJSON.file) {
    bot
      ? addFile(
        from,
        msgDiv,
        dataJSON.file.name,
        dataJSON.file.size,
        dataJSON.file.content,
      )
      : cr.decryptFile(dataJSON.file.content, true, (blob) => {
        addFile(from, msgDiv, dataJSON.file.name, dataJSON.file.size, blob);
      });
  }
};
const botHandle = async (txt, speak) => {
  const fl = ELEMENTS.botFileInput.files[0];
  ELEMENTS.botFileInput.value = "";
  ELEMENTS.botTextInput.value = "";
  fl
    ? addMessage("ME", JSON.stringify({
      text: txt,
      file: {
        name: fl.name,
        size: fl.size,
        content: URL.createObjectURL(fl),
      },
    }), true)
    : addMessage("ME", JSON.stringify({ text: txt, file: null }), true);
  const lower = txt.toLowerCase().replaceAll(" ", "");
  if (!lower) return;
  if (fl && lower.includes("encrypt")) {
    cr.encryptFile(fl, true, (enctxt) => {
      const blob = new Blob([enctxt]);
      let resData = {
        text: "File encrypted successfully",
        file: {
          name: fl.name + ".uru",
          size: blob.size,
          content: URL.createObjectURL(blob),
        },
      };
      addMessage("BOT", JSON.stringify(resData), true);
      speak && tk.speak(resData.text);
    });
  } else if (fl && lower.includes("decrypt")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      cr.decryptFile(e.target.result, true, (blob) => {
        let resData = {
          text: "File decrypted successfully",
          file: {
            name: fl.name.split(".uru")[0],
            size: blob.size,
            content: URL.createObjectURL(blob),
          },
        };
        addMessage("BOT", JSON.stringify(resData), true);
        speak && tk.speak(resData.text);
      });
    };
    reader.readAsText(fl);
  } else {
    let resData = { text: "unknown command" };
    addMessage("BOT", JSON.stringify(resData), true);
    speak && tk.speak(resData.text);
  }
};
const chatHandle = () => {
  const fl = ELEMENTS.fileInput.files[0];
  const tx = ELEMENTS.textInput.value.trim();
  if (fl) {
    cr.encryptFile(fl, true, (txt) => {
      const data = JSON.stringify({
        text: tx,
        file: { name: fl.name, size: fl.size, content: txt },
      });
      pr.send(data);
      addMessage("ME", data);
    });
  } else if (tx) {
    const data = JSON.stringify({ text: tx, file: null });
    pr.send(data);
    addMessage("ME", data);
  }
  ELEMENTS.textInput.value = "";
  ELEMENTS.fileInput.value = "";
};
const recordHandle = e => {
  e.preventDefault();
  if (e.target.srcObject) {
    md.mediaRecorders[e.target.id]
      ? md.mediaRecorders[e.target.id].stop()
      : md.recordStream(e.target.id, e.target.srcObject);
  }
}
const getStream = async e => {
  if (e.target.innerText === "Start") {
    if (ELEMENTS.screenCheck.checked) {
      const stream = await md.getDisplayMedia("ME", {
        video: ELEMENTS.videoCheck.checked,
        audio: ELEMENTS.audioCheck.checked,
      });
      ELEMENTS.myPlayer.srcObject = stream;
      e.target.innerText = "Stop";
    } else {
      const stream = await md.getUserMedia("ME", {
        video: ELEMENTS.videoCheck.checked
          ? {
            facingMode: ELEMENTS.faceCamCheck.checked
              ? "user"
              : "environment",
          }
          : false,
        audio: ELEMENTS.audioCheck.checked,
      });
      ELEMENTS.myPlayer.srcObject = stream;
      e.target.innerText = "Stop";
    }
  } else {
    md.mediaRecorders["myPlayer"] && md.mediaRecorders["myPlayer"].stop();
    md.stopStream("ME");
    e.target.innerText = "Start";
  }
};

md.onRecStop = (blob) => {
  nf.notify(
    `File size: ${blob.size} Bytes`,
    generateSaveBtns(`Rec-${Date.now()}.mp4`, blob),
    5000,
  );
};
pr.onPeerOpen = (id) => {
  ELEMENTS.myID.innerText = id;
  ELEMENTS.myID.classList.add("pointer");
  ELEMENTS.myID.onclick = () => navigator.clipboard.writeText(id);
  ELEMENTS.callBtn.disabled = false;
  ELEMENTS.connBtn.disabled = false;
  ELEMENTS.callBtn.classList.add("pointer");
  ELEMENTS.connBtn.classList.add("pointer");
};
pr.onConnData = addMessage;
pr.onCallStream = (id, stream) => {
  ELEMENTS.othPlayer.srcObject = stream;
  ELEMENTS.callPeer.innerText = id;
};
pr.onInCall = async (id) => {
  if (window.confirm(`${id} is calling`)) {
    const stream =
      md.streams["ME"] ||
      (await md.getUserMedia("ME", {
        video: { facingMode: "user" },
        audio: true,
      }));
    pr.answerCall(stream);
    ELEMENTS.myPlayer.srcObject = stream;
  }
};
pr.onConnOpen = (id) => {
  ELEMENTS.connPeer.innerText = id;
  ELEMENTS.sendBtn.disabled = false;
  ELEMENTS.sendBtn.classList.add("pointer");
};
pr.onConnClose = () => {
  ELEMENTS.connPeer.innerText = "";
  ELEMENTS.sendBtn.disabled = true;
  ELEMENTS.sendBtn.classList.remove("pointer");
  nf.notify("Connection closed", null, 4000);
};
pr.onCallClose = () => {
  ELEMENTS.callPeer.innerText = "";
  md.mediaRecorders["othPlayer"] && md.mediaRecorders["othPlayer"].stop();
  nf.notify("Call closed", null, 4000);
};
tk.recognition.continuous = true;
tk.onRecStart = (e) => (ELEMENTS.voiceChatBtn.innerText = "Stop");
tk.onRecEnd = (e) => {
  ELEMENTS.voiceChatBtn.innerText = "Talk";
  nf.notify("Voice recognition stopped", null, 4000);
};
tk.onRecResult = (e) => {
  const x = e.results[e.resultIndex][0];
  x.confidence > 0.7 && botHandle(x.transcript, true);
};
// db.onAuthChanged(async user => {
//     if (user) {
//         ELEMENTS.loginBtn.innerText = "Logout"
//         ELEMENTS.email.classList.add("d-none")
//         ELEMENTS.password.classList.add("d-none")
//     } else {
//         ELEMENTS.loginBtn.innerText = "Login"
//         ELEMENTS.email.classList.remove("d-none")
//         ELEMENTS.password.classList.remove("d-none")
//     }
// })
// ELEMENTS.loginBtn.onclick = async e => {
//     if (db.auth.currentUser) {
//         await db.logoutUser()
//         nf.notify(`logged out`, null, 4000)
//     } else {
//         const me = await db.loginUser(ELEMENTS.email.value, ELEMENTS.password.value)
//         nf.notify(`logged in as ${me.email}`, null, 4000)
//     }
// }
ELEMENTS.encpass.onchange = (e) => cr.updatePass(e.target.value.trim())
ELEMENTS.botTextInput.onchange = (e) => botHandle(e.target.value.trim());
ELEMENTS.connBtn.onclick = (e) => pr.connectChat(ELEMENTS.remoteID.value.trim())
ELEMENTS.textInput.onchange = chatHandle
ELEMENTS.sendBtn.onclick = chatHandle
ELEMENTS.voiceChatBtn.onclick = (e) => e.target.innerText === "Talk" ? tk.start() : tk.stop()
ELEMENTS.autoSaveLocalCheck.onchange = (e) => localStorage.setItem("asl", e.target.checked);
ELEMENTS.autoSaveDBCheck.onchange = (e) => localStorage.setItem("asdb", e.target.checked);
ELEMENTS.myPlayer.onclick = (e) => snapshot(e.target);
ELEMENTS.othPlayer.onclick = (e) => snapshot(e.target);
ELEMENTS.myPlayer.oncontextmenu = recordHandle
ELEMENTS.othPlayer.oncontextmenu = recordHandle
ELEMENTS.getStreamBtn.onclick = getStream
ELEMENTS.newID.onchange = (e) => {
  pr.init(e.target.value.trim());
  e.target.value = ""
}
ELEMENTS.callBtn.onclick = async (e) => {
  const stream =
    md.streams["ME"] ||
    (await md.getUserMedia("ME", {
      video: { facingMode: "user" },
      audio: true,
    }));
  pr.makeCall(ELEMENTS.remoteID.value.trim(), stream);
  ELEMENTS.myPlayer.srcObject = stream;
};

const init = () => {
  for (const x of ELEMENTS.logo) x.onclick = () => (window.location.href = "/");
  ELEMENTS.autoSaveLocalCheck.checked =
    localStorage.getItem("asl") === "true" ? true : false;
  ELEMENTS.autoSaveDBCheck.checked =
    localStorage.getItem("asdb") === "true" ? true : false;
};
init();