export interface Medicine {
  id?: string;
  name: string;
  boxQty: number;
  stripQty: number;
  minBoxQty?: number;
  price: number;
  authorUid: string;
  createdAt: string;
}

export interface Shortage {
  id?: string;
  medicineName: string;
  form?: string;
  isAvailable: boolean;
  category: 'medicine' | 'supply';
  isUrgent: boolean;
  authorUid: string;
  createdAt: string;
}

export interface Transaction {
  id?: string;
  entityName: string;
  category: 'p2p' | 'customer';
  type: 'owe_them' | 'owe_us';
  amount: number;
  description?: string;
  authorUid: string;
  createdAt: string;
}

export interface ShiftTransaction {
  id?: string;
  shiftNumber: number;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  authorUid: string;
  createdAt: string;
}

export interface Company {
  id?: string;
  name: string;
  authorUid: string;
  createdAt: string;
}

export interface InvoiceItem {
  name: string;
  form?: string;
}

export interface Invoice {
  id?: string;
  companyId: string;
  imageUrl: string | null;
  items: (string | InvoiceItem)[];
  authorUid: string;
  createdAt: string;
}

export interface DeletedItem {
  id?: string;
  originalId: string;
  collectionName: string;
  data: any;
  deletedAt: string;
  authorUid: string;
}
