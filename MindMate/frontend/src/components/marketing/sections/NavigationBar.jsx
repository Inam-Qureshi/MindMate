import { useState } from "react";
import { Menu, X, Moon, Sun } from "react-feather";
import { motion, AnimatePresence } from "framer-motion";

const NavigationBar = ({
  darkMode,
  navItems,
  onToggleDarkMode,
  onNavigate,
  onLogin,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen((open) => !open);
  const closeMobile = () => setMobileOpen(false);

  const containerClasses = darkMode
    ? "bg-gray-900/95 border-b border-gray-800 text-gray-100"
    : "bg-white/95 border-b border-gray-200 text-gray-900";

  const linkBase =
    "px-3 py-2 rounded-md text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const desktopLinkClasses = darkMode
    ? `${linkBase} hover:text-blue-300 focus-visible:outline-blue-400`
    : `${linkBase} hover:text-blue-600 focus-visible:outline-blue-600`;

  const loginButtonClasses = darkMode
    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:from-indigo-400 hover:to-purple-400 focus-visible:outline-purple-400"
    : "bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-lg hover:from-blue-500 hover:to-indigo-400 focus-visible:outline-blue-600";

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-md transition-colors ${containerClasses}`}
      role="banner"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <motion.a
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            onNavigate?.("home");
            closeMobile();
          }}
          className="text-2xl font-bold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            MindMate
          </span>
        </motion.a>

        <nav className="hidden items-center space-x-8 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={desktopLinkClasses}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              {item.name}
            </motion.button>
          ))}
        </nav>

        <div className="flex items-center space-x-3">
          <motion.button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className={`rounded-full p-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              darkMode
                ? "bg-gray-800 text-yellow-300 focus-visible:outline-yellow-300"
                : "bg-gray-200 text-gray-700 focus-visible:outline-blue-600"
            }`}
            whileHover={{ rotate: 10 }}
            whileTap={{ scale: 0.9 }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>

          <motion.button
            type="button"
            onClick={onLogin}
            className={`hidden rounded-md px-4 py-2 text-sm font-semibold transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:block ${loginButtonClasses}`}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            Log In
          </motion.button>

          <motion.button
            type="button"
            onClick={toggleMobile}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-menu"
            className={`rounded-md p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden ${
              darkMode
                ? "focus-visible:outline-blue-300 text-gray-200"
                : "focus-visible:outline-blue-600 text-gray-700"
            }`}
            whileTap={{ scale: 0.9 }}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            id="landing-mobile-menu"
            key="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`md:hidden ${darkMode ? "border-t border-gray-800" : "border-t border-gray-200"}`}
            aria-label="Mobile primary"
          >
            <div className="space-y-1 px-4 pb-4 pt-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate?.(item.id);
                    closeMobile();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium ${
                    darkMode
                      ? "bg-gray-900 text-gray-100 hover:bg-gray-800"
                      : "bg-white text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {item.name}
                </button>
              ))}
              <button
                onClick={() => {
                  onLogin?.();
                  closeMobile();
                }}
                className={`w-full rounded-lg px-4 py-3 text-sm font-semibold ${loginButtonClasses}`}
              >
                Log In
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default NavigationBar;

