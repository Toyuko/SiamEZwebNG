import type { Transition, Variants } from "framer-motion";

/**
 * Shared Framer Motion presets for SiamEZ 2.0.
 * Prefer these over one-off timings so entrances feel intentional, not noisy.
 *
 * Usage:
 *   import { motion } from "framer-motion";
 *   import { fadeInUp, motionTransition } from "@/components/ui/motion";
 *   <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={motionTransition} />
 */

/** Default easing / duration for UI presence (not decorative loops). */
export const motionTransition: Transition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1],
};

/** Soft opacity fade — overlays, toasts, secondary panels. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Primary entrance — page sections, step content, cards entering a list. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

/** Scale-in — dialogs, sheets, focused confirmations. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

/** Stagger children after a parent `visible` (use with fadeInUp on items). */
export const staggerChildren: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};
