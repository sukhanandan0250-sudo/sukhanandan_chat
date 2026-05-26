import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useConversation from "../context/useConversation";
import "./chat.css";

const Login = ()=>{
  const [mode,setMode]=useState("login");
  const [name,setName]=useState("");
  const [username,setUsername]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const navigate = useNavigate();
  const { setCurrentUser } = useConversation();

  const submit = async(e)=>{
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "login" : "signup";
      const payload = mode === "login" ? { email, password } : { name, username, email, password };
      const res = await axios.post(`/user/${endpoint}`, payload);
      localStorage.setItem("token",res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setCurrentUser(res.data.user);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return(
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-mark">RC</div>
        <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p>Sign in for private chats with photos, files, audio, and video.</p>

        {mode === "signup" && (
          <>
            <label>
              Name
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
            </label>

            <label>
              Username
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="unique username" />
            </label>
          </>
        )}

        <label>
          Email
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" type="email" />
        </label>

        <label>
          Password
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button className="primary-button" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
        </button>

        <button className="link-button" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
