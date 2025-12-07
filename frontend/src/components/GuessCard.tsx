import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFocusRing } from 'react-aria';

interface GuessCardProps {
  guess: string;
  confidence: number;
  index: number;
  isSelected?: boolean;
  onSelect?: () => void;
  tags?: string[];
  justification?: string;
}

export default function GuessCard({
  guess,
  confidence,
  index,
  isSelected = false,
  onSelect,
  tags = [],
  justification
}: GuessCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isFocusVisible, focusProps } = useFocusRing();

  const handleClick = () => {
    if (onSelect) {
      onSelect();
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-cyber-accent' : ''
      } ${isFocusVisible ? 'ring-2 ring-cyber-highlight' : ''}`}
      onClick={handleClick}
      {...focusProps}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-expanded={isExpanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={`cyber-border bg-cyber-card p-6 rounded-lg hover:bg-cyber-bg transition-colors`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-cyber-accent">#{index + 1}</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 bg-cyber-bg rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                  className="h-full bg-gradient-to-r from-cyber-accent to-cyber-secondary"
                />
              </div>
              <span className="text-sm text-cyber-text">{(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Guess text */}
        <p className="text-lg text-cyber-text leading-relaxed mb-4">{guess}</p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-cyber-bg text-cyber-accent text-xs rounded-full border border-cyber-accent/30"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Expandable justification */}
        <AnimatePresence>
          {isExpanded && justification && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-cyber-accent/20">
                <h4 className="text-sm text-cyber-accent font-semibold mb-2 uppercase tracking-wide">
                  AI Reasoning:
                </h4>
                <p className="text-sm text-cyber-text/80 leading-relaxed">{justification}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click indicator */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-cyber-text/50">
            {isExpanded ? 'Click to collapse' : 'Click to see reasoning'}
          </span>
          {isSelected && (
            <span className="text-xs text-cyber-accent font-semibold">✓ SELECTED</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Helper component for AnimatePresence
import { AnimatePresence } from 'framer-motion';
