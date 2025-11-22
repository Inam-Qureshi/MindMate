import { motion } from "framer-motion";
import { FEATURE_CARDS } from "../content";

const themeMap = {
  indigo: {
    surface: "from-indigo-500/10 via-indigo-500/5 to-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-200",
    accent: "bg-indigo-500/20 dark:bg-indigo-400/30",
  },
  teal: {
    surface: "from-teal-500/10 via-teal-500/5 to-teal-500/10",
    text: "text-teal-700 dark:text-teal-200",
    accent: "bg-teal-500/20 dark:bg-teal-400/30",
  },
  purple: {
    surface: "from-purple-500/10 via-purple-500/5 to-purple-500/10",
    text: "text-purple-700 dark:text-purple-200",
    accent: "bg-purple-500/20 dark:bg-purple-400/30",
  },
};

const FeaturesSection = ({ darkMode }) => (
  <section
    id="features"
    className={darkMode ? "bg-gray-900 py-24 text-gray-100" : "bg-gray-50 py-24 text-gray-900"}
    aria-labelledby="landing-features-heading"
  >
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <div className="text-center">
        <motion.h2
          id="landing-features-heading"
          className="text-3xl font-semibold md:text-4xl"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          Tools designed to meet you where you are
        </motion.h2>
        <motion.p
          className={`mx-auto mt-4 max-w-2xl text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Every feature is built with clinicians, community moderators, and people with lived
          experience to ensure it is safe, inclusive, and effective.
        </motion.p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FEATURE_CARDS.map((card, idx) => {
          const theme = themeMap[card.theme] ?? themeMap.indigo;
          return (
            <motion.article
              key={card.title}
              className={`flex h-full flex-col rounded-2xl border bg-gradient-to-br p-6 shadow-sm transition-shadow hover:shadow-lg ${
                darkMode ? "border-gray-800" : "border-gray-200"
              } ${theme.surface}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl ${theme.accent}`}
                aria-hidden="true"
              >
                {card.icon}
              </div>
              <h3 className="mt-6 text-xl font-semibold">{card.title}</h3>
              <p className={`mt-3 text-sm leading-6 ${theme.text}`}>{card.description}</p>
              <span className="mt-auto pt-6 text-sm font-medium text-blue-600 dark:text-blue-300">
                {card.cta}
              </span>
            </motion.article>
          );
        })}
      </div>
    </div>
  </section>
);

export default FeaturesSection;

