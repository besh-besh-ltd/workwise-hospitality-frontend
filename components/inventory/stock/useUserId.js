import { useSelector } from "react-redux";

// The signed-in user's id (redux userProfile), as a string; null when unknown.
// Device copies of a user's work are keyed by it, so one person's session is
// never shown to, posted by, or cleared by someone else on the same device.
const useUserId = () => {
  const id = useSelector((state) => state?.userProfile?.id);
  return id === undefined || id === null || id === "" ? null : String(id);
};

export default useUserId;
