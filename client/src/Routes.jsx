import { useContext } from "react";
import RegisterAndLoginForm from "./screens/RegisterAndLoginForm";
import { UserContext } from "./UserContext";
import Chat from "./screens/Chat";

const Routes = () => {
  const { username, id } = useContext(UserContext);
  if (id) {
    return <Chat />;
  }
  return (
    <>
      <RegisterAndLoginForm />
    </>
  );
};

export default Routes;
