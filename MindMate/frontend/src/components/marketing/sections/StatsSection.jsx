import { motion } from "framer-motion";
import { IMPACT_STATS } from "../content";

const StatsSection = ({ darkMode }) => (
  <section
    aria-labelledby="landing-impact-heading"
    className={darkMode ? "bg-gray-950 py-24 text-gray-100" : "bg-white py-24 text-gray-900"}
    id="impact"
  >
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <div className="text-center">
        <motion.h2
          id="landing-impact-heading"
          className="text-3xl font-semibold md:text-4xl"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          Trusted by a growing global community
        </motion.h2>

        <motion.p
          className={`mx-auto mt-4 max-w-2xl text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Impact metrics are updated quarterly and audited internally. Individual results vary;
          MindMate is not a replacement for professional medical care.
        </motion.p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {IMPACT_STATS.map((stat, idx) => (
          <motion.dl
            key={stat.label}
            className={`flex h-full flex-col rounded-2xl border p-6 text-center shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg ${
              darkMode ? "border-gray-800 bg-gray-900/70" : "border-gray-200 bg-slate-50"
            }`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: idx * 0.05 }}
          >
            <dt className="text-sm font-medium uppercase tracking-wide text-blue-500">
              {stat.label}
            </dt>
            <dd className="mt-4 text-3xl font-semibold">{stat.value}</dd>
            <dd className={`mt-4 text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Data self-reported by users between Jan–Sep 2025. Rounded to the nearest whole number.
            </dd>
          </motion.dl>
        ))}
      </div>
    </div>
  </section>
);

export default StatsSection;

