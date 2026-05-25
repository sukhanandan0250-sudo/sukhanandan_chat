import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import useConversation from "../context/useConversation";
import "./chat.css";

const icons = {
  chats: "M4 5h16v10H8l-4 4V5zm5 4h7M9 12h5",
  call: "M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.4.6 3.6.6.5 0 .9.4.9.9V20c0 .5-.4.9-.9.9C10.7 20.9 3.1 13.3 3.1 3.9c0-.5.4-.9.9-.9h3.6c.5 0 .9.4.9.9 0 1.2.2 2.5.6 3.6.1.4 0 .8-.3 1.1l-2.2 2.2z",
  video: "M4 7h11v10H4V7zm11 3 5-3v10l-5-3",
  search: "M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21l-5.2-5.2A7.5 7.5 0 0 1 10.5 18z",
  menu: "M12 5.5v.01M12 12v.01M12 18.5v.01",
  plus: "M12 5v14M5 12h14",
  attach: "M21 11.5 12.2 20.3a5 5 0 0 1-7.1-7.1l9.2-9.2a3.2 3.2 0 0 1 4.5 4.5l-9.3 9.3a1.6 1.6 0 1 1-2.3-2.3l8.6-8.6",
  mic: "M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm7-3a7 7 0 0 1-14 0M12 18v3M8 21h8",
  send: "M4 12 20 4l-5 16-3-7-8-1z",
  image: "M4 5h16v14H4V5zm3 10 3.5-4 3 3.5L16 12l3 3M8 9h.01",
  file: "M7 3h7l5 5v13H7V3zm7 0v5h5M10 13h6M10 17h6",
  audio: "M9 18V6l10-2v12M9 18a3 3 0 1 1-2-2.8M19 16a3 3 0 1 1-2-2.8",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  close: "M6 6l12 12M18 6 6 18",
  phoneOff: "M10.7 6.3 8.1 3.7A1.8 1.8 0 0 0 6.8 3H4.6c-.9 0-1.6.7-1.6 1.6 0 9 7.4 16.4 16.4 16.4.9 0 1.6-.7 1.6-1.6v-2.2c0-.6-.3-1.1-.8-1.4l-3-1.5c-.6-.3-1.3-.2-1.8.3l-1.2 1.2a12.9 12.9 0 0 1-6-6l1.2-1.2c.5-.5.6-1.3.3-1.9zM4 4l16 16",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M16 11h6"
};

const Icon = ({ name, size = 22 }) => (
  <svg className="ui-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d={icons[name]} />
  </svg>
);

