import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getAuth, updatePassword } from "firebase/auth";

const ChangePassword = () => {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const auth = getAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <div className="text-slate-500">Loading...</div>;
  }

  const providerId = user.providerData?.[0]?.providerId;

  // ❌ Google / OAuth users
  if (providerId !== "password") {
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold mb-2">Change Password</h1>
        <p className="text-sm text-slate-600">
          You signed in using Google. Password changes are managed through your
          Google account.
        </p>

        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const handleChangePassword = async () => {
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await updatePassword(auth.currentUser, newPassword);
      navigate("/dashboard/profile");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        setError("Please log in again to change your password.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-6 space-y-4">
      <h1 className="text-xl font-semibold">Change Password</h1>

      <input
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />

      <input
        type="password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleChangePassword}
        disabled={loading}
        className="w-full rounded bg-slate-900 py-2 text-white hover:bg-slate-800"
      >
        {loading ? "Updating..." : "Update Password"}
      </button>
    </div>
  );
};

export default ChangePassword;
