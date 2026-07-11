export class Notify {
  constructor(notificationSpan, audioFile) {
    if (!notificationSpan) { throw new Error("Notify: Notification element is required.") }
    if (audioFile) { this.sound = new Audio(audioFile) }
    this.timeout = null;
    this.notificationSpan = notificationSpan;
  }
  notify(msg, body, timeoutms) {
    if (!msg || !this.notificationSpan) return
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.sound) {
      this.sound.currentTime = 0
      this.sound.play().catch(e => { })
    }
    this.notificationSpan.innerText = msg;
    this.notificationSpan.classList.remove("d-none");
    if (timeoutms)
      this.timeout = setTimeout(() => this.notificationSpan.classList.add("d-none"), timeoutms);
    if (body) {
      body.style.maxHeight = "35vh";
      this.notificationSpan.append(body);
    }
  }
}
export class Crypt {
  static baseStr =
    "CDE\\yzABFGvwx~!@#$%^&*()_+-678RSTUVWX}{[]\"ghijklYZ12345M90 `:;HIJKL=|mnopqPQNOdefabcrstu'?><,./";
  constructor(notify) {
    if (!notify) { throw new Error("Crypt: Notification callback is required.") }
    this.notify = notify;
  }
  updateKey(key) {
    this.key = ""
    if (!key || typeof key !== "string") { return this.notify("Crypt: Enter a valid encryption key.") }
    if (key.length < 3 || key.length > 30) { return this.notify("Crypt: Encryption key must be 3 to 30 chars long.") }
    this.key = key;
    const regex = new RegExp(`[${key}]`, "g");
    this.str1 = Crypt.baseStr.replace(regex, "") + key;
    this.str2 = this.str1.slice(key.length) + this.str1.slice(0, key.length);
  }
  encryptText(txt) {
    if (!this.key) { throw new Error("Crypt: Please set an encryption key.") }
    if (!txt || typeof txt !== "string") { throw new Error("Crypt: Unsupported Data Type.") }
    let enc = "";
    for (let i = 0; i < txt.length; i++) enc += this.str2[this.str1.indexOf(txt[i])];
    return enc;
  }
  decryptText(txt) {
    if (!this.key) { throw new Error("Crypt: Please set an encryption key.") }
    if (!txt || typeof txt !== "string") { throw new Error("Crypt: Unsupported Data Type.") }
    let dec = "";
    for (let i = 0; i < txt.length; i++) dec += this.str1[this.str2.indexOf(txt[i])];
    return dec;
  }
  async compressFile(blob) {
    try {
      const readableStream = blob.stream();
      const compressedStream = readableStream.pipeThrough(new CompressionStream("deflate"));
      return await new Response(compressedStream).blob();
    } catch (e) { throw e }
  }
  async decompressFile(blob) {
    try {
      const readableStream = blob.stream();
      const decompressedStream = readableStream.pipeThrough(new DecompressionStream("deflate"));
      return await new Response(decompressedStream).blob();
    } catch (e) { throw e }
  }
  async encryptFile(file, compression, cb) {
    if (!cb) { return this.notify("Crypt: Callback is required.") }
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          cb(this.encryptText(e.target.result));
        } catch (e) { this.notify(e.message || e.error || e) }
      }
      if (compression) {
        const compressed = await this.compressFile(file);
        reader.readAsDataURL(compressed);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (e) { this.notify(e.message || e.error || e) }
  }
  async decryptFile(text, compression, cb) {
    if (!cb) { return this.notify("Crypt: Callback is required.") }
    try {
      const fileText = this.decryptText(text);
      if (!fileText.startsWith("data:")) { return this.notify("Incorrect encryption key.") }
      const res = await fetch(fileText);
      const blob = await res.blob();
      if (compression) {
        const decompressed = await this.decompressFile(blob);
        cb(decompressed);
      } else {
        cb(blob);
      }
    } catch (e) { this.notify(e.message || e.error || e) }
  }
}
export class Peering {
  constructor(notify) {
    if (!notify) { throw new Error("Peering: Notification callback is required.") }
    this.notify = notify;
  }
  reset() {
    this.peer?.destroy();
    this.myid = null;
    this.conn = null;
    this.call = null;
  }
  init(id = null, options = null) {
    this.myid && this.reset();
    try {
      this.peer = new Peer(id, options);
      this.peer.on("open", (id) => {
        this.myid = id;
        this.onPeerOpen && this.onPeerOpen(id);
      });
      this.peer.on("disconnected", (id) => this.notify(`${id} disconnected.`));
      this.peer.on("error", (e) => { this.notify(e.message || e.error || e) });
      this.peer.on("close", () => {
        this.reset();
        this.notify("Peer closed.");
      });
      this.peer.on("connection", (conn) => {
        this._handleconn(conn);
        this.notify(`${conn.peer} wants to chat.`);
      });
      this.peer.on("call", (call) => {
        this._handlecall(call);
        this.onInCall && this.onInCall(call.peer);
      });
      // peer.listAllPeers(callback) peer.disconnect() peer.reconnect()
    } catch (e) { return this.notify(e.message || e.error || e) }
  }
  connectChat = (id) => {
    if (this.myid && id) {
      const conn = this.peer?.connect(id);
      this._handleconn(conn);
    }
  };
  makeCall = (id, stream) => {
    if (this.myid && id && stream) {
      const call = this.peer?.call(id, stream);
      this._handlecall(call);
    }
  };
  answerCall = (stream) => this.myid && this.call && stream && this.call.answer(stream);
  send = (data) => this.myid && this.conn && data && this.conn.send(data);

