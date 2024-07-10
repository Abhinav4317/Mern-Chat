import { useContext, useEffect, useRef, useState } from "react";
import Logo from "../Logo";
import { UserContext } from "../UserContext";
import uniqBy from "lodash/uniqBy";
import axios from "axios";
import Contact from "../Contact";
const Chat = () => {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();
  useEffect(() => {
    connectToWs();
  }, []);
  function connectToWs() {
    const ws = new WebSocket("ws://localhost:4040");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("Disconnected.Trying to reconnect.");
        connectToWs();
      }, 1000);
    });
  }
  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }
  function handleMessage(e) {
    const messageData = JSON.parse(e.data);
    console.log({ e, messageData });
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    }
  }
  const onlinePeopleExclOwn = { ...onlinePeople };
  delete onlinePeopleExclOwn[id];

  function sendMessage(e, file = null) {
    if (e) e.preventDefault();

    ws.send(
      JSON.stringify({
        message: {
          recipient: selectedUserId,
          text: newMessageText,
          file,
        },
      })
    );
    if (file) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        const { data } = res;
        setMessages(data);
      });
    } else {
      setNewMessageText("");
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recipient: selectedUserId,
          _id: Date.now(),
        },
      ]);
    }
  }
  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        const { data } = res;
        setMessages(data);
      });
    }
  }, [selectedUserId]);

  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p;
      });
      setOfflinePeople(offlinePeople);
      //console.log(offlinePeople);
    });
  }, [onlinePeople]);
  const messagesWithoutDupes = uniqBy(messages, "_id");
  function logout() {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }
  function sentenceCase(str) {
    if (str === null || str === "") return false;
    else str = str.toString();

    return str.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
  function sendFile(e) {
    const reader = new FileReader();
    reader.readAsDataURL(e.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: e.target.files[0].name,
        data: reader.result,
      });
    };
  }
  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <Logo />
          {Object.keys(onlinePeopleExclOwn).map((userId, index) => (
            <div key={index}>
              <Contact
                id={userId}
                selected={userId === selectedUserId}
                onChange={() => setSelectedUserId(userId)}
                username={onlinePeopleExclOwn[userId]}
                onlineOrOffline={true}
              />
            </div>
          ))}
          {Object.keys(offlinePeople).map((userId, index) => (
            <div key={index}>
              <Contact
                id={userId}
                selected={userId === selectedUserId}
                onChange={() => setSelectedUserId(userId)}
                username={offlinePeople[userId].username}
                onlineOrOffline={false}
              />
            </div>
          ))}
        </div>
        <div className="text-center bg-blue-500 rounded-md flex items-center justify-center">
          <span className="mr-2 text-md text-white font-bold flex gap-1 items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clipRule="evenodd"
              />
            </svg>

            {sentenceCase(username)}
          </span>
          <button
            onClick={logout}
            className="text-md py-2 px-2 font-bold text-gray-500 bg-blue-100 rounded-md"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex flex-col bg-blue-100 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex items-center h-full flex-grow text-white justify-center">
              <h1 className="text-xl">
                &larr; Select a contact to view your chats with them
              </h1>
            </div>
          )}
          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDupes.map((message, index) => (
                  <div
                    className={
                      message.sender === id
                        ? "text-right ml-32"
                        : "text-left mr-32"
                    }
                    key={index}
                  >
                    <div
                      className={
                        "text-left inline-block p-2 my-2 rounded-md text-sm min-w-24 " +
                        (message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                    >
                      {message.text}
                      {message.file && (
                        <div>
                          <a
                            target="_blank"
                            className="underline flex items-center"
                            href={message.file}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="size-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                              />
                            </svg>
                            {message.file}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>
        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              type="text"
              placeholder="Type your message here"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="bg-white border flex-grow p-2 rounded-lg"
            />
            <label
              type="button"
              className=" cursor-pointer bg-blue-400 p-2 text-white rounded-lg"
            >
              <input type="file" className="hidden" onChange={sendFile} />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                />
              </svg>
            </label>
            <button
              type="submit"
              className="bg-blue-500 p-2 text-white rounded-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Chat;
