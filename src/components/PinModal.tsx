import React, { useState, useEffect } from 'react';
import { useTranslation, useAppStore } from '../lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PinModal({ isOpen, onClose }: PinModalProps) {
  const { t } = useTranslation();
  const { setManagerUnlocked } = useAppStore();
  const [pin, setPin] = useState('');
  const [actualPin, setActualPin] = useState('1234');

  useEffect(() => {
    if (isOpen) {
      const fetchPin = async () => {
        try {
          const docRef = doc(db, 'settings', 'global');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().managerPin) {
            setActualPin(docSnap.data().managerPin);
          }
        } catch (error) {
          console.error("Error fetching PIN:", error);
        }
      };
      fetchPin();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === actualPin) {
      setManagerUnlocked(true);
      setPin('');
      onClose();
      toast.success(t('unlock') + ' ✓');
    } else {
      toast.error(t('incorrectPin'));
      setPin('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center mb-6 mt-2">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <Lock size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('enterPin')}</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={t('pinPlaceholder')}
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
              />
              <button 
                type="submit" 
                disabled={pin.length < 4}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                {t('unlock')}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
