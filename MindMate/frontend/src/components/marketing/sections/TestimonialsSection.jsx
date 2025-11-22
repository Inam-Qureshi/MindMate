import { motion } from "framer-motion";
import { MessageCircle } from "react-feather";
import { TESTIMONIALS } from "../content";

const TestimonialsSection = ({ darkMode }) => (
  <section
    id="testimonials"
    aria-labelledby="landing-testimonials-heading"
    className={darkMode ? "bg-gray-900 py-24 text-gray-100" : "bg-gray-50 py-24 text-gray-900"}
  >
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <div className="text-center">
        <motion.h2
          id="landing-testimonials-heading"
          className="text-3xl font-semibold md:text-4xl"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          What our members are sharing
        </motion.h2>
        <motion.p
          className={`mx-auto mt-4 max-w-2xl text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Testimonials reflect personal experiences. Some quotes are anonymized and lightly edited
          for clarity.
        </motion.p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial, idx) => (
          <motion.figure
            key={testimonial.author}
            className={`flex h-full flex-col rounded-2xl border p-8 shadow-sm ${
              darkMode ? "border-gray-800 bg-gray-900/70" : "border-gray-200 bg-white"
            }`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: idx * 0.08 }}
          >
            <MessageCircle
              className={`h-10 w-10 ${darkMode ? "text-blue-300" : "text-blue-500"}`}
              aria-hidden="true"
            />
            <blockquote className={`mt-6 flex-grow text-base leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              “{testimonial.quote}”
            </blockquote>
            <figcaption className="mt-6">
              <p className="text-sm font-semibold">{testimonial.author}</p>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {testimonial.role}
              </p>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;

