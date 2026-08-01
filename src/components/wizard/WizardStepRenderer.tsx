"use client";

import { AnimatePresence, motion } from "framer-motion";
import { fadeInUp, motionTransition } from "@/components/ui/motion";

interface WizardStepRendererProps {
  stepKey: string;
  children: React.ReactNode;
}

export function WizardStepRenderer({ stepKey, children }: WizardStepRendererProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={motionTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
