import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation, useAppStore } from '../lib/i18n';
import { Activity, AlertCircle, TrendingUp, Plus } from 'lucide-react';
import { Shortage } from '../models/types';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { t } = useTranslation();
  const { searchQuery } = useAppStore();
  const [shortagesCount, setShortagesCount] = useState(0);
  const [dailySales, setDailySales] = useState(0);
  const [newShortage, setNewShortage] = useState('');
  const [category, setCategory] = useState<'medicine' | 'supply'>('medicine');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Shortages query
    const qShortages = query(
      collection(db, 'shortages'),
      where('isAvailable', '==', false)
    );
    
    const unsubscribeShortages = onSnapshot(qShortages, (snapshot) => {
      setShortagesCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shortages');
    });

    // Daily Sales query
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const qSales = query(
      collection(db, 'shiftTransactions'),
      where('createdAt', '>=', today.toISOString())
    );

    const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if ((data.type || 'income') === 'income') {
          total += data.amount;
        }
      });
      setDailySales(total);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shiftTransactions');
    });

    return () => {
      unsubscribeShortages();
      unsubscribeSales();
    };
  }, []);

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortage.trim()) return;
    
    setIsSubmitting(true);
    try {
      const shortage: Shortage = {
        medicineName: newShortage.trim(),
        isAvailable: false,
        category: category,
        isUrgent: false,
        authorUid: 'local-user',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'shortages'), shortage);
      setNewShortage('');
      toast.success(t('save') + ' ✓');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shortages');
      toast.error('Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('welcome')}</h2>
          <p className="text-slate-500 dark:text-slate-400">{t('pharmacist')}</p>
        </div>
        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Activity size={24} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <TrendingUp size={20} />
            <span className="font-medium text-sm">{t('totalSales')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{dailySales.toLocaleString()} <span className="text-sm text-slate-500">{t('currency')}</span></p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 mb-2">
            <AlertCircle size={20} />
            <span className="font-medium text-sm">{t('shortageAlerts')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{shortagesCount}</p>
        </div>
      </div>

      {/* Quick Shortage Log */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="font-semibold text-slate-800 dark:text-white mb-4">{t('addShortage')}</h3>
        <form onSubmit={handleQuickLog} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newShortage}
              onChange={(e) => setNewShortage(e.target.value)}
              placeholder={t('medicineName')}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newShortage.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Plus size={24} />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCategory('medicine')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${category === 'medicine' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'}`}
            >
              {t('medicines')}
            </button>
            <button
              type="button"
              onClick={() => setCategory('supply')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${category === 'supply' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'}`}
            >
              {t('supplies')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
