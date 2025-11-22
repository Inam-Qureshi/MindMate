import { motion } from "framer-motion";
import heroIllustration from "../../../assets/images/hero-illustration.svg";

const HeroSection = ({ darkMode, onSignup, onLearnMore }) => {
  const textColor = darkMode ? "text-gray-100" : "text-gray-900";
  const paragraphColor = darkMode ? "text-gray-300" : "text-gray-700";
  const surface = darkMode ? "bg-gray-800/60 border-gray-700" : "bg-white border-gray-200";

  return (
    <section
      id="home"
      className="relative overflow-hidden"
      aria-labelledby="landing-hero-heading"
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent blur-3xl" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-4 py-24 md:flex-row md:items-start md:py-28 lg:px-8">
        <div className="w-full md:w-1/2">
          <motion.h1
            id="landing-hero-heading"
            className={`text-4xl font-semibold tracking-tight md:text-5xl ${textColor}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Your Mental Wellness Companion
          </motion.h1>
          <motion.p
            className={`mt-6 text-lg leading-relaxed ${paragraphColor}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            MindMate blends evidence-based practices with calming design to help you track mood,
            stay mindful, and build habits that support sustainable wellbeing.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <button
              type="button"
              onClick={onSignup}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Get Started Free
            </button>
            <button
              type="button"
              onClick={onLearnMore}
              className={`inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                darkMode
                  ? "border-gray-700 text-gray-100 hover:bg-gray-800 focus-visible:outline-blue-400"
                  : "border-gray-200 text-gray-800 hover:bg-gray-100 focus-visible:outline-blue-600"
              }`}
            >
              See how it works
            </button>
          </motion.div>

          <motion.div
            className={`mt-10 grid gap-4 rounded-2xl border p-6 shadow-sm md:grid-cols-2 ${surface}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            role="list"
            aria-label="Quick highlights"
          >
            {[
              {
                heading: "Personalized guidance",
                description: "Adaptive check-ins and recommendations that evolve with your mood trends.",
              },
              {
                heading: "Inclusive support",
                description: "Community moderators and clinicians review content for clinical safety.",
              },
              {
                heading: "Accessible anytime",
                description: "Use the web or mobile app, online or offline, whenever you need space.",
              },
              {
                heading: "Privacy-first design",
                description: "Encrypted data with granular controls for sharing and retention.",
              },
            ].map((item, idx) => (
              <div key={item.heading} role="listitem">
                <p className="text-sm font-semibold text-blue-500">{`0${idx + 1}`}</p>
                <h2 className={`mt-1 text-base font-semibold ${textColor}`}>{item.heading}</h2>
                <p className={`mt-2 text-sm leading-6 ${paragraphColor}`}>{item.description}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="w-full md:w-1/2"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <figure
            className={`relative overflow-hidden rounded-3xl border shadow-xl ${darkMode ? "border-gray-700 bg-gray-800/60" : "border-gray-200 bg-white/60"}`}
          >
            <img
              src={heroIllustration}
              alt="Illustration of a calm person tracking their wellness with MindMate"
              loading="lazy"
              className="w-full"
            />
            <figcaption
              className={`sr-only`}
            >
              Abstract illustration conveying calmness and growth.
            </figcaption>
          </figure>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;