const Chat = () => {
  const {
    selectedconversation,
    setSelectedconversation,
    messages,
    setMessages,
    currentUser,
    setCurrentUser
  } = useConversation();
  const [users, setUsers] = useState([]);
  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaNotice, setMediaNotice] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState("audio");
  const [incomingCall, setIncomingCall] = useState(null);
  const [callPeer, setCallPeer] = useState(null);
  const [sidebarView, setSidebarView] = useState("chats");
  const [callHistory, setCallHistory] = useState(() => JSON.parse(localStorage.getItem("callHistory") || "[]"));
  const [typingUser, setTypingUser] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "aurora");
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    username: "",
    email: "",
    avatarUrl: ""
  });
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);
  const fileInputRef = useRef(null);
  const addContactInputRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const searchInputRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callPeerIdRef = useRef(null);
  const activeUserRef = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const savedUser = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const activeUser = currentUser || savedUser;

  useEffect(() => {
    activeUserRef.current = activeUser;
  }, [activeUser]);

  useEffect(() => {
    const user = currentUser || savedUser;

    if (!token || !user) {
      navigate("/");
      return;
    }

    setCurrentUser(user);
    socket.emit("registerUser", user._id);

    axios.get("http://localhost:8000/user/users", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setUsers(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
      });
  }, [token, currentUser, savedUser, navigate, setCurrentUser]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("callHistory", JSON.stringify(callHistory.slice(0, 50)));
  }, [callHistory]);

  const addCallHistory = (contact, type, direction, status) => {
    if (!contact) return;
    setCallHistory(prev => [{
      id: `${Date.now()}-${Math.random()}`,
      contactId: contact._id,
      name: contact.name || contact.username || "Unknown",
      avatarUrl: contact.avatarUrl || "",
      username: contact.username || "",
      type,
      direction,
      status,
      createdAt: new Date().toISOString()
    }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (!activeUser) return;
    setProfileForm({
      name: activeUser.name || "",
      username: activeUser.username || "",
      email: activeUser.email || "",
      avatarUrl: activeUser.avatarUrl || ""
    });
  }, [activeUser]);

  useEffect(() => {
    if (!selectedconversation || !token) return;

    axios.get(`http://localhost:8000/message/get/${selectedconversation._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setMessages(res.data))
      .catch(() => setError("Could not load messages"));
  }, [selectedconversation, token, setMessages]);

  useEffect(() => {
    const receiveMessage = (msg) => {
      if (!selectedconversation || String(msg.senderId) !== String(selectedconversation._id)) return;
      setMessages(prev => [...prev, msg]);
    };

    const showTyping = ({ senderId }) => setTypingUser(senderId);
    const hideTyping = () => setTypingUser(null);

    socket.on("receiveMessage", receiveMessage);
    socket.on("showTyping", showTyping);
    socket.on("hideTyping", hideTyping);

    return () => {
      socket.off("receiveMessage", receiveMessage);
      socket.off("showTyping", showTyping);
      socket.off("hideTyping", hideTyping);
    };
  }, [selectedconversation, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
  }, [callState, incomingCall]);

  const stopCallStreams = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    remoteStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
  }, []);

  const resetCall = useCallback((message = "") => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    callPeerIdRef.current = null;
    stopCallStreams();
    setCallState("idle");
    setIncomingCall(null);
    setCallPeer(null);
    if (message) setNotice(message);
  }, [stopCallStreams]);

  const createPeerConnection = (peerId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && activeUserRef.current) {
        socket.emit("call:ice-candidate", {
          receiverId: peerId,
          senderId: activeUserRef.current._id,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreamRef.current = stream;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      setCallState("connected");
    };

    pc.onconnectionstatechange = () => {
      if (["closed", "disconnected", "failed"].includes(pc.connectionState)) {
        resetCall(pc.connectionState === "failed" ? "Call connection failed" : "");
      }
    };

    peerConnectionRef.current = pc;
    callPeerIdRef.current = peerId;
    return pc;
  };

  const getCallMedia = async (type) => {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      throw new Error("Calls are not supported in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video"
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const startCall = async (type) => {
    if (!selectedconversation || !activeUser || callState !== "idle") return;

    try {
      setCallType(type);
      setCallPeer(selectedconversation);
      setCallState("calling");
      addCallHistory(selectedconversation, type, "outgoing", "calling");
      const stream = await getCallMedia(type);
      const pc = createPeerConnection(selectedconversation._id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:start", {
        receiverId: selectedconversation._id,
        caller: activeUser,
        callType: type,
        offer
      });
    } catch (err) {
      resetCall();
      setError(err.message || "Could not start call");
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !activeUser) return;

    try {
      setCallType(incomingCall.callType);
      setCallPeer(incomingCall.caller);
      setCallState("connecting");
      const stream = await getCallMedia(incomingCall.callType);
      const pc = createPeerConnection(incomingCall.from);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:accept", {
        callerId: incomingCall.from,
        receiver: activeUser,
        answer
      });
      addCallHistory(incomingCall.caller, incomingCall.callType, "incoming", "accepted");
      setIncomingCall(null);
    } catch (err) {
      socket.emit("call:reject", { callerId: incomingCall.from, receiver: activeUser });
      resetCall();
      setError(err.message || "Could not answer call");
    }
  };

  const rejectCall = () => {
    if (incomingCall && activeUser) {
      socket.emit("call:reject", { callerId: incomingCall.from, receiver: activeUser });
      addCallHistory(incomingCall.caller, incomingCall.callType, "incoming", "declined");
    }
    resetCall();
  };

  const endCall = () => {
    if (callPeerIdRef.current && activeUser) {
      socket.emit("call:end", {
        receiverId: callPeerIdRef.current,
        senderId: activeUser._id
      });
    }
    resetCall();
  };

  useEffect(() => {
    const onIncomingCall = (payload) => {
      if (callState !== "idle") {
        socket.emit("call:reject", {
          callerId: payload.from,
          receiver: activeUserRef.current
        });
        return;
      }

      setIncomingCall(payload);
      setCallType(payload.callType);
      setCallPeer(payload.caller);
    };

    const onCallAccepted = async ({ answer, receiver }) => {
      setCallPeer(receiver);
      setCallState("connecting");
      if (peerConnectionRef.current && answer) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const onIceCandidate = async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          setError("Could not add call network candidate");
        }
      }
    };

    const onRejected = ({ receiver }) => resetCall(`${receiver?.name || "User"} declined the call`);
    const onEnded = () => resetCall("Call ended");

    socket.on("call:incoming", onIncomingCall);
    socket.on("call:accepted", onCallAccepted);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:rejected", onRejected);
    socket.on("call:ended", onEnded);

    return () => {
      socket.off("call:incoming", onIncomingCall);
      socket.off("call:accepted", onCallAccepted);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:rejected", onRejected);
      socket.off("call:ended", onEnded);
    };
  }, [callState, resetCall]);

  const attachmentCategory = (type = "") => {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    return "file";
  };

  const readAttachment = (file) => {
    const maxSize = 25 * 1024 * 1024;
    if (!file) return;
    if (file.size > maxSize) {
      setError("Files must be less than 25 MB");
      return;
    }

    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }

    setPendingAttachment({
      file,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      category: attachmentCategory(file.type)
    });
    setMediaNotice(`${file.name} ready to send`);
    setError("");
  };

  const handleFilePick = (e) => {
    readAttachment(e.target.files?.[0]);
    e.target.value = "";
    setAttachmentMenuOpen(false);
  };

  const openFilePicker = (accept) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.setAttribute("accept", accept);
    fileInputRef.current.click();
  };

  const stopMediaTracks = () => {
    audioStreamRef.current?.getTracks().forEach(track => track.stop());
    audioStreamRef.current = null;
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Audio recording is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type });
        readAttachment(file);
        stopMediaTracks();
      };

      recorder.start();
      setRecording(true);
      setMediaNotice("Recording audio...");
      setError("");
    } catch {
      stopMediaTracks();
      setError("Microphone permission is needed to record audio");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const sendMessage = async () => {
    if ((!text.trim() && !pendingAttachment) || !selectedconversation || !activeUser) return;

    try {
      let attachment = pendingAttachment;

      if (pendingAttachment?.file) {
        const formData = new FormData();
        formData.append("file", pendingAttachment.file);
        const uploadRes = await axios.post(
          "http://localhost:8000/message/upload",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data"
            }
          }
        );
        attachment = uploadRes.data;
      }

      const res = await axios.post(
        `http://localhost:8000/message/send/${selectedconversation._id}`,
        { text, attachment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      socket.emit("sendMessage", res.data);
      socket.emit("stopTyping", { receiverId: selectedconversation._id, senderId: activeUser._id });
      setMessages(prev => [...prev, res.data]);
      setText("");
      if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
      setPendingAttachment(null);
      setMediaNotice("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Message not sent");
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!selectedconversation || !activeUser) return;

    socket.emit("typing", { receiverId: selectedconversation._id, senderId: activeUser._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("stopTyping", { receiverId: selectedconversation._id, senderId: activeUser._id });
    }, 900);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
    navigate("/");
  };

  const addContact = async (e) => {
    e.preventDefault();
    const query = addQuery.trim();
    if (!query) return;

    try {
      const res = await axios.post(
        "http://localhost:8000/user/contacts",
        { query },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers(prev => prev.some(user => user._id === res.data._id) ? prev : [...prev, res.data]);
      setAddQuery("");
      setSearch("");
      setNotice(`${res.data.name} added`);
      setError("");
    } catch (err) {
      setNotice("");
      setError(err.response?.data?.message || "Could not add contact");
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.put(
        "http://localhost:8000/user/me",
        profileForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.setItem("user", JSON.stringify(res.data));
      setCurrentUser(res.data);
      setProfileOpen(false);
      setNotice("Profile updated");
      setError("");
    } catch (err) {
      setNotice("");
      setError(err.response?.data?.message || "Could not update profile");
    }
  };

  const deleteProfile = async () => {
    const ok = window.confirm("Delete your profile permanently?");
    if (!ok) return;

    try {
      await axios.delete("http://localhost:8000/user/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      logout();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete profile");
    }
  };

  const uploadAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm(prev => ({ ...prev, avatarUrl: reader.result }));
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const initials = (name = "") => name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const Avatar = ({ user, self = false }) => (
    <div className={self ? "avatar self" : "avatar"}>
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user?.name)}
    </div>
  );
  const formatTime = (date) => date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const formatBytes = (bytes = 0) => {
    if (!bytes) return "";
    const units = ["B", "KB", "MB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  };
  const renderAttachment = (attachment) => {
    const source = attachment?.data || attachment?.url || attachment?.previewUrl;
    if (!source) return null;

    if (attachment.category === "image") {
      return <img className="media-preview" src={source} alt={attachment.name || "Shared image"} />;
    }

    if (attachment.category === "video") {
      return <video className="media-preview" src={source} controls preload="metadata" />;
    }

    if (attachment.category === "audio") {
      return <audio className="audio-preview" src={source} controls />;
    }

    return (
      <a className="file-preview" href={source} download={attachment.name || "file"} target="_blank" rel="noreferrer">
        <span className="file-icon"><Icon name="file" size={24} /></span>
        <strong>{attachment.name || "Download file"}</strong>
        <span>{formatBytes(attachment.size)}</span>
      </a>
    );
  };
  const selectedTyping = typingUser && selectedconversation && String(typingUser) === String(selectedconversation._id);
  const filteredUsers = users.filter(user => {
    const needle = search.toLowerCase();
    return [user.name, user.username, user.email].some(value => (value || "").toLowerCase().includes(needle));
  });
  const themes = [
    { id: "aurora", label: "Aurora" },
    { id: "smoke", label: "Smoke" },
    { id: "midnight", label: "Midnight" },
    { id: "mint", label: "Mint" }
  ];
  const filters = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "favourites", label: "Favourites" },
    { id: "groups", label: "Groups" }
  ];
  const visibleUsers = activeFilter === "all" ? filteredUsers : [];
  const callTitle = callPeer?.name || incomingCall?.caller?.name || selectedconversation?.name || "Contact";
  const callActive = callState !== "idle" || incomingCall;

  if (!activeUser) return null;

  return (
    <div className={`chat-app theme-${theme}`}>
      <nav className="app-rail">
        <button className={sidebarView === "chats" ? "rail-button active" : "rail-button"} title="Chats" onClick={() => setSidebarView("chats")}><Icon name="chats" /></button>
        <button className={sidebarView === "calls" ? "rail-button active" : "rail-button"} title="Calls" onClick={() => setSidebarView("calls")}><Icon name="call" /></button>
        <button className="rail-button" title="Contacts" onClick={() => {
          setSidebarView("chats");
          setTimeout(() => addContactInputRef.current?.focus(), 0);
        }}><Icon name="users" /></button>
        <span className="rail-divider" />
        <button className="rail-button profile-mini" onClick={() => setProfileOpen(true)} title="Profile">
          <Avatar user={activeUser} self />
        </button>
      </nav>

      <aside className="sidebar">
        <div className="sidebar-top">
          <h1>{sidebarView === "calls" ? "Calls" : "Chats"}</h1>
          <div className="sidebar-actions">
            <button className="icon-button" onClick={() => addContactInputRef.current?.focus()} title="New chat"><Icon name="userPlus" /></button>
            <button className="icon-button" onClick={logout} title="Logout"><Icon name="menu" /></button>
          </div>
        </div>

        {sidebarView === "chats" && (
        <>
        <div className="theme-row">
          {themes.map(item => (
            <button
              key={item.id}
              className={theme === item.id ? "theme-dot active" : "theme-dot"}
              onClick={() => setTheme(item.id)}
              title={`${item.label} theme`}
            />
          ))}
        </div>

        <div className="search-box">
          <Icon name="search" size={20} />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start a new chat"
          />
        </div>

        <div className="filter-row">
          {filters.map(item => (
            <button
              key={item.id}
              className={activeFilter === item.id ? "filter-chip active" : "filter-chip"}
              onClick={() => setActiveFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button className="filter-chip icon-only" onClick={() => addContactInputRef.current?.focus()}><Icon name="plus" size={18} /></button>
        </div>

        <form className="add-contact" onSubmit={addContact}>
          <input
            ref={addContactInputRef}
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder="Add by email or username"
          />
          <button className="primary-button" type="submit">Add</button>
        </form>
        </>
        )}

        {(notice || error) && <div className={error ? "side-message error" : "side-message"}>{error || notice}</div>}

        {sidebarView === "calls" ? (
          <div className="call-history-list">
            {callHistory.length ? callHistory.map(call => (
              <button
                key={call.id}
                className="call-history-item"
                onClick={() => {
                  const user = users.find(item => item._id === call.contactId);
                  if (user) {
                    setSelectedconversation(user);
                    setSidebarView("chats");
                  }
                }}
              >
                <div className="avatar">
                  {call.avatarUrl ? <img src={call.avatarUrl} alt="" /> : initials(call.name)}
                </div>
                <div className="contact-copy">
                  <strong>{call.name}</strong>
                  <span>{call.direction} {call.type} call - {call.status}</span>
                </div>
                <time>{formatTime(call.createdAt)}</time>
              </button>
            )) : (
              <div className="empty-contacts">
                <strong>No call history</strong>
                <span>Audio and video calls will show here.</span>
              </div>
            )}
          </div>
        ) : (
        <div className="chat-list">
          {visibleUsers.length ? visibleUsers.map(u => (
            <button
              key={u._id}
              className={selectedconversation?._id === u._id ? "contact active" : "contact"}
              onClick={() => {
                setSelectedconversation(u);
                setError("");
              }}
            >
              <Avatar user={u} />
              <div className="contact-copy">
                <strong>{u.name}</strong>
                <span>@{u.username || u.email}</span>
              </div>
              <time>{formatTime(u.updatedAt || u.createdAt || Date.now())}</time>
            </button>
          )) : (
            <div className="empty-contacts">
              <strong>{activeFilter === "all" ? "No contacts yet" : "Nothing here yet"}</strong>
              <span>{activeFilter === "all" ? "Add a friend with their email or username." : "This filter will fill as your chats grow."}</span>
            </div>
          )}
        </div>
        )}
      </aside>

      <main className="chat-panel">
        {selectedconversation ? (
          <>
            <header className="chat-header">
              <button className="back-button" onClick={() => setSelectedconversation(null)}>Back</button>
              <div className="profile-chip">
                <Avatar user={selectedconversation} />
                <div>
                  <strong>{selectedconversation.name}</strong>
                  <span>{selectedTyping ? "typing..." : `@${selectedconversation.username || "contact"}`}</span>
                </div>
              </div>
              <div className="chat-actions">
                <button className="icon-button" onClick={() => startCall("video")} title="Video call"><Icon name="video" /></button>
                <button className="icon-button" onClick={() => startCall("audio")} title="Voice call"><Icon name="call" /></button>
                <button className="icon-button" onClick={() => searchInputRef.current?.focus()} title="Search"><Icon name="search" /></button>
                <button className="icon-button" onClick={() => setNotice("Contact menu coming soon")} title="Menu"><Icon name="menu" /></button>
              </div>
            </header>

            <section className="chat-messages">
              {messages.map((msg) => {
                const mine = String(msg.senderId) === String(activeUser._id);
                return (
                  <div key={msg._id} className={mine ? "message-row mine" : "message-row"}>
                    <div className="message-bubble">
                      {renderAttachment(msg.attachment)}
                      {msg.text && <span>{msg.text}</span>}
                      <small>{formatTime(msg.createdAt)}</small>
                    </div>
                  </div>
                );
              })}
              {selectedTyping && <p className="typing">typing...</p>}
              {error && <p className="chat-error">{error}</p>}
              <div ref={messagesEndRef}></div>
            </section>

            <footer className="chat-input">
              <input
                ref={fileInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                onChange={handleFilePick}
              />
              <div className="attachment-menu-wrap">
                <button className="tool-button icon-only" onClick={() => setAttachmentMenuOpen(prev => !prev)} title="Attach">
                  <Icon name="attach" />
                </button>
                {attachmentMenuOpen && (
                  <div className="attachment-menu">
                    <button onClick={() => openFilePicker("image/*")}><Icon name="image" /> Photo</button>
                    <button onClick={() => openFilePicker("video/*")}><Icon name="video" /> Video</button>
                    <button onClick={() => openFilePicker("audio/*")}><Icon name="audio" /> Audio file</button>
                    <button onClick={() => openFilePicker(".pdf,.doc,.docx,.txt,.zip,application/*")}><Icon name="file" /> Document</button>
                  </div>
                )}
              </div>
              <button
                className={recording ? "tool-button icon-only recording" : "tool-button icon-only"}
                onClick={recording ? stopRecording : startRecording}
                title={recording ? "Stop recording" : "Record audio"}
              >
                <Icon name="mic" />
              </button>
              <input
                value={text}
                onChange={handleTyping}
                placeholder="Type a message"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button className="send-button icon-only" onClick={sendMessage} disabled={!text.trim() && !pendingAttachment} title="Send">
                <Icon name="send" />
              </button>
            </footer>
            {(pendingAttachment || mediaNotice) && (
              <div className="attachment-tray">
                {pendingAttachment && renderAttachment(pendingAttachment)}
                <div>
                  <strong>{pendingAttachment?.name || mediaNotice}</strong>
                  {pendingAttachment && <span>{pendingAttachment.category} - {formatBytes(pendingAttachment.size)}</span>}
                </div>
                {pendingAttachment && (
                  <button
                    className="link-button remove-attachment"
                    onClick={() => {
                      if (pendingAttachment.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
                      setPendingAttachment(null);
                    }}
                    title="Remove"
                  >
                    <Icon name="close" size={18} />
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <section className="empty-state">
            <div className="empty-logo">RC</div>
            <h2>Real Chat</h2>
            <p>Add a contact by email or username, then start a private conversation.</p>
          </section>
        )}
      </main>

      {profileOpen && (
        <div className="modal-backdrop" onMouseDown={() => setProfileOpen(false)}>
          <form className="profile-modal" onSubmit={updateProfile} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Profile</h2>
              <button className="icon-button" type="button" onClick={() => setProfileOpen(false)}>X</button>
            </div>

            <label className="avatar-upload">
              <div className="avatar preview">
                {profileForm.avatarUrl ? <img src={profileForm.avatarUrl} alt="" /> : initials(profileForm.name)}
              </div>
              <input type="file" accept="image/*" onChange={uploadAvatar} />
              <span>Upload image</span>
            </label>

            <label>
              Name
              <input value={profileForm.name} onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))} />
            </label>

            <label>
              Username
              <input value={profileForm.username} onChange={e => setProfileForm(prev => ({ ...prev, username: e.target.value }))} />
            </label>

            <label>
              Email
              <input type="email" value={profileForm.email} onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))} />
            </label>

            <div className="modal-actions">
              <button className="danger-button" type="button" onClick={deleteProfile}>Delete</button>
              <button className="primary-button" type="submit">Save</button>
            </div>
          </form>
        </div>
      )}

      {callActive && (
        <div className="call-overlay">
          <section className={callType === "video" ? "call-card video-call" : "call-card"}>
            <div className="call-copy">
              <Avatar user={callPeer || incomingCall?.caller || selectedconversation} />
              <div>
                <strong>{callTitle}</strong>
                <span>
                  {incomingCall
                    ? `Incoming ${callType} call`
                    : callState === "calling"
                      ? `Calling ${callTitle}...`
                      : callState === "connected"
                        ? `${callType === "video" ? "Video" : "Audio"} call connected`
                        : "Connecting..."}
                </span>
              </div>
            </div>

            <div className="call-stage">
              <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline />
              <video ref={localVideoRef} className="local-video" autoPlay playsInline muted />
              {callType === "audio" && (
                <div className="audio-call-art">
                  <Avatar user={callPeer || incomingCall?.caller || selectedconversation} />
                  <p>Audio call</p>
                </div>
              )}
            </div>

            <div className="call-controls">
              {incomingCall ? (
                <>
                  <button className="call-button decline" onClick={rejectCall} title="Decline"><Icon name="phoneOff" /></button>
                  <button className="call-button accept" onClick={acceptCall} title="Accept"><Icon name={callType === "video" ? "video" : "call"} /></button>
                </>
              ) : (
                <button className="call-button decline" onClick={endCall} title="End call"><Icon name="phoneOff" /></button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Chat;
