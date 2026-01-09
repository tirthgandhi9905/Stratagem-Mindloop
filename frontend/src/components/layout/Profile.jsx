import { useState } from "react";
import { useOutletContext } from "react-router-dom";

const Profile = () => {
  const { user, context } = useOutletContext();

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [editing, setEditing] = useState(false);

  if (!user || !context) {
    return <div className="text-slate-500 dark:text-slate-400">Loading profile…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
        My Profile
      </h1>

      {/* Profile Overview */}
      <div className="flex items-center gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-none transition-colors duration-200">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-3xl font-semibold text-white">
          {displayName?.[0] || "?"}
        </div>

        <div className="flex-1">
          {!editing ? (
            <div className="flex items-center gap-3">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {displayName}
              </p>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-white"
              />
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-indigo-600 dark:text-indigo-400"
              >
                Save
              </button>
            </div>
          )}

          <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>

          <span className="mt-2 inline-block rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {user.role || "MEMBER"}
          </span>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-none transition-colors duration-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
          Personal Information
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Full Name</p>
            <p className="font-medium text-slate-900 dark:text-white">{displayName}</p>
          </div>

          <div>
            <p className="text-slate-500 dark:text-slate-400">Email</p>
            <p className="font-medium text-slate-900 dark:text-white">{user.email}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-slate-500 dark:text-slate-400">User ID</p>
            <p className="font-mono text-xs break-all text-slate-900 dark:text-slate-300">{user.uid}</p>
          </div>
        </div>
      </div>

      {/* Organization */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-none transition-colors duration-200">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
          Organization
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Workspace</p>
            <p className="font-medium text-slate-900 dark:text-white">{context.organization?.name}</p>
          </div>

          <div>
            <p className="text-slate-500 dark:text-slate-400">Your Role</p>
            <p className="font-medium text-slate-900 dark:text-white">{user.role || "MEMBER"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
