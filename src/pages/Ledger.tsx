import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, where, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation, useAppStore } from '../lib/i18n';
import { Transaction } from '../models/types';
import { Plus, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { convertArabicToEnglishNumbers } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function Ledger() {
  const { t, isRtl } = useTranslation();
  const { searchQuery } = useAppStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'p2p' | 'customer'>('customer');
  
  // Details View State
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  
  // Form state
  const [entityName, setEntityName] = useState('');
  const [newTransactions, setNewTransactions] = useState([{ amount: '', type: 'owe_us' as 'owe_us' | 'owe_them', description: '' }]);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEntity = selectedEntity || entityName;
    if (!targetEntity) return;
    
    // Determine category: if selectedEntity exists, use its category, otherwise use activeTab
    let targetCategory = activeTab;
    if (selectedEntity) {
      const existingEntity = groupedEntities.find(g => g.name === selectedEntity);
      if (existingEntity) {
        targetCategory = existingEntity.category as 'p2p' | 'customer';
      }
    }
    
    const validTransactions = newTransactions.filter(t => t.amount && Number(convertArabicToEnglishNumbers(t.amount)) > 0);
    if (validTransactions.length === 0) return;

    try {
      const batch = writeBatch(db);
      validTransactions.forEach(trxData => {
        const trx: Transaction = {
          entityName: targetEntity,
          category: targetCategory,
          type: trxData.type,
          amount: Number(convertArabicToEnglishNumbers(trxData.amount)),
          description: trxData.description,
          authorUid: auth.currentUser?.uid || 'local-user',
          createdAt: new Date().toISOString()
        };
        const docRef = doc(collection(db, 'transactions'));
        batch.set(docRef, trx);
      });
      
      await batch.commit();
      toast.success(t('save'));
      setShowAdd(false);
      setEntityName(''); 
      setNewTransactions([{ amount: '', type: 'owe_us', description: '' }]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
      toast.error('Error adding transaction');
    }
  };

  const handleCancel = () => {
    setShowAdd(false);
    setNewTransactions([{ amount: '', type: 'owe_us', description: '' }]);
  };

  // Group transactions by entity
  const groupedEntities = useMemo(() => {
    // If searching, search across all categories. Otherwise, filter by active tab.
    const filtered = transactions.filter(trx => searchQuery ? true : trx.category === activeTab);
    const groups: Record<string, { name: string, balance: number, transactions: Transaction[], category: string }> = {};
    
    filtered.forEach(trx => {
      if (!groups[trx.entityName]) {
        groups[trx.entityName] = { name: trx.entityName, balance: 0, transactions: [], category: trx.category };
      }
      groups[trx.entityName].transactions.push(trx);
      // owe_us means they owe us (positive balance for us)
      // owe_them means we owe them (negative balance for us)
      groups[trx.entityName].balance += (trx.type === 'owe_us' ? trx.amount : -trx.amount);
    });
    
    return Object.values(groups).filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [transactions, activeTab, searchQuery]);

  // Details View
  if (selectedEntity) {
    const entityData = groupedEntities.find(g => g.name === selectedEntity) || { name: selectedEntity, balance: 0, transactions: [], category: activeTab };
    
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4 relative min-h-[80vh]"
      >
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedEntity(null)} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-600 dark:text-slate-300">
            {isRtl ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{entityData.name}</h2>
            <p className={`text-sm font-bold ${entityData.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {t('balance')}: {entityData.balance >= 0 ? '+' : '-'}{Math.abs(entityData.balance).toFixed(2)} {t('currency')}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAdd} 
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 space-y-4 mb-6 overflow-hidden"
            >
              <div className="space-y-3">
                {newTransactions.map((trx, index) => (
                  <div key={index} className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex gap-2">
                      <input
                        type="text" inputMode="decimal" placeholder={t('amount')} value={trx.amount} onChange={e => {
                          const updated = [...newTransactions];
                          updated[index].amount = e.target.value;
                          setNewTransactions(updated);
                        }}
                        autoFocus={index === 0}
                        className="w-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" required={index === 0}
                      />
                      <select
                        value={trx.type} onChange={e => {
                          const updated = [...newTransactions];
                          updated[index].type = e.target.value as any;
                          setNewTransactions(updated);
                        }}
                        className="w-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
                      >
                        <option value="owe_us">{t('addDebt')}</option>
                        <option value="owe_them">{t('payDebt')}</option>
                      </select>
                    </div>
                    <input
                      type="text" placeholder={t('itemsTaken')} value={trx.description} onChange={e => {
                        const updated = [...newTransactions];
                        updated[index].description = e.target.value;
                        setNewTransactions(updated);
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
                    />
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setNewTransactions([...newTransactions, { amount: '', type: 'owe_us', description: '' }])} className="text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-1 mt-2">
                <Plus size={16} /> {t('addAnotherItem')}
              </button>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={handleCancel} className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-medium">{t('cancel')}</button>
                <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors">{t('add')}</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          <AnimatePresence>
            {entityData.transactions.map(trx => (
              <motion.div 
                key={trx.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${trx.type === 'owe_us' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                    {trx.type === 'owe_us' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{trx.description || t('description')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(trx.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className={`font-bold ${trx.type === 'owe_us' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {trx.type === 'owe_us' ? '+' : '-'}{trx.amount.toFixed(2)} {t('currency')}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {entityData.transactions.length === 0 && (
            <div className="text-center text-slate-500 dark:text-slate-400 py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              No transactions found.
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 z-10"
        >
          <Plus size={28} />
        </button>
      </motion.div>
    );
  }

  // Main Grouped View
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 relative min-h-[80vh]"
    >
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">{t('ledger')}</h2>

      {/* Tabs */}
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('p2p')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'p2p' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
        >
          {t('p2p')}
        </button>
        <button
          onClick={() => setActiveTab('customer')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'customer' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
        >
          {t('customers')}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd} 
            className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 space-y-3 mb-6 overflow-hidden"
          >
            <input
              type="text" placeholder={activeTab === 'p2p' ? t('pharmacyName') : t('customers')} value={entityName} onChange={e => setEntityName(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" required
            />
            <div className="space-y-3">
              {newTransactions.map((trx, index) => (
                <div key={index} className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex gap-2">
                    <input
                      type="text" inputMode="decimal" placeholder={t('amount')} value={trx.amount} onChange={e => {
                        const updated = [...newTransactions];
                        updated[index].amount = e.target.value;
                        setNewTransactions(updated);
                      }}
                      className="w-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors" required={index === 0}
                    />
                    <select
                      value={trx.type} onChange={e => {
                        const updated = [...newTransactions];
                        updated[index].type = e.target.value as any;
                        setNewTransactions(updated);
                      }}
                      className="w-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
                    >
                      <option value="owe_us">{t('theyOweUs')}</option>
                      <option value="owe_them">{t('weOweThem')}</option>
                    </select>
                  </div>
                  <input
                    type="text" placeholder={t('itemsTaken')} value={trx.description} onChange={e => {
                      const updated = [...newTransactions];
                      updated[index].description = e.target.value;
                      setNewTransactions(updated);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
                  />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setNewTransactions([...newTransactions, { amount: '', type: 'owe_us', description: '' }])} className="text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-1 mt-2">
              <Plus size={16} /> {t('addAnotherItem')}
            </button>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={handleCancel} className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-medium">{t('cancel')}</button>
              <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors">{t('add')}</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <AnimatePresence>
          {groupedEntities.map(group => (
            <motion.div 
              key={group.name} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors" onClick={() => setSelectedEntity(group.name)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">{group.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{group.transactions.length} transactions</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`font-bold ${group.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {group.balance >= 0 ? '+' : '-'}{Math.abs(group.balance).toFixed(2)} {t('currency')}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setSelectedEntity(group.name); }} className="text-slate-400 hover:text-emerald-500 transition-colors p-2">
                  <Edit2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {groupedEntities.length === 0 && (
          <div className="text-center text-slate-500 dark:text-slate-400 py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            No entities found.
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 z-10"
      >
        <Plus size={28} />
      </button>
    </motion.div>
  );
}