  _handleconn(conn) {
    conn.on("data", (data) => {
      this.onConnData && this.onConnData(conn.peer, data);
    });
    conn.on("open", () => {
      this.conn = conn;
      this.onConnOpen && this.onConnOpen(conn.peer);
    });
    conn.on("close", () => {
      this.conn = null;
      this.onConnClose && this.onConnClose();
    });
    conn.on("error", (e) => { this.notify(e.message || e.error || e) });
    conn.on("iceStateChanged", (state) => this.notify(state));
    // conn.close()
  }
  _handlecall(call) {
    call.on("stream", (stream) => {
      this.onCallStream && this.onCallStream(call.peer, stream);
    });
    call.on("close", () => {
      this.call = null;
      this.onCallClose && this.onCallClose();
    });
    call.on("error", (e) => { this.notify(e.message || e.error || e); });
    this.call = call;
    // call.close()
  }
}
export class Talk {
  constructor(notify) {
    if (!notify) { throw new Error("Talk: Notification callback is required.") }
    this.notify = notify;
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.synth = window.speechSynthesis;
    if (!this.SpeechRecognition || !this.synth) { return this.notify("Voice assistance not available.") }
    const recognition = new SpeechRecognition();
    recognition.onstart = (e) => {
      this.onRecStart && this.onRecStart(e);
    };
    recognition.onend = (e) => {
      this.onRecEnd && this.onRecEnd(e);
    };
    recognition.onspeechstart = (e) => {
      this.onSpeechStart && this.onSpeechStart(e);
    };
    recognition.onspeechend = (e) => {
      this.onSpeechEnd && this.onSpeechEnd(e);
    };
    recognition.onresult = (e) => {
      this.onRecResult && this.onRecResult(e);
    };
    recognition.onnomatch = (e) => this.notify("Please say it again.");
    recognition.onerror = (e) => this.notify(e.message || e.error || e);
    this.recognition = recognition;
    this.synth.onvoiceschanged = this.loadVoices;
  }
  async localLang(lang = "en-US") {
    if (!this.SpeechRecognition) return
    const stat = await this.SpeechRecognition.available({
      langs: [lang],
      processLocally: true,
    });
    if (stat === "unavailable") {
      this.notify(`${lang} is not available to download`);
    } else if (result === "available") {
      this.recognition?.start();
    } else {
      const dlStat = await this.SpeechRecognition.install({
        langs: [lang],
        processLocally: true,
      });
      if (dlStat) {
        this.notify(
          `${lang} language pack downloaded. Start recognition again.`,
        );
      } else {
        this.notify(
          `${lang} language pack failed to download. Try again later.`,
        );
      }
    }
  }
  loadVoices() { this.voices = this.synth?.getVoices() }
  speak(txt) {
    if (!txt || !this.synth) return
    this.synth.speaking && this.synth.cancel();
    const utter = new SpeechSynthesisUtterance(txt);
    if (this.voice && this.voices) {
      for (const voice of this.voices) {
        if (voice.name === this.voice) {
          utter.voice = voice;
        }
      }
    }
    if (this.pitch) {
      utter.pitch = this.pitch;
    }
    if (this.rate) {
      utter.rate = this.rate;
    }
    if (this.onPause) {
      utter.onpause = this.onPause;
    }
    if (this.onEnd) {
      utter.onend = this.onEnd;
    }
    this.synth.speak(utter);
  }
  start() {
    if (this.recognition) {
      this.recognition.continuous = true
      this.recognition.start();
    }
  }
  stop() {
    this.recognition?.stop();
    this.synth?.speaking && this.synth.cancel();
  }
}
export class Media {
  constructor(notify) {
    if (!notify) { throw new Error("Media: Notification callback is required.") }
    this.notify = notify
    this.mediaDevices = navigator.mediaDevices;
    if (!this.mediaDevices) { this.notify("Media: Recording not supported") }
    this.streams = {};
    this.mediaRecorders = {};
  }
  async getUserMedia(id, constraints) {
    if (!this.mediaDevices?.getUserMedia) { return this.notify("Media: Media recording not supported.") }
    if (!id || !constraints) { return this.notify("Media: Please provide stream id and media constraints.") }
    try {
      this.streams[id] && this.stopStream(id);
      let stream = await this.mediaDevices.getUserMedia(constraints);
      this.streams[id] = stream;
      return stream;
    } catch (e) { this.notify(e.message || e.error || e) }
  }
  async getDisplayMedia(id, constraints) {
    if (!this.mediaDevices?.getDisplayMedia) { return this.notify("Media: Screen recording not supported.") }
    if (!id || !constraints) { return this.notify("Media: Please provide stream id and media constraints.") }
    try {
      this.streams[id] && this.stopStream(id);
      let stream = await this.mediaDevices.getDisplayMedia(constraints);
      this.streams[id] = stream;
      return stream;
    } catch (e) { this.notify(e.message || e.error || e) }
  }
  recordStream(id, stream) {
    if (!id || !stream) { return this.notify("Media: Please provide an id and media stream.") }
    let chunks = [];
    try {
      let mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = (e) => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        this.mediaRecorders[id] = null;
        this.onRecStop && this.onRecStop(blob);
      };
      mediaRecorder.start();
      this.mediaRecorders[id] = mediaRecorder;
    } catch (e) { this.notify(e.message || e.error || e) }
  }
  stopStream(id) {
    if (!id || !this.streams[id]) return
    this.streams[id].getTracks().forEach((track) => track.stop());
    this.streams[id] = null;
  }
  addTrack(streamID, track) {
    if (!streamID || !track) { return this.notify("Media: Please provide stream id and track.") }
    this.streams[streamID]?.addTrack(track);
  }
  removeTrack(streamID, track) {
    if (!streamID || !track) { return this.notify("Media: Please provide stream id and track.") }
    this.streams[streamID]?.removeTrack(track);
  }
}
export class Database {
  constructor(baseURL, notify) {
    if (!notify) { throw new Error("Database: Notification callback is required.") }
    this.baseURL = baseURL || window.location.origin
    this.notify = notify
    this._updateUser(null)
  }
  _updateUser(user) {
    if (!user && !this.user) return
    this.user = user
    this.onAuthChanged && this.onAuthChanged(user)
  }
  logout = () => {
    localStorage.removeItem("auth")
    this._updateUser(null)
    this.notify("logged out")
  }
  async checkAuth() {
    const token = localStorage.getItem("auth")
    if (token) {
      try {
        const res = await fetch(`${this.baseURL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const body = await res.json()
        if (res.ok) return this._updateUser(body)
        this.notify(body.message || body.error || "Database: Something went wrong.")
      } catch (e) { this.notify(e.message || e.error || e) }
    }
    this._updateUser(null)
  }
  async login(email, password) {
    if (!email || !password) { return this.notify("Login: Email and password are required.") }
    try {
      const res = await fetch(`${this.baseURL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      })
      const body = await res.json()
      if (res.ok) {
        localStorage.setItem("auth", body.token)
        this._updateUser(body.user)
        return this.notify(`logged in as ${body.user.email}`)
      }
      this.notify(body.message || body.error || "Database: Something went wrong.")
    } catch (e) { this.notify(e.message || e.error || e) }
  }
  async saveFile(file = { name, type, content, size, id }) {
    try {
      const url = file.id ? `${this.baseURL}/files/${file.id}` : `${this.baseURL}/files`
      const res = await fetch(url, {
        method: file.id ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(file)
      })
      const body = await res.json()
      this.notify(body.message || body.error || "Database: Something went wrong.")
    } catch (e) { this.notify(e.message || e.error || e) }
  }
  async getFiles(query) {
    try {
      const url = query ? `${this.baseURL}/files/?search=${encodeURIComponent(query)}` : `${this.baseURL}/files`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth")}`
        }
      })
      const body = await res.json()
      if (res.ok) {
        return body.files
      }
      this.notify(body.message || body.error || "Database: Something went wrong.")
    } catch (e) { this.notify(e.message || e.error || e) }
  }
  async getFile(id) {
    if (!id) { return this.notify("Get File: File ID is required.") }
    try {
      const res = await fetch(`${this.baseURL}/files/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth")}`
        }
      })
      const body = await res.json()
      if (res.ok) {
        return body
      }
      this.notify(body.message || body.error || "Database: Something went wrong.")
    } catch (e) { this.notify(e.message || e.error || e) }
  }
  async deleteFile(id) {
    if (!id) { return this.notify("Delete File: File ID is required.") }
    try {
      const res = await fetch(`${this.baseURL}/files/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth")}`
        }
      })
      const body = await res.json()
      this.notify(body.message || body.error || "Database: Something went wrong.")
    } catch (e) { this.notify(e.message || e.error || e) }
  }
}