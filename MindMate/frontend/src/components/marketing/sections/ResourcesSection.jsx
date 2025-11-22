import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, HelpCircle, Sun, X } from "react-feather";
import { BLOG_POSTS } from "../content";
import { Modal } from "../../common/Modal";

const categoryMeta = {
  Mindfulness: {
    icon: Sun,
    color: "text-amber-600 dark:text-amber-300",
    surface: "bg-amber-500/10 dark:bg-amber-500/15",
  },
  "Mental Health": {
    icon: HelpCircle,
    color: "text-purple-600 dark:text-purple-300",
    surface: "bg-purple-500/10 dark:bg-purple-500/15",
  },
  Journaling: {
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-300",
    surface: "bg-blue-500/10 dark:bg-blue-500/15",
  },
};

const ResourcesSection = ({ darkMode }) => {
  const [activePost, setActivePost] = useState(null);
  const closeModal = () => setActivePost(null);

  return (
    <section
      id="resources"
      aria-labelledby="landing-resources-heading"
      className={darkMode ? "bg-gray-950 py-24 text-gray-100" : "bg-white py-24 text-gray-900"}
    >
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="text-center">
          <motion.h2
            id="landing-resources-heading"
            className="text-3xl font-semibold md:text-4xl"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
          >
            Guided learning & community care
          </motion.h2>

          <motion.p
            className={`mx-auto mt-4 max-w-2xl text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Curated resources written alongside licensed professionals and peer supporters. Updated
            weekly by the MindMate editorial team.
          </motion.p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {BLOG_POSTS.map((post, idx) => {
            const meta = categoryMeta[post.category] ?? categoryMeta.Mindfulness;
            const Icon = meta.icon;

            return (
              <motion.article
                key={post.title}
                className={`flex h-full flex-col rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg ${
                  darkMode ? "border-gray-800 bg-gray-900/70" : "border-gray-200 bg-gray-50"
                }`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: idx * 0.07 }}
              >
                <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.surface}`}>
                  <Icon className={`h-4 w-4 ${meta.color}`} aria-hidden="true" />
                  <span className={meta.color}>{post.category}</span>
                </div>

                <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">{post.title}</h3>
                <p className={`mt-3 text-sm leading-6 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {post.excerpt}
                </p>

                <footer className="mt-auto pt-6 text-xs text-gray-500 dark:text-gray-400">
                  {post.readTime} · Reviewed by clinical advisors
                </footer>

                <button
                  type="button"
                  onClick={() => setActivePost(post)}
                  className={`mt-6 inline-flex items-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    darkMode
                      ? "text-blue-300 hover:text-blue-200 focus-visible:outline-blue-300"
                      : "text-blue-600 hover:text-blue-700 focus-visible:outline-blue-600"
                  }`}
                >
                  Read full article{" "}
                  <span aria-hidden="true" className="pl-1">
                    {"\u2192"}
                  </span>
                </button>
              </motion.article>
            );
          })}
        </div>
      </div>

      <Modal isOpen={!!activePost} onClose={closeModal} panelClassName="max-w-3xl w-full">
        {activePost && (
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className={`rounded-2xl border shadow-xl ${darkMode ? "border-gray-700 bg-gray-900 text-gray-100" : "border-gray-200 bg-white text-gray-900"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="blog-modal-title"
          >
            <header className="flex items-start justify-between gap-4 border-b px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  {activePost.category}
                </p>
                <h3 id="blog-modal-title" className="mt-1 text-xl font-semibold">
                  {activePost.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{activePost.readTime}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={`rounded-full p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  darkMode
                    ? "text-gray-300 hover:text-gray-100 focus-visible:outline-blue-300"
                    : "text-gray-500 hover:text-gray-700 focus-visible:outline-blue-600"
                }`}
                aria-label="Close article"
              >
                <X size={18} />
              </button>
            </header>
            <div
              className="modal-scroll max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5 text-sm leading-6"
              style={{ overscrollBehavior: "contain" }}
            >
              {activePost.content.map((paragraph, idx) => (
                <p key={idx} className={darkMode ? "text-gray-300" : "text-gray-700"}>
                  {paragraph}
                </p>
              ))}
            </div>
            <footer className="border-t px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  darkMode
                    ? "bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-300"
                    : "bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600"
                }`}
              >
                Close
              </button>
            </footer>
          </motion.article>
        )}
      </Modal>
    </section>
  );
};

export default ResourcesSection;

