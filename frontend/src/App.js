import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Chat from "./pages/chat";
import { ConversationProvider } from "./context/useConversation";

function App(){
  return(
    <ConversationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login/>}/>
          <Route path="/chat" element={<Chat/>}/>
        </Routes>
      </BrowserRouter>
    </ConversationProvider>
  );
}

export default App;
