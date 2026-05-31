export class Notify {
  constructor(notificationSpan, audioFile) {
    this.sound = new Audio(audioFile);
    this.timeout = null;
    this.notificationSpan = notificationSpan;
  }
  notify(msg, body, timeoutms) {
    this.sound.pause();
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.notificationSpan.innerText = msg;
    this.sound.play();
    this.notificationSpan.classList.remove("d-none");
    if (timeoutms)
      this.timeout = setTimeout(
        () => this.notificationSpan.classList.add("d-none"),
        timeoutms,
      );
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
    this.notify = notify;
  }
  updatePass(pass) {
    if (!pass || typeof pass !== "string") { return this.notify("Enter a valid passkey") }
    if (pass.length <= 2 || pass.length >= 91) { return this.notify("Passkey must be 3 to 90 chars long") }
    this.pass = pass;
    const regex = new RegExp(`[${this.pass}]`, "g");
    this.str1 = Crypt.baseStr.replace(regex, "") + this.pass;
    const pl = this.pass.length;
    this.str2 = this.str1.slice(pl) + this.str1.slice(0, pl);
  }
  encryptText(txt) {
    if (!this.pass) { throw new Error("Please set a passkey.") }
    if (!txt || typeof txt !== "string") { throw new Error("Unsupported Data Type") }
    let enc = "";
    for (let i = 0; i < txt.length; i++)
      enc += this.str2[this.str1.indexOf(txt[i])];
    return enc;
  }
  decryptText(txt) {
    if (!this.pass) { throw new Error("Please set a passkey.") }
    if (!txt || typeof txt !== "string") { throw new Error("Unsupported Data Type") }
    let dec = "";
    for (let i = 0; i < txt.length; i++)
      dec += this.str1[this.str2.indexOf(txt[i])];
    return dec;
  }
  async compressFile(blob) {
    try {
      const readableStream = blob.stream();
      const compressedStream = readableStream.pipeThrough(
        new CompressionStream("gzip"),
      );
      return await new Response(compressedStream).blob();
    } catch (e) {
      throw e
    }
  }
  async decompressFile(blob) {
    try {
      const readableStream = blob.stream();
      const decompressedStream = readableStream.pipeThrough(
        new DecompressionStream("gzip"),
      );
      return await new Response(decompressedStream).blob();
    } catch (e) {
      throw e
    }
  }
  async encryptFile(file, compression, cb) {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          cb(this.encryptText(e.target.result));
        } catch (e) {
          this.notify(e.message || e.error || e)
        }
      }
      if (compression) {
        const compressed = await this.compressFile(file);
        reader.readAsDataURL(compressed);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (e) {
      this.notify(e.message || e.error || e)
    }
  }
  async decryptFile(text, compression, cb) {
    try {
      const fileText = this.decryptText(text);
      if (!fileText.startsWith("data:")) {
        return this.notify("Incorrect passkey.")
      }
      const res = await fetch(fileText);
      const blob = await res.blob();
      if (compression) {
        const decompressed = await this.decompressFile(blob);
        cb(decompressed);
      } else {
        cb(blob);
      }
    } catch (e) {
      this.notify(e.message || e.error || e)
    }
  }
}
export class Peering {
  constructor(notify) {
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
    } catch (e) {
      return this.notify(e.message || e.error || e);
    }
    this.peer.on("open", (id) => {
      this.myid = id;
      this.onPeerOpen && this.onPeerOpen(id);
    });
    this.peer.on("disconnected", (id) => this.notify(`${id} disconnected`));
    this.peer.on("error", (e) => {
      this.notify(e.message || e.error || e);
    });
    this.peer.on("close", () => {
      this.reset();
      this.notify("Peer closed");
    });
    this.peer.on("connection", (conn) => {
      this._handleconn(conn);
      this.notify(`${conn.peer} wants to chat`);
    });
    this.peer.on("call", (call) => {
      this._handlecall(call);
      this.onInCall && this.onInCall(call.peer);
    });
    // peer.listAllPeers(callback) peer.disconnect() peer.reconnect()
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
  answerCall = (stream) =>
    this.myid && this.call && stream && this.call.answer(stream);
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
    conn.on("error", (e) => {
      this.notify(e.message || e.error || e);
    });
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
    call.on("error", (e) => {
      this.notify(e.message || e.error || e);
    });
    this.call = call;
    // call.close()
  }
}
export class Talk {
  constructor(notify) {
    this.notify = notify;
    this.SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.synth = window.speechSynthesis;
    if (!this.SpeechRecognition || !this.synth) {
      return this.notify("Voice assistance not available");
    }
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
    recognition.onnomatch = (e) => this.notify("Please say it again");
    recognition.onerror = (e) => this.notify(e.message || e.error || e);
    this.recognition = recognition;
    this.synth.onvoiceschanged = this.loadVoices;
  }
  async localLang(lang = "en-US") {
    const stat = await this.SpeechRecognition?.available({
      langs: [lang],
      processLocally: true,
    });
    if (stat === "unavailable") {
      this.notify(`${lang} is not available to download`);
    } else if (result === "available") {
      this.recognition?.start();
    } else {
      const dlStat = await this.SpeechRecognition?.install({
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
  loadVoices() {
    this.voices = this.synth?.getVoices();
  }
  speak(txt) {
    this.synth?.speaking && this.synth.cancel();
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
    this.synth?.speak(utter);
  }
  start() {
    this.recognition?.start();
  }
  stop() {
    this.recognition?.stop();
    this.synth?.speaking && this.synth.cancel();
  }
}
export class MediaFile {
  constructor(notify) {
    this.mediaDevices = navigator.mediaDevices;
    if (!this.mediaDevices) {
      return notify("Media recording not supported");
    }
    this.streams = {};
    this.mediaRecorders = {};
  }
  async getUserMedia(id, constraints) {
    this.streams[id] && this.stopStream(id);
    let stream = await this.mediaDevices?.getUserMedia(constraints);
    this.streams[id] = stream;
    return stream;
  }
  async getDisplayMedia(id, constraints) {
    this.streams[id] && this.stopStream(id);
    let stream = await this.mediaDevices?.getDisplayMedia(constraints);
    this.streams[id] = stream;
    return stream;
  }
  recordStream(id, stream) {
    let chunks = [];
    let mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = (e) => {
      const blob = new Blob(chunks);
      this.mediaRecorders[id] = null;
      this.onRecStop && this.onRecStop(blob);
    };
    mediaRecorder.start();
    this.mediaRecorders[id] = mediaRecorder;
  }
  stopStream(id) {
    this.streams[id]?.getTracks().forEach((track) => track.stop());
    this.streams[id] = null;
  }
  addTrack(streamID, track) {
    this.streams[streamID]?.addTrack(track);
  }
  removeTrack(streamID, track) {
    this.streams[streamID]?.removeTrack(track);
  }
}
