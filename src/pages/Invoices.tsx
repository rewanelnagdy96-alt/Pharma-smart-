import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, where, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTranslation, useAppStore } from '../lib/i18n';
import { Company, Invoice } from '../models/types';
import { Plus, ChevronLeft, ChevronRight, Building2, FileText, Camera, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Invoices() {
  const { t, isRtl } = useTranslation();
  const { searchQuery } = useAppStore();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  
  // Form State
  const [companyName, setCompanyName] = useState('');
  const [itemsList, setItemsList] = useState<{name: string, form: string}[]>([{name: '', form: ''}]);
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'companies'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setCompanies(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'companies');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    
    const q = query(
      collection(db, 'invoices'),
      where('companyId', '==', selectedCompany.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      setInvoices(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    });

    return () => unsubscribe();
  }, [selectedCompany]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    
    try {
      const company: Company = {
        name: companyName.trim(),
        authorUid: 'local-user',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'companies'), company);
      toast.success(t('save') + ' ✓');
      setShowAddCompany(false);
      setCompanyName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'companies');
      toast.error('Error adding company');
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setImage(compressed);
    } catch (error) {
      toast.error('Error processing image');
    }
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    
    const validItems = itemsList.filter(i => i.name.trim());
    
    if (!image && validItems.length === 0) {
      toast.error('Please add an image or write items');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const invoice: Invoice = {
        companyId: selectedCompany.id!,
        imageUrl: image,
        items: validItems.map(i => ({ name: i.name.trim(), form: i.form || undefined })),
        authorUid: 'local-user',
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'invoices'), invoice);
      
      // Auto-remove from shortages
      if (validItems.length > 0) {
        const shortagesSnapshot = await getDocs(
          query(collection(db, 'shortages'))
        );
        
        const batch = writeBatch(db);
        let deletedCount = 0;
        
        shortagesSnapshot.forEach(doc => {
          const shortageName = doc.data().medicineName.toLowerCase();
          if (validItems.some(item => 
            shortageName.includes(item.name.toLowerCase()) || 
            item.name.toLowerCase().includes(shortageName)
          )) {
            batch.delete(doc.ref);
            deletedCount++;
          }
        });
        
        if (deletedCount > 0) {
          await batch.commit();
          toast.success(t('autoRemoved') + ` (${deletedCount})`);
        }
      }
      
      toast.success(t('save') + ' ✓');
      setShowAddInvoice(false);
      setImage(null);
      setItemsList([{name: '', form: ''}]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invoices');
      toast.error('Error adding invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Invoices View
  if (selectedCompany) {
    return (
      <div className="space-y-4 relative min-h-[80vh]">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setSelectedCompany(null)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-soft text-[#1E293B] dark:text-slate-300 hover:bg-[#F8FAFF] transition-colors">
            {isRtl ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
          <div>
            <h2 className="text-3xl font-bold text-[#1E293B] dark:text-white">{selectedCompany.name}</h2>
            <p className="text-sm text-[#90A4CE] dark:text-slate-400 mt-1">{t('invoices')}</p>
          </div>
        </div>

        {showAddInvoice && (
          <form onSubmit={handleAddInvoice} className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-soft border-none space-y-4 mb-6">
            
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#D0E1FD] border-dashed rounded-2xl cursor-pointer bg-[#F8FAFF] dark:hover:bg-slate-800 dark:bg-slate-900 hover:bg-[#E6E6FA] dark:border-slate-600 dark:hover:border-slate-500 transition-colors overflow-hidden relative">
                {image ? (
                  <img src={image} alt="Invoice" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="w-8 h-8 mb-2 text-[#90A4CE] dark:text-slate-400" />
                    <p className="text-sm text-[#90A4CE] dark:text-slate-400 font-medium">{t('takePhoto')}</p>
                  </div>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            <div className="space-y-3">
              {itemsList.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('writeItems')}
                    value={item.name}
                    onChange={e => {
                      const updated = [...itemsList];
                      updated[index].name = e.target.value;
                      setItemsList(updated);
                    }}
                    className="flex-1 bg-[#F8FAFF] dark:bg-slate-900 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[#D0E1FD] outline-none dark:text-white transition-colors shadow-inner"
                  />
                  <select
                    value={item.form}
                    onChange={(e) => {
                      const updated = [...itemsList];
                      updated[index].form = e.target.value;
                      setItemsList(updated);
                    }}
                    className="w-1/3 bg-[#F8FAFF] dark:bg-slate-900 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[#D0E1FD] outline-none dark:text-white transition-colors shadow-inner"
                  >
                    <option value="">{t('form')}</option>
                    <option value="tablets">{t('tablets')}</option>
                    <option value="syrup">{t('syrup')}</option>
                    <option value="capsules">{t('capsules')}</option>
                    <option value="injection">{t('injection')}</option>
                    <option value="drops">{t('drops')}</option>
                    <option value="cream">{t('cream')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItemsList([...itemsList, {name: '', form: ''}])} className="text-[#90A4CE] hover:text-[#1E293B] dark:text-emerald-400 text-sm font-medium flex items-center gap-1 mt-2 transition-colors">
              <Plus size={16} /> {t('addAnotherItem')}
            </button>
            
            {itemsList.some(i => i.name.trim()) && (
              <p className="text-xs text-[#D0E1FD] dark:text-emerald-400 font-medium">
                {t('autoRemoved')}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAddInvoice(false)} className="px-5 py-3 text-[#90A4CE] dark:text-slate-400 font-medium hover:bg-[#F8FAFF] dark:hover:bg-slate-700 rounded-xl transition-colors">{t('cancel')}</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-[#1E293B] hover:bg-slate-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50">{t('add')}</button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {invoices.map(invoice => (
            <div key={invoice.id} className="bg-white dark:bg-slate-800 p-5 rounded-[24px] shadow-soft border-none">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-[#90A4CE] dark:text-slate-400">
                  <FileText size={20} />
                  <span className="text-sm font-medium">{new Date(invoice.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {invoice.imageUrl && (
                <div className="mb-4 rounded-2xl overflow-hidden border-none shadow-sm">
                  <img src={invoice.imageUrl} alt="Invoice" className="w-full h-48 object-cover" />
                </div>
              )}
              
              {invoice.items.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#90A4CE] dark:text-slate-400 mb-3 uppercase tracking-wider">{t('itemsReceived')}</p>
                  <div className="flex flex-wrap gap-2">
                    {invoice.items.map((item: any, idx) => (
                      <span key={idx} className="bg-[#F8FAFF] dark:bg-emerald-900/30 text-[#1E293B] dark:text-emerald-400 text-xs px-3 py-1.5 rounded-xl font-medium shadow-inner">
                        {typeof item === 'string' ? item : (
                          <>
                            {item.name}
                            {item.form && <span className="opacity-75 ml-1">({t(item.form as any)})</span>}
                          </>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {invoices.length === 0 && (
            <div className="text-center text-[#90A4CE] dark:text-slate-400 py-12 bg-white dark:bg-slate-800 rounded-[24px] shadow-soft border-none">
              {t('noInvoices')}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAddInvoice(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#D0E1FD] hover:bg-[#B0C4DE] text-[#1E293B] rounded-2xl shadow-soft flex items-center justify-center transition-transform active:scale-95 z-10"
        >
          <Plus size={28} />
        </button>
      </div>
    );
  }

  // Companies View
  return (
    <div className="space-y-4 relative min-h-[80vh]">
      <h2 className="text-3xl font-bold text-[#1E293B] dark:text-white mb-6">{t('invoices')}</h2>

      {showAddCompany && (
        <form onSubmit={handleAddCompany} className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-soft border-none space-y-4 mb-6">
          <input
            type="text" placeholder={t('companyName')} value={companyName} onChange={e => setCompanyName(e.target.value)}
            className="w-full bg-[#F8FAFF] dark:bg-slate-900 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[#D0E1FD] outline-none dark:text-white transition-colors shadow-inner" required
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddCompany(false)} className="px-5 py-3 text-[#90A4CE] dark:text-slate-400 font-medium hover:bg-[#F8FAFF] dark:hover:bg-slate-700 rounded-xl transition-colors">{t('cancel')}</button>
            <button type="submit" className="px-6 py-3 bg-[#1E293B] hover:bg-slate-800 text-white font-medium rounded-xl transition-colors">{t('add')}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4">
        {filteredCompanies.map(company => (
          <div 
            key={company.id} 
            onClick={() => setSelectedCompany(company)}
            className="bg-white dark:bg-slate-800 p-5 rounded-[24px] shadow-soft border-none flex flex-col items-center justify-center gap-4 cursor-pointer hover:shadow-md transition-all text-center h-36"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#F8FAFF] dark:bg-slate-700 text-[#1E293B] dark:text-slate-300 flex items-center justify-center shadow-inner">
              <Building2 size={28} />
            </div>
            <h3 className="font-semibold text-[#1E293B] dark:text-white line-clamp-2">{company.name}</h3>
          </div>
        ))}
      </div>
      
      {filteredCompanies.length === 0 && (
        <div className="text-center text-[#90A4CE] dark:text-slate-400 py-12 bg-white dark:bg-slate-800 rounded-[24px] shadow-soft border-none">
          {t('noCompanies')}
        </div>
      )}

      <button
        onClick={() => setShowAddCompany(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#D0E1FD] hover:bg-[#B0C4DE] text-[#1E293B] rounded-2xl shadow-soft flex items-center justify-center transition-transform active:scale-95 z-10"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
