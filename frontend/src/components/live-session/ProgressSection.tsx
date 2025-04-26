import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ProgressSection = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-card rounded-xl shadow-md p-4 flex flex-col bg-scholarly-navy h-1/4"
    >
      <h3 className="text-lg font-medium mb-3 text-scholarly-gold">Progress</h3>
      
      <div className="flex-1 overflow-y-auto bg-scholarly-charcoal/50 border-scholarly-gold/40 rounded-lg p-4">
        <div className="text-sm text-scholarly-parchment">
          {/* Progress content will go here */}
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressSection; 