/**
 * billingUtils.js
 * Complete billing algorithm implementation
 * All calculations and logic from SocietyFlow_Billing_Algorithm.txt
 */

/**
 * Determine bill status based on payment and due date
 * @param {Object} bill - Bill object from API
 * @returns {string} - 'paid', 'overdue', or 'pending'
 */
export const getBillStatus = (bill) => {
  if (bill.paid === true) {
    return 'paid';
  }
  
  if (bill.paid === false) {
    // Check if due date has passed
    if (bill.due_date) {
      const dueDate = new Date(bill.due_date);
      const today = new Date();
      // Reset time for accurate date comparison
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      if (today > dueDate) {
        return 'overdue';
      }
    }
    return 'pending';
  }
  
  return 'unknown';
};

/**
 * Calculate late fee for an unpaid bill
 * @param {Object} bill - Bill object
 * @param {Object} billingConfig - Billing configuration with late_fee and late_fee_pct
 * @returns {number} - Late fee amount in rupees
 */
export const calculateLateFee = (bill, billingConfig = {}) => {
  // If bill is paid or no due date, no late fee
  if (bill.paid || !bill.due_date) {
    return 0;
  }
  
  const today = new Date();
  const dueDate = new Date(bill.due_date);
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  // No late fee if not yet overdue
  if (today <= dueDate) {
    return 0;
  }
  
  // Calculate based on percentage or flat fee
  const amount = parseFloat(bill.amount || 0);
  const lateFeePercent = parseFloat(billingConfig.late_fee_pct || 0);
  const lateFeeFlat = parseFloat(billingConfig.late_fee || 0);
  
  if (lateFeePercent > 0) {
    return (amount * lateFeePercent) / 100;
  }
  
  return lateFeeFlat;
};

/**
 * Calculate days overdue
 * @param {Object} bill - Bill object
 * @returns {number} - Number of days overdue (0 if not overdue)
 */
export const getDaysOverdue = (bill) => {
  if (!bill.due_date) {
    return 0;
  }
  
  const today = new Date();
  const dueDate = new Date(bill.due_date);
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = today - dueDate;
  const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysOverdue);
};

/**
 * Process bills from API with calculated fields
 * @param {Array} bills - Raw bills from API
 * @param {Object} billingConfig - Billing configuration
 * @returns {Array} - Bills with calculated status and late fee
 */
export const processBills = (bills = [], billingConfig = {}) => {
  return bills.map(bill => ({
    ...bill,
    status: getBillStatus(bill),
    lateFee: calculateLateFee(bill, billingConfig),
    daysOverdue: getDaysOverdue(bill),
    totalAmount: parseFloat(bill.amount || 0) + calculateLateFee(bill, billingConfig),
  }));
};

/**
 * Sort bills according to priority
 * Order: Overdue → Pending → Paid
 * Within each group: newest month first
 * @param {Array} bills - Processed bills with status
 * @returns {Array} - Sorted bills
 */
export const sortBills = (bills = []) => {
  const sorted = [...bills].sort((a, b) => {
    // Priority order: overdue (0), pending (1), paid (2)
    const statusPriority = {
      'overdue': 0,
      'pending': 1,
      'paid': 2,
    };
    
    const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Within same status, sort by date (newest first)
    const dateA = new Date(a.created_at || a.due_date || 0);
    const dateB = new Date(b.created_at || b.due_date || 0);
    return dateB - dateA;
  });
  
  return sorted;
};

/**
 * Filter bills by tab/status
 * @param {Array} bills - Processed bills
 * @param {string} tab - 'all', 'pending', 'paid', 'overdue'
 * @returns {Array} - Filtered bills
 */
export const filterBillsByTab = (bills = [], tab = 'all') => {
  switch (tab) {
    case 'pending':
      return bills.filter(b => b.status === 'pending' || b.status === 'overdue');
    case 'overdue':
      return bills.filter(b => b.status === 'overdue');
    case 'paid':
      return bills.filter(b => b.status === 'paid');
    case 'all':
    default:
      return bills;
  }
};

/**
 * Calculate billing summary from bills
 * @param {Array} bills - Processed bills
 * @returns {Object} - Summary with totals and counts
 */
export const calculateBillingSummary = (bills = []) => {
  const pending = bills.filter(b => b.status === 'pending' || b.status === 'overdue');
  const overdue = bills.filter(b => b.status === 'overdue');
  const paid = bills.filter(b => b.status === 'paid');
  
  const totalPending = pending.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
  const totalOverdue = overdue.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
  const totalPaid = paid.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
  const totalLateFees = bills.reduce((sum, b) => sum + (b.lateFee || 0), 0);
  
  return {
    totalPending,
    totalPaid,
    totalOverdue,
    totalLateFees,
    countPending: pending.length,
    countPaid: paid.length,
    countOverdue: overdue.length,
    countAll: bills.length,
  };
};

/**
 * Get emoji for bill type
 * @param {string} billType - Bill type from API
 * @returns {string} - Emoji character
 */
export const getBillTypeEmoji = (billType = '') => {
  const type = billType.toLowerCase();
  
  if (type.includes('maintenance')) return '🔧';
  if (type.includes('water')) return '💧';
  if (type.includes('parking')) return '🅿️';
  if (type.includes('electric')) return '⚡';
  if (type.includes('amenity') || type.includes('club')) return '🏛️';
  if (type.includes('sinking fund')) return '🏦';
  if (type.includes('festival')) return '🎉';
  if (type.includes('fine') || type.includes('penalty')) return '⚠️';
  
  return '💳';
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount) => {
  return parseFloat(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date
 */
export const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

/**
 * Check if bill is a virtual parking bill
 * @param {Object} bill - Bill object
 * @returns {boolean} - True if virtual parking bill
 */
export const isVirtualParkingBill = (bill) => {
  return bill.is_parking === true || (bill.id && bill.id.toString().startsWith('parking_'));
};

/**
 * Get status label and color for display
 * @param {string} status - Bill status
 * @returns {Object} - { label, color }
 */
export const getStatusDisplay = (status) => {
  switch (status) {
    case 'paid':
      return { label: 'Paid', color: '#10B981', icon: '✅' };
    case 'overdue':
      return { label: 'Overdue', color: '#EF4444', icon: '⚠️' };
    case 'pending':
      return { label: 'Pending', color: '#F59E0B', icon: '⏳' };
    default:
      return { label: 'Unknown', color: '#6B7280', icon: '❓' };
  }
};

/**
 * Extract parking slot number from bill type
 * e.g., "Parking — P-12" → "P-12"
 * @param {string} billType - Bill type string
 * @returns {string} - Parking slot number or empty string
 */
export const getParkingSlotNumber = (billType = '') => {
  const match = billType.match(/P-\d+/);
  return match ? match[0] : '';
};
