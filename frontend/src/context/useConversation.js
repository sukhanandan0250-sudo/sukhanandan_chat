import { createContext, useContext, useState } from "react";

const ConversationContext = createContext();

export const ConversationProvider = ({children})=>{
  const [selectedconversation,setSelectedconversation]=useState(null);
  const [messages,setMessages]=useState([]);
  const [currentUser,setCurrentUser]=useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  return(
    <ConversationContext.Provider value={{
      selectedconversation,
      setSelectedconversation,
      messages,
      setMessages,
      currentUser,
      setCurrentUser
    }}>
      {children}
    </ConversationContext.Provider>
  );
};

const useConversation = () => useContext(ConversationContext);

export default useConversation;
