import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Minus } from "react-feather";
import { FAQ_ENTRIES } from "../content";

const FAQSection = ({ darkMode }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const toggleIndex = (index) => setActiveIndex((prev) => (prev === index ? null : index));

  return (
    <section
      id="faq"
      aria-labelledby="landing-faq-heading"
      className={darkMode ? "bg-gray-900 py-24 text-gray-100" : "bg-gray-50 py-24 text-gray-900"}
    >
      <div className="mx-auto max-w-4xl px-4 lg:px-8">
        <div className="text-center">
          <motion.h2
            id="landing-faq-heading"
            className="text-3xl font-semibold md:text-4xl"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
          >
            Frequently asked questions
          </motion.h2>
          <motion.p
            className={`mx-auto mt-4 max-w-2xl text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Need more clarity? Email{" "}
            <a
              href="mailto:hello@mindmate.app"
              className="underline decoration-dotted decoration-blue-500 hover:text-blue-500"
            >
              hello@mindmate.app
            </a>{" "}
            or message us in the app.
          </motion.p>
        </div>

        <div className="mt-16 space-y-4" role="list">
          {FAQ_ENTRIES.map((faq, index) => {
            const open = activeIndex === index;
            return (
              <article
                key={faq.question}
                role="listitem"
                className={`rounded-2xl border shadow-sm ${
                  darkMode ? "border-gray-800 bg-gray-900/70" : "border-gray-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleIndex(index)}
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl px-6 py-5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    darkMode
                      ? "focus-visible:outline-blue-400 hover:bg-gray-800/80"
                      : "focus-visible:outline-blue-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-base font-semibold">{faq.question}</span>
                  {open ? <Minus size={20} /> : <Plus size={20} />}
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className={`px-6 pb-6 text-sm leading-6 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

