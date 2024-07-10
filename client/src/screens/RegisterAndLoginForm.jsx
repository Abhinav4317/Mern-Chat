import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "../UserContext";
const RegisterAndLoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const url = isLoginOrRegister === "register" ? "/register" : "/login";
      const { data } = await axios.post(url, { username, password });
      setLoggedInUsername(username);
      setId(data.id);
      if (isLoginOrRegister === "register") {
        alert("Registration successful");
      } else {
        alert("Login successful");
      }
    } catch (error) {
      if (isLoginOrRegister === "register") {
        alert("Registration unsuccessful");
      } else {
        alert("Login unsuccessful");
      }
    }
  }
  return (
    <>
      <div className="bg-blue-50 h-screen flex items-center">
        <form className="w-80 mx-auto mb-12" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="block w-full rounded-sm p-2 mb-2 border"
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-sm p-2 mb-2 border"
          />
          <button className="bg-blue-600 text-white block w-full rounded-sm p-2">
            {isLoginOrRegister === "register" ? "Register" : "Login"}
          </button>
          <div className="text-center mt-2">
            {isLoginOrRegister === "register" && (
              <div>
                Already registered?
                <button
                  onClick={() => setIsLoginOrRegister("login")}
                  className="underline"
                >
                  Login
                </button>
              </div>
            )}
            {isLoginOrRegister === "login" && (
              <div>
                Don&lsquo;t have an account yet?
                <button
                  onClick={() => setIsLoginOrRegister("register")}
                  className="underline"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

export default RegisterAndLoginForm;
