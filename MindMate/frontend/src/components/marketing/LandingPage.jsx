import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import CookieConsent from "react-cookie-consent";
import { SkipLink } from "../common/Accessibility";
import { Footer } from "../layout";
import NavigationBar from "./sections/NavigationBar";
import HeroSection from "./sections/HeroSection";
import FeaturesSection from "./sections/FeaturesSection";
import StatsSection from "./sections/StatsSection";
import TestimonialsSection from "./sections/TestimonialsSection";
import ResourcesSection from "./sections/ResourcesSection";
import FAQSection from "./sections/FAQSection";
import { NAV_ITEMS } from "./content";
import { ArrowUp } from "react-feather";

const LandingPage = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const handleScroll = () => setShowScrollButton(window.scrollY > 320);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const containerClasses = useMemo(
    () =>
      darkMode
        ? "bg-gray-950 text-gray-100"
        : "bg-gradient-to-b from-white via-slate-50 to-gray-100 text-gray-900",
    [darkMode],
  );

  const toggleDarkMode = () => setDarkMode((mode) => !mode);

  const navigateToSection = (id) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${containerClasses}`}>
      <SkipLink href="#landing-main">Skip to main content</SkipLink>

      <motion.div
        className={`fixed inset-x-0 top-0 z-40 h-1 origin-left ${darkMode ? "bg-blue-400" : "bg-indigo-500"}`}
        style={{ scaleX: progressScale }}
        aria-hidden="true"
      />

      <NavigationBar
        darkMode={darkMode}
        navItems={NAV_ITEMS}
        onToggleDarkMode={toggleDarkMode}
        onNavigate={navigateToSection}
        onLogin={() => navigate("/login")}
      />

      <main id="landing-main">
        <HeroSection
          darkMode={darkMode}
          onSignup={() => navigate("/signup")}
          onLearnMore={() => navigateToSection("features")}
        />
        <FeaturesSection darkMode={darkMode} />
        <StatsSection darkMode={darkMode} />
        <TestimonialsSection darkMode={darkMode} />
        <ResourcesSection darkMode={darkMode} />
        <FAQSection darkMode={darkMode} />
      </main>

      <Footer darkMode={darkMode} />

      {showScrollButton && (
        <motion.button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          className={`fixed bottom-8 right-8 z-30 rounded-full p-3 shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            darkMode
              ? "bg-gray-800 text-gray-100 focus-visible:outline-blue-400"
              : "bg-white text-gray-900 focus-visible:outline-blue-600"
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <span className="sr-only">Back to top</span>
          <ArrowUp size={18} aria-hidden="true" />
        </motion.button>
      )}

      <CookieConsent
        location="bottom"
        buttonText="Accept"
        declineButtonText="Reject"
        enableDeclineButton
        cookieName="mindMateCookieConsent"
        contentStyle={{ margin: "0 1.5rem 0 0" }}
        style={{
          background: darkMode ? "#1F2937" : "#FFFFFF",
          color: darkMode ? "#E5E7EB" : "#111827",
          borderTop: darkMode ? "1px solid #374151" : "1px solid #E5E7EB",
          boxShadow: "0 -2px 12px rgba(15, 23, 42, 0.12)",
          zIndex: 60,
        }}
        buttonStyle={{
          background: darkMode ? "#4F46E5" : "#2563EB",
          color: "#FFFFFF",
          fontSize: "14px",
          borderRadius: "6px",
          padding: "10px 16px",
        }}
        declineButtonStyle={{
          background: darkMode ? "#4B5563" : "#E5E7EB",
          color: darkMode ? "#E5E7EB" : "#374151",
          fontSize: "14px",
          borderRadius: "6px",
          padding: "10px 16px",
          marginRight: "12px",
        }}
        aria-label="Cookie consent banner"
      >
        MindMate uses cookies to personalize content and analyze engagement. You can change your
        preference at any time in settings.
      </CookieConsent>
    </div>
  );
};

export default LandingPage;
