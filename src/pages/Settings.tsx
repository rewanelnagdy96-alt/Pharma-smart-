import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation } from '../lib/i18n';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Lock, KeyRound, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { t, isRtl } = useTranslation();
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actualPin, setActualPin] = useState('1234');

  useEffect(() => {
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
  }, []);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentPinInput !== actualPin) {
      toast.error(t('incorrectPin') || 'الرمز الحالي غير صحيح');
      return;
    }
    
    if (newPin.length !== 4) {
      toast.error('الرمز الجديد يجب أن يكون 4 أرقام');
      return;
    }
    
    if (newPin !== confirmNewPin) {
      toast.error('الرمز الجديد غير متطابق');
      return;
    }

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), { managerPin: newPin }, { merge: true });
      setActualPin(newPin);
      setCurrentPinInput('');
      setNewPin('');
      setConfirmNewPin('');
      toast.success(t('save') || 'تم الحفظ بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300">
          <SettingsIcon size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">الإعدادات</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">تغيير الرمز السري للمدير</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">الرمز السري الافتراضي هو 1234</p>
          </div>
        </div>

        <form onSubmit={handleChangePin} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الرمز السري الحالي</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={currentPinInput}
              onChange={(e) => setCurrentPinInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الرمز السري الجديد (4 أرقام)</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تأكيد الرمز السري الجديد</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={confirmNewPin}
              onChange={(e) => setConfirmNewPin(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !currentPinInput || newPin.length !== 4 || !confirmNewPin}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mt-6"
          >
            <Save size={20} />
            حفظ الرمز الجديد
          </button>
        </form>
      </div>
    </motion.div>
  );
}
