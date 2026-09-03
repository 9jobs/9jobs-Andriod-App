"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

export default function HomeFaq({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="fj-faq-list">
      {items.map(([question, answer], index) => {
        const isOpen = openIndex === index;

        return (
          <motion.article
            key={question}
            className={`fj-faq-item fj-faq-panel${isOpen ? " is-open" : ""}`}
            layout
            transition={{ duration: 0.42, ease: EASE }}
          >
            <button
              className="fj-faq-trigger"
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex((current) => (current === index ? -1 : index))}
            >
              <span>{question}</span>
              <motion.span
                className="fj-faq-icon"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <ChevronDown size={20} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.36, ease: EASE }}
                  style={{ overflow: "hidden" }}
                >
                  <p>{answer}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.article>
        );
      })}
    </div>
  );
}
