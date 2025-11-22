import React from "react";
import { motion } from "framer-motion";
import { Heart, Facebook, Twitter, Instagram, Linkedin } from "react-feather";
import { ROUTES } from "../../config/routes";

const Footer = ({ darkMode }) => {
  const navigation = {
    platform: [
      { name: "Patient Dashboard", href: ROUTES.PATIENT_DASHBOARD },
      { name: "Appointments Hub", href: ROUTES.APPOINTMENTS },
      { name: "Progress Tracker", href: `${ROUTES.DASHBOARD}/progress-tracker` },
      { name: "Community Forum", href: ROUTES.FORUM },
    ],
    resources: [
      { name: "Assessment Journey", href: ROUTES.ASSESSMENT },
      { name: "Journal", href: `${ROUTES.DASHBOARD}/journal` },
      { name: "Exercises Library", href: `${ROUTES.DASHBOARD}/exercises` },
      { name: "Find Specialists", href: ROUTES.APPOINTMENTS },
    ],
    company: [
      { name: "Home", href: ROUTES.HOME },
      { name: "Patient Support", href: ROUTES.APPOINTMENTS },
      { name: "Specialist Portal", href: ROUTES.SPECIALIST_DASHBOARD },
    ],
    compliance: [
      { name: "Patient Terms", href: ROUTES.PATIENT_TERMS },
      { name: "Specialist Terms", href: ROUTES.SPECIALIST_TERMS },
    ],
  };

  const socialLinks = [
    { name: "LinkedIn", icon: Linkedin, href: "#" },
    { name: "Twitter", icon: Twitter, href: "#" },
    { name: "Facebook", icon: Facebook, href: "#" },
    { name: "Instagram", icon: Instagram, href: "#" },
  ];

  return (
    <footer
      className={`transition-colors duration-500 ${
        darkMode
          ? "bg-gray-950 border-t border-gray-900"
          : "bg-white border-t border-slate-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Main footer content */}
        <div className="grid gap-12 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  darkMode ? "bg-indigo-500" : "bg-indigo-500"
                } shadow-lg shadow-indigo-500/30`}
              >
                <Heart size={22} className="text-white" />
              </div>
              <div>
                <p className={`text-2xl font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                MindMate
                </p>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
                  Mental health operating system for modern care teams.
                </p>
              </div>
            </motion.div>

            <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-400" : "text-slate-600"}`}>
              We partner with healthcare providers, employers, and insurers to deliver evidence-based care pathways, personalised support, and continuous insights that close the gap between need and access.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                      darkMode
                        ? "border-gray-800 text-gray-400 hover:border-indigo-400 hover:text-white"
                        : "border-slate-200 text-slate-500 hover:border-indigo-500 hover:text-indigo-600"
                    }`}
                    aria-label={social.name}
                  >
                    <Icon size={18} />
                  </motion.a>
                );
              })}
            </div>

            <div className="pt-4 border-t border-dashed border-gray-800/30">
              <p className={`text-xs uppercase tracking-wide ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
                AJK MZD Headquarters
              </p>
              <p className={`mt-1 text-sm ${darkMode ? "text-gray-300" : "text-slate-600"}`}>
                Wellness Park Road, Upper Chattar<br />Muzaffarabad, Azad Jammu & Kashmir · +92 (5822) 400-210
              </p>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(navigation).map(([section, links]) => (
              <div key={section} className="space-y-4">
                <p className={`text-xs font-semibold uppercase tracking-widest ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
                  {section}
                </p>
                <ul className="space-y-3 text-sm">
                  {links.map((link) => (
                    <li key={link.name}>
                    <a
                      href={link.href}
                        className={`group inline-flex items-center gap-1 transition ${
                          darkMode ? "text-gray-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>{link.name}</span>
                        <span
                          className={`translate-x-0 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100 ${
                            darkMode ? "text-indigo-300" : "text-indigo-500"
                          }`}
                        >
                          →
                        </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            ))}
          </div>
        </div>

        <div
          className={`flex flex-col gap-4 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between ${
            darkMode ? "border-gray-900 text-gray-500" : "border-slate-200 text-slate-500"
          }`}
        >
          <p>© {new Date().getFullYear()} MindMate. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href="#"
              className={`transition ${darkMode ? "hover:text-white" : "hover:text-slate-900"}`}
            >
              Data Processing Addendum
            </a>
            <a
              href="#"
              className={`transition ${darkMode ? "hover:text-white" : "hover:text-slate-900"}`}
            >
              Cookie Preferences
            </a>
            <a
              href="#"
              className={`transition ${darkMode ? "hover:text-white" : "hover:text-slate-900"}`}
            >
              Responsible AI Statement
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
