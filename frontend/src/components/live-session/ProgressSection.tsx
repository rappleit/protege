import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ProgressSection = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-card rounded-xl shadow-md p-4 flex flex-col bg-gray-800"
    >
      <h3 className="text-lg font-medium mb-3 text-scholarly-gold">Progress</h3>
      
      <div className="flex-1 overflow-y-auto bg-muted/30 rounded-lg p-4 min-h-[150px]">
        <div className="text-sm text-gray-300">
          {/* Progress content will go here */}
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressSection; 