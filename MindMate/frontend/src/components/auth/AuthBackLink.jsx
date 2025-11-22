import { motion } from "framer-motion";
import { ArrowLeft } from "react-feather";
import { Link } from "react-router-dom";

const AuthBackLink = ({ to, label, darkMode, className = "" }) => {
  if (!to) {
    return null;
  }

  return (
    <motion.div
      className={`absolute top-4 left-4 ${className}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link
        to={to}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
          darkMode
            ? "text-indigo-300 hover:text-indigo-200"
            : "text-indigo-600 hover:text-indigo-800"
        }`}
      >
        <ArrowLeft size={16} />
        <span>{label}</span>
      </Link>
    </motion.div>
  );
};

export default AuthBackLink;


