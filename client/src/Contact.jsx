import Avatar from "./Avatar";
const Contact = ({ id, selected, onChange, username, onlineOrOffline }) => {
  return (
    <div>
      <div
        onClick={() => onChange(id)}
        className={
          "border-b border-gray-100 rounded-xl flex items-center gap-2 cursor-pointer " +
          (selected ? "bg-blue-100" : "")
        }
      >
        {selected && <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>}
        <div className="flex gap-2 items-center py-2 pl-4">
          <Avatar username={username} userId={id} online={onlineOrOffline} />
          <span className="text-gray-800">{username}</span>
        </div>
      </div>
    </div>
  );
};

export default Contact;
