import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AlarmBannerProps {
  isActive: boolean;
  type?: 'loss' | 'gain';
  onStop: () => void;
}

export const AlarmBanner = ({ isActive, type, onStop }: AlarmBannerProps) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl"
        >
          <Alert 
            variant={type === 'loss' ? 'destructive' : 'default'}
            className="border-2 shadow-2xl animate-pulse backdrop-blur-sm bg-opacity-95"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                {type === 'loss' ? (
                  <AlertTriangle className="h-6 w-6 animate-bounce" />
                ) : (
                  <TrendingUp className="h-6 w-6 animate-bounce" />
                )}
                <AlertDescription className="text-base font-semibold m-0">
                  {type === 'loss' 
                    ? '🚨 ALERTA DE PERDA ATIVO - Clique para parar o alarme'
                    : '🎉 ALERTA DE GANHO ATIVO - Clique para parar o som'}
                </AlertDescription>
              </div>
              <Button
                onClick={onStop}
                size="lg"
                variant={type === 'loss' ? 'destructive' : 'default'}
                className="font-bold shrink-0 hover:scale-110 transition-transform"
              >
                <X className="h-5 w-5 mr-2" />
                PARAR ALARME
              </Button>
            </div>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
