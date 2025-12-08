import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TwistRevealProps {
  twistText: string;
  onComplete?: () => void;
  revealSpeed?: number;
}

export default function TwistReveal({ twistText, onComplete, revealSpeed = 50 }: TwistRevealProps) {
  const [stage, setStage] = useState<'blurred' | 'typewriter' | 'revealed'>('blurred');
  const [displayedText, setDisplayedText] = useState('');
  const [skipped, setSkipped] = useState(false);
  // Lightweight focus-visible fallback to avoid relying on react-aria types
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const focusProps = {
    onFocus: () => setIsFocusVisible(true),
    onBlur: () => setIsFocusVisible(false)
  };

  const skip = useCallback(() => {
    setSkipped(true);
    setStage('revealed');
    setDisplayedText(twistText);
    if (onComplete) {
      setTimeout(onComplete, 100);
    }
  }, [twistText, onComplete]);

  // Handle keyboard skip
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        skip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [skip]);

  // Stage progression
  useEffect(() => {
    if (skipped) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Blurred -> Typewriter
    if (stage === 'blurred') {
      timers.push(setTimeout(() => setStage('typewriter'), 1500));
    }

    // Typewriter effect
    if (stage === 'typewriter') {
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex <= twistText.length) {
          setDisplayedText(twistText.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setStage('revealed');
          if (onComplete) {
            setTimeout(onComplete, 500);
          }
        }
      }, revealSpeed);
      timers.push(typeInterval);
    }

    return () => timers.forEach(t => clearTimeout(t));
  }, [stage, twistText, revealSpeed, onComplete, skipped]);

  return (
    <div
      className="relative min-h-[200px] flex items-center justify-center"
      role="region"
      aria-label="Plot twist reveal"
      {...focusProps}
      tabIndex={0}
    >
      <AnimatePresence mode="wait">
        {stage === 'blurred' && (
          <motion.div
            key="blurred"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, filter: 'blur(20px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <p className="text-2xl text-cyber-text px-8 text-center select-none">
              {twistText}
            </p>
          </motion.div>
        )}

        {stage === 'typewriter' && (
          <motion.div
            key="typewriter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <p className="text-3xl text-cyber-accent font-bold px-8 text-center font-mono" aria-live="polite">
              {displayedText}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-1 h-8 bg-cyber-accent ml-1"
              />
            </p>
          </motion.div>
        )}

        {stage === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff'
            }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-cyber-card cyber-border rounded-lg p-8 max-w-2xl">
              <h3 className="text-sm text-cyber-accent mb-4 uppercase tracking-wider">
                The Twist:
              </h3>
              <p className="text-2xl text-cyber-text leading-relaxed">
                {twistText}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button */}
      {stage !== 'revealed' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          whileHover={{ opacity: 1, scale: 1.05 }}
          onClick={skip}
          type="button"
          className={`absolute bottom-4 right-4 px-4 py-2 cyber-border bg-cyber-bg text-cyber-accent rounded text-sm ${
            isFocusVisible ? 'ring-2 ring-cyber-accent' : ''
          }`}
          aria-label="Skip animation (Space/Enter)"
        >
          Skip (Space/Enter)
        </motion.button>
      )}
    </div>
  );
}
