import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserTier } from "../../utils/dashboardRoutes";
import ThemeToggle from "../ThemeToggle";

const Topbar = ({ context, user, onLogout }) => {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const role = getUserTier(context);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setOpenMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
      {/* Left: Organization */}
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">
          {context.organization?.name || "Organization"}
        </p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {context.organization?.description || "Unified workspace"}
        </p>
      </div>

      {/* Right: User */}
      <div className="relative flex items-center gap-4" ref={menuRef}>
        <ThemeToggle />
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {user?.name || "User"}
          </p>

          <span
            className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${role === "ORG_ADMIN"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
          >
            {role}
          </span>
        </div>

        {/* Avatar */}
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            onClick={() => setOpenMenu((prev) => !prev)}
            className="h-10 w-10 cursor-pointer rounded-full border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600"
          />
        ) : (
          <div
            onClick={() => setOpenMenu((prev) => !prev)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-slate-900 dark:bg-slate-700 text-sm font-semibold text-white"
          >
            {user?.name?.[0] || "?"}
          </div>
        )}

        {/* Dropdown */}
        {openMenu && (
          <div className="absolute right-0 top-14 w-60 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-50 overflow-hidden">
            <div className="border-b dark:border-slate-700 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email}
              </p>
            </div>

            {/* My Profile */}
            <button
              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => {
                setOpenMenu(false);
                navigate("/dashboard/profile");
              }}
            >
              My Profile
            </button>

            {/* Logout */}
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
