import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Tab = 'transcript' | 'progress';

const SessionInfoTabs = () => {
  const [activeTab, setActiveTab] = useState<Tab>('transcript');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-card rounded-xl shadow-md p-4 flex flex-col mt-4"
    >
      <div className="flex border-b border-gray-700 mb-4">
        <button
          onClick={() => setActiveTab('transcript')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'transcript' 
              ? 'text-scholarly-gold border-b-2 border-scholarly-gold' 
              : 'text-gray-400 hover:text-gray-300'
          )}
        >
          Transcript
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'progress' 
              ? 'text-scholarly-gold border-b-2 border-scholarly-gold' 
              : 'text-gray-400 hover:text-gray-300'
          )}
        >
          Progress
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-muted/30 rounded-lg p-4 min-h-[150px]">
        {activeTab === 'transcript' ? (
          <div className="text-sm text-gray-300">
            {/* Transcript content will go here */}
          </div>
        ) : (
          <div className="text-sm text-gray-300">
            {/* Progress content will go here */}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SessionInfoTabs; 