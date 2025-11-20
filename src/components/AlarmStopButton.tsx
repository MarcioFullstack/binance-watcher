import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlarmStopButtonProps {
  isActive: boolean;
  type?: 'loss' | 'gain';
  onStop: () => void;
}

export const AlarmStopButton = ({ isActive, type, onStop }: AlarmStopButtonProps) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-20 right-6 z-50"
        >
          <Button
            onClick={onStop}
            size="lg"
            variant={type === 'loss' ? 'destructive' : 'default'}
            className="h-16 w-16 rounded-full shadow-2xl animate-pulse hover:animate-none"
          >
            <div className="flex flex-col items-center gap-1">
              <VolumeX className="h-6 w-6" />
              <span className="text-xs font-bold">PARAR</span>
            </div>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
