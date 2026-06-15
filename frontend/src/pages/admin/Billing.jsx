import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { FileText, CreditCard, Download, Search, CheckCircle, RefreshCcw, DollarSign, Wallet, ArrowRightLeft, Printer, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import Accounting from './Accounting';
import { triggerAutomationRules } from '../../lib/emailService';

const AdminBilling = () => {
  const { hasAccess } = useAuth();
  const [activeTab, setActiveTab] = useState('invoices'); // invoices or accounting
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, pendingReceivables: 0, taxCollected: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [pendingServicePayments, setPendingServicePayments] = useState([]);
  const [pendingCheckoutPayments, setPendingCheckoutPayments] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [printType, setPrintType] = useState('a4'); // a4 or thermal
  const [contactInfo, setContactInfo] = useState({
    address: 'Plot 572 Iduwa Ogenyi Street Mabushi, Off Ahmadu Bello Way, Abuja',
    phone: '08033214684, 08062332639, 08171278657',
    email: 'info@sparklesapartments.ng',
    logo: ''
  });

  // Modals
  const [activePaymentModal, setActivePaymentModal] = useState(null); // stores invoice obj
  const [activeRefundModal, setActiveRefundModal] = useState(null);
  const [activeInvoiceModal, setActiveInvoiceModal] = useState(null); // stores invoice obj for viewing/printing

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [isProcessing, setIsProcessing] = useState(false);
  useEffect(() => {
    fetchInvoices();
    fetchContactSettings();

    const channel = supabase
      .channel(`billing-realtime-${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchInvoices();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchInvoices();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_services' }, () => {
        fetchInvoices();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchInvoices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchContactSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['contact_address', 'contact_phone', 'contact_email', 'contact_logo']);
        
      if (!error && data) {
        const settingsMap = data.reduce((acc, curr) => {
          acc[curr.setting_key] = curr.setting_value;
          return acc;
        }, {});
        
        setContactInfo(prev => ({
          address: settingsMap.contact_address || prev.address,
          phone: settingsMap.contact_phone || prev.phone,
          email: settingsMap.contact_email || prev.email,
          logo: settingsMap.contact_logo || prev.logo
        }));
      }
    } catch (e) {
      console.error("Failed to load contact settings:", e);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          bookings (
            id,
            status,
            id_verified,
            crm_guest_id,
            guest_email,
            booking_reference,
            guest_name,
            check_in_date,
            check_out_date,
            total_room_price_ngn,
            total_extras_price_ngn,
            discount_amount_ngn,
            profiles (first_name, last_name, phone),
            rooms (name, room_number),
            booking_services (
              id,
              quantity,
              total_price_ngn,
              unit_price_ngn,
              payment_status,
              status,
              services (name, tax_inclusive)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const { data: bookingsData } = await supabase.from('bookings').select('amount_paid_ngn');

      setInvoices(data || []);

      // Fetch pending stay enhancements awaiting payment confirmation
      try {
        const { data: servicesRes } = await supabase
          .from('booking_services')
          .select('*, bookings(id, crm_guest_id, booking_reference, guest_name, guest_email, guest_phone, amount_paid_ngn, status), services(name, base_price_ngn, tax_inclusive)')
          .eq('payment_status', 'awaiting_confirmation')
          .eq('status', 'pending');
        if (servicesRes) {
          const activeServices = servicesRes.filter(s => s.bookings?.status !== 'cancelled');
          setPendingServicePayments(activeServices);
        }
      } catch (srvErr) {
        console.warn("Failed to fetch pending service payments:", srvErr);
      }

      // Fetch pending checkout payments
      try {
        const { data: checkoutRes } = await supabase
          .from('payments')
          .select('*, bookings(id, booking_reference, guest_name, guest_email, guest_phone, amount_paid_ngn, total_amount_ngn, status, rooms(room_number))')
          .eq('status', 'pending');
        if (checkoutRes) {
          const activeCheckoutPayments = checkoutRes.filter(p => p.bookings?.status !== 'cancelled');
          setPendingCheckoutPayments(activeCheckoutPayments);
        }
      } catch (chkErr) {
        console.warn("Failed to fetch pending checkout payments:", chkErr);
      }

      // Calculate Stats
      let revenue = 0;
      let pending = 0;
      let tax = 0;

      // Calculate Total Revenue using bookings (to match Dashboard exactly)
      if (bookingsData) {
        revenue = bookingsData.reduce((sum, b) => sum + Number(b.amount_paid_ngn || 0), 0);
      }

      data?.forEach(inv => {
        if (inv.bookings?.status === 'cancelled') return;
        
        if (Number(inv.total_amount) > 0) {
          tax += (Number(inv.amount_paid || 0) / Number(inv.total_amount)) * Number(inv.tax_amount || 0);
        }
        if (inv.status !== 'paid' && inv.status !== 'cancelled') {
          pending += (Number(inv.total_amount || 0) - Number(inv.amount_paid || 0));
        }
      });

      setStats({ totalRevenue: revenue, pendingReceivables: pending, taxCollected: tax });
    } catch (error) {
      console.error("Billing Fetch Error:", error);
      setFetchError(error.message || JSON.stringify(error));
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmServicePayment = async (req, method = 'bank_transfer') => {
    const toastId = toast.loading('Confirming stay enhancement payment...');
    try {
      const isTaxable = req.services?.tax_inclusive !== false;
      const baseAmount = Number(req.total_price_ngn || 0);
      const taxAmount = isTaxable ? baseAmount * 0.075 : 0;
      const amount = baseAmount + taxAmount;

      let guestProfile = null;
      if (method === 'ar') {
        const crmGuestId = req.bookings?.crm_guest_id;
        const guestEmail = req.bookings?.guest_email;

        if (!crmGuestId && !guestEmail) {
          toast.error("Cannot resolve CRM guest account. AR charge failed.", { id: toastId });
          return;
        }

        if (crmGuestId) {
          const { data } = await supabase.from('crm_guests').select('*').eq('id', crmGuestId).maybeSingle();
          guestProfile = data;
        } else if (guestEmail) {
          const { data } = await supabase.from('crm_guests').select('*').eq('email', guestEmail.toLowerCase()).maybeSingle();
          guestProfile = data;
        }

        if (!guestProfile) {
          toast.error("CRM Guest Profile not found. Cannot charge to AR.", { id: toastId });
          return;
        }

        const currentWalletBalance = Number(guestProfile.wallet_balance || 0);
        if (currentWalletBalance < amount) {
          toast.error(`Insufficient AR wallet balance. Available: ₦${currentWalletBalance.toLocaleString()}`, { id: toastId });
          return;
        }

        // Deduct balance
        const newWalletBalance = currentWalletBalance - amount;
        const { error: walletErr } = await supabase
          .from('crm_guests')
          .update({ wallet_balance: newWalletBalance })
          .eq('id', guestProfile.id);

        if (walletErr) throw walletErr;

        // Upsert ar_accounts
        let arAccountsList = [];
        try {
          const { data } = await supabase.from('ar_accounts').select('*');
          if (data) arAccountsList = data;
        } catch {}

        const existingAr = arAccountsList.find(a => a.guest_id === guestProfile.id);
        const updatedArRecord = {
          id: existingAr ? existingAr.id : `ar_` + Math.random().toString(36).substring(2, 9).toUpperCase(),
          guest_id: guestProfile.id,
          guest_name: `${guestProfile.first_name || ''} ${guestProfile.last_name || ''}`.trim() || guestProfile.guest_name || 'Unnamed Guest',
          guest_email: guestProfile.email || 'N/A',
          balance: newWalletBalance,
          status: 'active',
          created_at: existingAr ? existingAr.created_at : new Date().toISOString()
        };

        try {
          await supabase.from('ar_accounts').upsert([updatedArRecord]);
        } catch (err) {
          console.warn("ar_accounts upsert fallback", err);
        }
      }

      // 1. Update booking_services payment status to paid
      const { error: servErr } = await supabase
        .from('booking_services')
        .update({ 
          payment_status: 'paid'
        })
        .eq('id', req.id);

      if (servErr) throw servErr;

      // 2. Fetch the corresponding booking's current amount_paid_ngn
      const { data: booking, error: bookErr } = await supabase
        .from('bookings')
        .select('amount_paid_ngn')
        .eq('id', req.booking_id)
        .single();
      
      if (bookErr) throw bookErr;
      const currentPaid = Number(booking.amount_paid_ngn || 0);
      const newPaid = currentPaid + amount;

      // Determine notes
      let paymentNotes = '';
      if (method === 'ar' && guestProfile) {
        paymentNotes = `AR Prepayment Wallet deduction for service: ${req.services?.name || 'Enhancement'} (Ref: ${req.id}) for guest: ${guestProfile.first_name} ${guestProfile.last_name} (${guestProfile.email || 'N/A'})`;
      } else {
        paymentNotes = `Service payment confirmed by finance: ${req.services?.name || 'Enhancement'} (Ref: ${req.id}) for guest: ${req.bookings?.guest_name || 'Confirmed Guest'}`;
      }

      // 3. Record Payment inflow in payments table so it reflects in Accounting
      const { error: payErr } = await supabase
        .from('payments')
        .insert([{
          booking_id: req.booking_id,
          amount: amount,
          method: method === 'ar' ? 'cash' : method,
          status: 'completed',
          notes: paymentNotes,
          transaction_ref: method === 'ar' ? `MOCK-AR-${Date.now()}` : `OFFLINE-CONF-${Date.now()}`
        }]);

      if (payErr) throw payErr;

      // 4. Update booking paid amount in bookings table
      // (This will also update the invoice amount_paid via database triggers!)
      const { error: bUpdateErr } = await supabase
        .from('bookings')
        .update({
          amount_paid_ngn: newPaid
        })
        .eq('id', req.booking_id);

      if (bUpdateErr) throw bUpdateErr;

      toast.success(`Payment of ₦${amount.toLocaleString()} confirmed successfully!`, { id: toastId });
      
      // Refresh billing data
      fetchInvoices();
    } catch (err) {
      toast.error('Failed to confirm service payment', { id: toastId });
      console.error(err);
    }
  };

  const handleConfirmPendingPayment = async (payment) => {
    const toastId = toast.loading('Confirming pending checkout payment...');
    try {
      // 1. Update the payment record status to 'completed'
      const { error: payErr } = await supabase
        .from('payments')
        .update({ status: 'completed' })
        .eq('id', payment.id);

      if (payErr) throw payErr;

      // 2. Fetch the corresponding booking's current amount_paid_ngn and total_amount_ngn
      const { data: booking, error: bookErr } = await supabase
        .from('bookings')
        .select('amount_paid_ngn, total_amount_ngn')
        .eq('id', payment.booking_id)
        .single();
      
      if (bookErr) throw bookErr;

      const currentPaid = Number(booking.amount_paid_ngn || 0);
      const paymentAmount = Number(payment.amount || 0);
      const newPaid = currentPaid + paymentAmount;
      const totalAmount = Number(booking.total_amount_ngn || 0);

      // 3. Update the booking's amount_paid_ngn
      const { error: bUpdateErr } = await supabase
        .from('bookings')
        .update({
          amount_paid_ngn: newPaid
        })
        .eq('id', payment.booking_id);

      if (bUpdateErr) throw bUpdateErr;

      // 4. If booking is now fully paid, mark all booking services as paid
      if (newPaid >= totalAmount) {
        await supabase
          .from('booking_services')
          .update({ payment_status: 'paid' })
          .eq('booking_id', payment.booking_id);
      }

      toast.success(`✓ Payment of ₦${paymentAmount.toLocaleString()} confirmed successfully!`, { id: toastId });
      fetchInvoices();
    } catch (err) {
      toast.error(`Failed to confirm checkout payment: ${err.message || 'Error occurred'}`, { id: toastId });
      console.error(err);
    }
  };

  const handleConfirmBookingPayment = async (bookingId) => {
    const toastId = toast.loading('Confirming payment with finance...');
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          id_verified: true,
          status: 'confirmed'
        })
        .eq('id', bookingId);
      
      if (error) throw error;

      try {
        await supabase
          .from('booking_services')
          .update({ status: 'confirmed' })
          .eq('booking_id', bookingId);
      } catch (srvErr) {
        console.warn("Failed to auto-confirm booking services:", srvErr);
      }
      
      toast.success('Payment successfully confirmed by finance!', { id: toastId });

      // Trigger confirmation, receipt, and invoice emails
      try {
        const { data: bData } = await supabase
          .from('bookings')
          .select('*, profiles(*), rooms(*)')
          .eq('id', bookingId)
          .single();
        if (bData) {
          triggerAutomationRules('booking_confirmed', bData);
          triggerAutomationRules('payment_received', {
            ...bData,
            payment_amount: bData.amount_paid_ngn || bData.total_amount_ngn || '0.00',
            payment_method: bData.payment_method || 'Bank Transfer',
            payment_ref: bData.payment_reference || 'N/A'
          });
          triggerAutomationRules('invoice_issued', bData);
        }
      } catch (autoErr) {
        console.warn("Automations triggered after confirming payment failed:", autoErr);
      }

      fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error('Failed to confirm payment: ' + err.message, { id: toastId });
    }
  };

  const handleCancelBookingPayment = async (invoiceId, bookingId) => {
    if (!window.confirm("Are you sure you want to cancel / decline this booking due to failed payment?")) return;
    
    const toastId = toast.loading('Cancelling booking and invoice...');
    try {
      // 1. Update booking status to cancelled
      const { error: bookingErr } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      if (bookingErr) throw bookingErr;

      // 2. Update invoice status to cancelled
      const { error: invoiceErr } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoiceId);
      if (invoiceErr) throw invoiceErr;

      // 3. Update booking services status to cancelled
      try {
        await supabase
          .from('booking_services')
          .update({ status: 'cancelled' })
          .eq('booking_id', bookingId);
      } catch (srvErr) {
        console.warn("Failed to cancel booking services:", srvErr);
      }

      // 4. Update payments status to cancelled (if any exist)
      try {
        await supabase
          .from('payments')
          .update({ status: 'cancelled' })
          .eq('booking_id', bookingId);
      } catch (payErr) {
        console.warn("Failed to cancel payments:", payErr);
      }

      toast.success('Booking and invoice successfully cancelled due to failed payment!', { id: toastId });

      // Trigger cancellation automation
      try {
        const { data: bData } = await supabase
          .from('bookings')
          .select('*, profiles(*), rooms(*)')
          .eq('id', bookingId)
          .single();
        if (bData) {
          triggerAutomationRules('booking_cancelled', bData);
        }
      } catch (autoErr) {
        console.warn("Cancellation automation trigger failed in handleCancelBookingPayment:", autoErr);
      }

      fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel: ' + err.message, { id: toastId });
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate Gateway Delay
    setTimeout(async () => {
      try {
        const amount = Number(paymentAmount);
        if (amount <= 0 || amount > (activePaymentModal.total_amount - activePaymentModal.amount_paid)) {
          toast.error("Invalid payment amount");
          setIsProcessing(false);
          return;
        }

        let guestProfile = null;
        if (paymentMethod === 'ar') {
          const crmGuestId = activePaymentModal.bookings?.crm_guest_id;
          const guestEmail = activePaymentModal.bookings?.guest_email;
          
          if (!crmGuestId && !guestEmail) {
            toast.error("Cannot resolve CRM guest account for this booking. AR charge failed.");
            setIsProcessing(false);
            return;
          }

          if (crmGuestId) {
            const { data } = await supabase.from('crm_guests').select('*').eq('id', crmGuestId).maybeSingle();
            guestProfile = data;
          } else if (guestEmail) {
            const { data } = await supabase.from('crm_guests').select('*').eq('email', guestEmail.toLowerCase()).maybeSingle();
            guestProfile = data;
          }

          if (!guestProfile) {
            toast.error("CRM Guest Profile not found. Cannot charge to AR.");
            setIsProcessing(false);
            return;
          }

          const currentWalletBalance = Number(guestProfile.wallet_balance || 0);
          if (currentWalletBalance < amount) {
            toast.error(`Insufficient AR wallet balance. Available: ₦${currentWalletBalance.toLocaleString()}`);
            setIsProcessing(false);
            return;
          }

          const newWalletBalance = currentWalletBalance - amount;
          await supabase.from('crm_guests').update({ wallet_balance: newWalletBalance }).eq('id', guestProfile.id);

          let arAccountsList = [];
          try {
            const { data } = await supabase.from('ar_accounts').select('*');
            if (data) arAccountsList = data;
          } catch {}

          const existingAr = arAccountsList.find(a => a.guest_id === guestProfile.id);
          const updatedArRecord = {
            id: existingAr ? existingAr.id : `ar_` + Math.random().toString(36).substring(2, 9).toUpperCase(),
            guest_id: guestProfile.id,
            guest_name: `${guestProfile.first_name || ''} ${guestProfile.last_name || ''}`.trim() || guestProfile.guest_name || 'Unnamed Guest',
            guest_email: guestProfile.email || 'N/A',
            balance: newWalletBalance,
            status: 'active',
            created_at: existingAr ? existingAr.created_at : new Date().toISOString()
          };

          try {
            await supabase.from('ar_accounts').upsert([updatedArRecord]);
          } catch (err) {
            console.warn("ar_accounts upsert fallback", err);
          }
        }

        const newAmountPaid = Number(activePaymentModal.amount_paid) + amount;
        const newStatus = newAmountPaid >= activePaymentModal.total_amount ? 'paid' : 'partial';

        // 1. Record Payment
        const { error: payErr } = await supabase.from('payments').insert([{
          booking_id: activePaymentModal.booking_id,
          invoice_id: activePaymentModal.id,
          amount: amount,
          method: paymentMethod === 'ar' ? 'cash' : paymentMethod,
          status: 'completed',
          transaction_ref: `MOCK-${paymentMethod.toUpperCase()}-${Date.now()}`,
          notes: paymentMethod === 'ar' && guestProfile 
            ? `AR Prepayment Wallet deduction for invoice: ${activePaymentModal.invoice_number} (Ref: ${activePaymentModal.bookings?.booking_reference || 'N/A'}) for guest: ${guestProfile.first_name} ${guestProfile.last_name} (${guestProfile.email || 'N/A'})`
            : `Payment processed via ${paymentMethod.toUpperCase()} for invoice: ${activePaymentModal.invoice_number}`
        }]);

        if (payErr) throw payErr;

        // 2. Update Invoice
        await supabase.from('invoices').update({
          amount_paid: newAmountPaid,
          status: newStatus
        }).eq('id', activePaymentModal.id);

        // 3. Sync with Bookings (Important so check-out is allowed, set status to confirmed on payment confirmation)
        await supabase.from('bookings').update({
          amount_paid_ngn: newAmountPaid,
          payment_status: newStatus,
          id_verified: true,
          status: 'confirmed'
        }).eq('id', activePaymentModal.booking_id);

        // 3b. If invoice is fully paid, mark all booking services as paid
        if (newStatus === 'paid') {
          await supabase
            .from('booking_services')
            .update({ payment_status: 'paid' })
            .eq('booking_id', activePaymentModal.booking_id);
        }

        toast.success(`Payment of ₦${amount.toLocaleString()} processed via ${paymentMethod.toUpperCase()}`);

        // Trigger alerts
        try {
          const { data: bData } = await supabase
            .from('bookings')
            .select('*, profiles(*), rooms(*)')
            .eq('id', activePaymentModal.booking_id)
            .single();
          if (bData) {
            triggerAutomationRules('payment_received', {
              ...bData,
              payment_amount: amount,
              payment_method: paymentMethod,
              payment_ref: `MOCK-${paymentMethod.toUpperCase()}-${Date.now()}`
            });
            // If booking was pending and now confirmed, trigger booking_confirmed
            if (activePaymentModal.bookings?.status === 'pending') {
              triggerAutomationRules('booking_confirmed', bData);
            }
            // Trigger invoice email
            triggerAutomationRules('invoice_issued', bData);
          }
        } catch (autoErr) {
          console.warn("Automation alerts processing failed in handleProcessPayment:", autoErr);
        }

        setActivePaymentModal(null);
        setPaymentAmount('');
        fetchInvoices();
      } catch (err) {
        toast.error('Payment processing failed');
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  const handleIssueRefund = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    setTimeout(async () => {
      try {
        const amount = Number(paymentAmount);
        if (amount <= 0 || amount > activeRefundModal.amount_paid) {
          toast.error("Invalid refund amount");
          setIsProcessing(false);
          return;
        }

        let guestProfile = null;
        if (paymentMethod === 'ar') {
          const crmGuestId = activeRefundModal.bookings?.crm_guest_id;
          const guestEmail = activeRefundModal.bookings?.guest_email;
          
          if (crmGuestId || guestEmail) {
            if (crmGuestId) {
              const { data } = await supabase.from('crm_guests').select('*').eq('id', crmGuestId).maybeSingle();
              guestProfile = data;
            } else if (guestEmail) {
              const { data } = await supabase.from('crm_guests').select('*').eq('email', guestEmail.toLowerCase()).maybeSingle();
              guestProfile = data;
            }

            if (guestProfile) {
              const currentWalletBalance = Number(guestProfile.wallet_balance || 0);
              const newWalletBalance = currentWalletBalance + amount;

              await supabase.from('crm_guests').update({ wallet_balance: newWalletBalance }).eq('id', guestProfile.id);

              let arAccountsList = [];
              try {
                const { data } = await supabase.from('ar_accounts').select('*');
                if (data) arAccountsList = data;
              } catch {}

              const existingAr = arAccountsList.find(a => a.guest_id === guestProfile.id);
              const updatedArRecord = {
                id: existingAr ? existingAr.id : `ar_` + Math.random().toString(36).substring(2, 9).toUpperCase(),
                guest_id: guestProfile.id,
                guest_name: `${guestProfile.first_name || ''} ${guestProfile.last_name || ''}`.trim() || guestProfile.guest_name || 'Unnamed Guest',
                guest_email: guestProfile.email || 'N/A',
                balance: newWalletBalance,
                status: 'active',
                created_at: existingAr ? existingAr.created_at : new Date().toISOString()
              };

              try {
                await supabase.from('ar_accounts').upsert([updatedArRecord]);
              } catch (err) {
                console.warn("ar_accounts upsert fallback", err);
              }
            }
          }
        }

        const newAmountPaid = Number(activeRefundModal.amount_paid) - amount;
        const newStatus = newAmountPaid === 0 ? 'cancelled' : 'partial';

        // 1. Record Refund
        const { error: payErr } = await supabase.from('payments').insert([{
          booking_id: activeRefundModal.booking_id,
          invoice_id: activeRefundModal.id,
          amount: amount,
          method: paymentMethod === 'ar' ? 'cash' : paymentMethod, // Method refunded back to
          status: 'refunded',
          is_refund: true,
          transaction_ref: `REF-${paymentMethod.toUpperCase()}-${Date.now()}`,
          notes: paymentMethod === 'ar' && guestProfile
            ? `AR Prepayment Wallet refund for invoice: ${activeRefundModal.invoice_number} (Ref: ${activeRefundModal.bookings?.booking_reference || 'N/A'}) for guest: ${guestProfile.first_name} ${guestProfile.last_name} (${guestProfile.email || 'N/A'})`
            : `Refund issued via ${paymentMethod.toUpperCase()} for invoice: ${activeRefundModal.invoice_number}`
        }]);

        if (payErr) throw payErr;

        // 2. Update Invoice
        await supabase.from('invoices').update({
          amount_paid: newAmountPaid,
          status: newStatus
        }).eq('id', activeRefundModal.id);

        // 3. Sync with Bookings
        await supabase.from('bookings').update({
          amount_paid_ngn: newAmountPaid,
          payment_status: newStatus
        }).eq('id', activeRefundModal.booking_id);

        toast.success(`Refund of ₦${amount.toLocaleString()} issued successfully.`);
        setActiveRefundModal(null);
        setPaymentAmount('');
        fetchInvoices();
      } catch (err) {
        toast.error('Refund failed');
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'partial': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'overdue': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'cancelled': return 'bg-dark-600 text-gray-500 border border-dark-500';
      default: return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'; // draft/sent
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    
    const guestName = inv.bookings?.profiles 
      ? `${inv.bookings.profiles.first_name} ${inv.bookings.profiles.last_name}` 
      : inv.bookings?.guest_name || '';
    const bookingRef = inv.bookings?.booking_reference || '';
    const searchLower = searchTerm.toLowerCase();
    
    return inv.invoice_number.toLowerCase().includes(searchLower) || 
           bookingRef.toLowerCase().includes(searchLower) || 
           guestName.toLowerCase().includes(searchLower);
   });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (sortBy === 'created_at_desc') {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    if (sortBy === 'created_at_asc') {
      return new Date(a.created_at) - new Date(b.created_at);
    }
    if (sortBy === 'status_custom') {
      const getStatusPriority = (status) => {
        if (status === 'paid') return 1;
        if (status === 'partial') return 3;
        if (status === 'cancelled') return 4;
        return 2; // 'sent', 'draft', 'overdue' (Not Paid)
      };
      return getStatusPriority(a.status) - getStatusPriority(b.status);
    }
    if (sortBy === 'status_custom_desc') {
      const getStatusPriority = (status) => {
        if (status === 'paid') return 1;
        if (status === 'partial') return 3;
        if (status === 'cancelled') return 4;
        return 2;
      };
      return getStatusPriority(b.status) - getStatusPriority(a.status);
    }
    if (sortBy === 'balance_desc') {
      const balanceA = Number(a.total_amount || 0) - Number(a.amount_paid || 0);
      const balanceB = Number(b.total_amount || 0) - Number(b.amount_paid || 0);
      return balanceB - balanceA;
    }
    if (sortBy === 'amount_desc') {
      return Number(b.total_amount || 0) - Number(a.total_amount || 0);
    }
    return 0;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-dark-800 p-6 rounded-lg border border-dark-700 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wallet className="text-brand-500"/> Finance & Billing
          </h1>
          <p className="text-gray-400 mt-1">Manage invoices, process multi-gateway payments, and issue refunds.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-dark-700 overflow-x-auto">
        <button onClick={() => setActiveTab('invoices')} className={`pb-3 px-4 font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'invoices' ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-400 hover:text-white'}`}>
          <FileText size={18} /> Invoices & Billings
        </button>
        {hasAccess('Accounting') && (
          <button onClick={() => setActiveTab('accounting')} className={`pb-3 px-4 font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'accounting' ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-400 hover:text-white'}`}>
            <Wallet size={18} /> Accounting & Ledgers
          </button>
        )}
      </div>

      {activeTab === 'invoices' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-800 border border-dark-700 p-5 rounded-lg border-l-4 border-l-green-500">
          <p className="text-sm text-gray-400 font-medium">Total Collected Revenue</p>
          <h3 className="text-3xl font-bold text-white mt-1">₦{stats.totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="bg-dark-800 border border-dark-700 p-5 rounded-lg border-l-4 border-l-yellow-500">
          <p className="text-sm text-gray-400 font-medium">Pending Receivables</p>
          <h3 className="text-3xl font-bold text-white mt-1">₦{stats.pendingReceivables.toLocaleString()}</h3>
        </div>
        <div className="bg-dark-800 border border-dark-700 p-5 rounded-lg border-l-4 border-l-brand-500">
          <p className="text-sm text-gray-400 font-medium">VAT/Tax Collected (Estimated)</p>
          <h3 className="text-3xl font-bold text-white mt-1">₦{stats.taxCollected.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
        </div>
      </div>

      {/* Pending Service Payments Section */}
      {pendingServicePayments.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 p-6 rounded-lg shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
            ⚠️ Service Payments Awaiting Finance Confirmation ({pendingServicePayments.length})
          </h2>
          <p className="text-gray-400 text-xs">
            Guests have requested these stay enhancements. Confirm their cash, POS, or bank transfer payments to credit their account and allow front desk approval.
          </p>
          <div className="overflow-x-auto border border-dark-700 rounded bg-dark-900/50">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-dark-700 bg-dark-900 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Guest / Room</th>
                  <th className="py-3 px-4">Service Details</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Confirm Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {pendingServicePayments.map(req => {
                  const guestName = req.bookings?.guest_name || 'Guest';
                  return (
                    <tr key={req.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{guestName}</p>
                        <span className="text-[10px] text-gray-500 font-mono">Ref: {req.bookings?.booking_reference}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-white">{req.services?.name}</p>
                        <span className="text-xs text-gray-400">Qty: {req.quantity}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gold-500 font-mono">
                        ₦{Number(req.total_price_ngn).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400">
                        {req.notes || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right flex justify-end gap-2 items-center">
                        <button 
                          onClick={() => handleConfirmServicePayment(req, 'ar')}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-1.5 px-3 rounded shadow transition-all"
                        >
                          AR Deduction
                        </button>
                        <button 
                          onClick={() => handleConfirmServicePayment(req, 'bank_transfer')}
                          className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs py-1.5 px-3 rounded shadow transition-all"
                        >
                          Bank Transfer
                        </button>
                        <button 
                          onClick={() => handleConfirmServicePayment(req, 'pos')}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs py-1.5 px-3 rounded shadow transition-all"
                        >
                          POS
                        </button>
                        <button 
                          onClick={() => handleConfirmServicePayment(req, 'cash')}
                          className="bg-green-500 hover:bg-green-600 text-dark-950 font-bold text-xs py-1.5 px-3 rounded shadow transition-all"
                        >
                          Cash
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Checkout Payments Section */}
      {pendingCheckoutPayments.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 p-6 rounded-lg shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
            ⚠️ Checkout Payments Awaiting Finance Confirmation ({pendingCheckoutPayments.length})
          </h2>
          <p className="text-gray-400 text-xs">
            Guests are attempting to check out at Front Office and have logged these payments. Confirm their cash, POS, or bank transfer payments to allow Front Office to finalize their checkout.
          </p>
          <div className="overflow-x-auto border border-dark-700 rounded bg-dark-900/50">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-dark-700 bg-dark-900 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Guest / Room</th>
                  <th className="py-3 px-4">Booking Reference</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Notes / Ref</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {pendingCheckoutPayments.map(p => {
                  const guestName = p.bookings?.guest_name || 'Guest';
                  const roomNumber = p.bookings?.rooms?.room_number || 'N/A';
                  return (
                    <tr key={p.id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{guestName}</p>
                        <span className="text-xs text-gray-400">Room: {roomNumber}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-300">
                        {p.bookings?.booking_reference || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gold-500 font-mono">
                        ₦{Number(p.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-white text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.method === 'bank_transfer' ? 'bg-blue-500/20 text-blue-400' : p.method === 'pos' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                          {p.method === 'bank_transfer' ? 'Bank Transfer' : p.method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400">
                        <p className="truncate max-w-[250px]" title={p.notes}>{p.notes || 'N/A'}</p>
                        <span className="text-[10px] text-gray-500 font-mono">Ref: {p.transaction_ref}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right flex justify-end gap-2 items-center">
                        <button 
                          onClick={() => handleConfirmPendingPayment(p)}
                          className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-bold text-xs py-1.5 px-3 rounded shadow transition-all active:scale-98"
                        >
                          Confirm Payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Content */}
      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded text-sm mb-4">
          <p className="font-bold">Error loading data:</p>
          <pre className="mt-2 whitespace-pre-wrap">{fetchError}</pre>
        </div>
      )}
      <div className="bg-dark-800 border border-dark-700 shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-dark-700 bg-dark-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by Invoice #, Booking Ref, or Guest..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-dark-800 border border-dark-700 text-white rounded outline-none focus:border-brand-500 transition-colors" 
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Sort By:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-dark-800 border border-dark-700 text-white rounded px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors cursor-pointer"
            >
              <option value="created_at_desc">Date Created (Newest)</option>
              <option value="created_at_asc">Date Created (Oldest)</option>
              <option value="status_custom">Status (Paid &rarr; Not Paid &rarr; Partial)</option>
              <option value="status_custom_desc">Status (Partial &rarr; Not Paid &rarr; Paid)</option>
              <option value="balance_desc">Balance Due (Highest)</option>
              <option value="amount_desc">Invoice Total (Highest)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-900 border-b border-dark-700 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Booking Ref</th>
                <th className="p-4">Guest</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Balance Due</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700 text-sm">
              {loading && <tr><td colSpan="8" className="p-8 text-center text-gray-500">Loading invoices...</td></tr>}
              {!loading && sortedInvoices.length === 0 && <tr><td colSpan="8" className="p-8 text-center text-gray-500">No invoices found.</td></tr>}
              
              {sortedInvoices.map(inv => {
                const guestName = inv.bookings?.profiles ? `${inv.bookings.profiles.first_name} ${inv.bookings.profiles.last_name}` : inv.bookings?.guest_name || 'Walk-in Guest';
                const balanceDue = Number(inv.total_amount) - Number(inv.amount_paid);
                const discount = Number(inv.bookings?.discount_amount_ngn || 0);

                return (
                  <tr key={inv.id} className="hover:bg-dark-700 transition-colors group">
                    <td className="p-4">
                      <p className="font-bold text-white flex items-center gap-2"><FileText size={14} className="text-gray-500"/> {inv.invoice_number}</p>
                      <p className="text-xs text-gray-500">Due: {format(new Date(inv.due_date), 'MMM dd, yyyy')}</p>
                    </td>
                    <td className="p-4 font-medium text-brand-500">{inv.bookings?.booking_reference || 'N/A'}</td>
                    <td className="p-4 font-medium text-gray-300">{guestName}</td>
                    <td className="p-4 font-bold text-white">₦{Number(inv.total_amount).toLocaleString()}</td>
                    <td className="p-4">
                      {discount > 0 ? (
                        <span className="text-yellow-500 font-semibold">-₦{discount.toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`font-bold ${balanceDue > 0 ? 'text-red-400' : 'text-green-500'}`}>
                        ₦{balanceDue.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded uppercase font-bold tracking-wider ${getStatusColor(inv.status)}`}>
                        {inv.status === 'paid' ? 'paid' : 
                         inv.status === 'partial' ? 'partial' : 
                         inv.status === 'cancelled' ? 'cancelled' : 'not paid'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => setActiveInvoiceModal(inv)} className="bg-dark-700 hover:bg-dark-600 text-white px-3 py-1.5 rounded font-bold text-xs transition-colors inline-flex items-center gap-1">
                        <Eye size={14} /> View
                      </button>
                      {inv.bookings?.status === 'pending' && !inv.bookings?.id_verified && (
                        <button 
                          onClick={() => handleConfirmBookingPayment(inv.bookings.id)} 
                          className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded font-bold text-xs transition-colors"
                        >
                          Confirm Payment
                        </button>
                      )}
                      {inv.bookings?.status === 'pending' && !inv.bookings?.id_verified && (
                        <button 
                          onClick={() => handleCancelBookingPayment(inv.id, inv.bookings.id)} 
                          className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded font-bold text-xs transition-colors"
                        >
                          Decline / Cancel
                        </button>
                      )}
                      {balanceDue > 0 && inv.status !== 'cancelled' && (
                        <button onClick={() => {setActivePaymentModal(inv); setPaymentAmount(balanceDue.toString())}} className="bg-brand-500 hover:bg-brand-400 text-dark-900 px-3 py-1.5 rounded font-bold text-xs transition-colors">
                          Pay
                        </button>
                      )}
                      {Number(inv.amount_paid) > 0 && (
                        <button onClick={() => {setActiveRefundModal(inv); setPaymentAmount(inv.amount_paid.toString())}} className="bg-dark-600 hover:bg-red-500/20 hover:text-red-400 text-gray-300 px-3 py-1.5 rounded font-bold text-xs transition-colors">
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {activeTab === 'accounting' && hasAccess('Accounting') && (
        <div className="animate-in fade-in duration-300">
          <Accounting />
        </div>
      )}

      {/* --- Payment Modal (Multi-Gateway Mock) --- */}
      {activePaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 p-6 w-full max-w-md shadow-2xl relative rounded-xl animate-in zoom-in-95">
            <button onClick={() => !isProcessing && setActivePaymentModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><CreditCard className="text-brand-500"/> Process Payment</h2>
            <p className="text-sm text-gray-400 mb-6">Invoice: {activePaymentModal.invoice_number}</p>
            
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Payment Method Gateway</label>
                <select disabled={isProcessing} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-dark-900 border border-dark-700 rounded p-3 text-white outline-none focus:border-brand-500 transition-colors">
                  <option value="paystack">Paystack</option>
                  <option value="flutterwave">Flutterwave</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="ar">Accounts Receivable (AR)</option>
                  <option value="bank_transfer">Bank Transfer (Manual)</option>
                  <option value="pos">POS Terminal (Manual)</option>
                  <option value="cash">Cash (Manual)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Amount to Charge (₦)</label>
                <input 
                  disabled={isProcessing}
                  required 
                  type="number" 
                  max={activePaymentModal.total_amount - activePaymentModal.amount_paid} 
                  min="1" 
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(e.target.value)} 
                  className="w-full bg-dark-900 border border-dark-700 rounded p-3 text-white outline-none focus:border-brand-500 transition-colors" 
                />
                <p className="text-xs text-gray-500 mt-1 flex justify-between">
                  <span>Balance Due: ₦{(activePaymentModal.total_amount - activePaymentModal.amount_paid).toLocaleString()}</span>
                  <span className="text-brand-500 cursor-pointer hover:underline" onClick={() => setPaymentAmount((activePaymentModal.total_amount - activePaymentModal.amount_paid).toString())}>Pay Full</span>
                </p>
              </div>

              <button type="submit" disabled={isProcessing || !paymentAmount} className={`w-full py-3 mt-4 rounded font-bold transition-all flex items-center justify-center gap-2 ${isProcessing || !paymentAmount ? 'bg-dark-700 text-gray-500 cursor-not-allowed' : 'bg-brand-500 text-dark-900 hover:bg-brand-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]'}`}>
                {isProcessing ? <><RefreshCcw size={18} className="animate-spin" /> Processing via {paymentMethod.toUpperCase()}...</> : `Charge ₦${Number(paymentAmount).toLocaleString()}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Refund Modal --- */}
      {activeRefundModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 p-6 w-full max-w-md shadow-2xl relative rounded-xl animate-in zoom-in-95">
            <button onClick={() => !isProcessing && setActiveRefundModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><ArrowRightLeft className="text-red-500"/> Issue Refund</h2>
            <p className="text-sm text-gray-400 mb-6">Invoice: {activeRefundModal.invoice_number}</p>
            
            <form onSubmit={handleIssueRefund} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Refund Method</label>
                <select disabled={isProcessing} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-dark-900 border border-dark-700 rounded p-3 text-white outline-none focus:border-red-500 transition-colors">
                  <option value="ar">Accounts Receivable (AR)</option>
                  <option value="bank_transfer">Bank Transfer (Manual Outward)</option>
                  <option value="stripe">Stripe (Auto Reversal)</option>
                  <option value="paystack">Paystack (Auto Reversal)</option>
                  <option value="cash">Cash (Manual Outward)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Amount to Refund (₦)</label>
                <input 
                  disabled={isProcessing}
                  required 
                  type="number" 
                  max={activeRefundModal.amount_paid} 
                  min="1" 
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(e.target.value)} 
                  className="w-full bg-dark-900 border border-dark-700 rounded p-3 text-white outline-none focus:border-red-500 transition-colors" 
                />
                <p className="text-xs text-gray-500 mt-1 flex justify-between">
                  <span>Max Refundable: ₦{Number(activeRefundModal.amount_paid).toLocaleString()}</span>
                  <span className="text-red-500 cursor-pointer hover:underline" onClick={() => setPaymentAmount(activeRefundModal.amount_paid.toString())}>Refund Full Amount</span>
                </p>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs mt-2">
                Warning: Once a refund is recorded, it will deduct from the total amount paid on this invoice and the booking.
              </div>

              <button type="submit" disabled={isProcessing || !paymentAmount} className={`w-full py-3 mt-4 rounded font-bold transition-all flex items-center justify-center gap-2 ${isProcessing || !paymentAmount ? 'bg-dark-700 text-gray-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}>
                {isProcessing ? <><RefreshCcw size={18} className="animate-spin" /> Processing Refund...</> : `Refund ₦${Number(paymentAmount).toLocaleString()}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- View/Print Invoice Modal --- */}
      {activeInvoiceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start z-50 p-4 md:p-10 overflow-y-auto print:bg-white select-none">
          {/* Floating Fixed Close Button */}
          <button 
            onClick={() => setActiveInvoiceModal(null)} 
            className="fixed top-6 right-6 z-[60] bg-dark-900/90 hover:bg-dark-750 text-white p-3 rounded-full border border-dark-700 hover:border-red-500/40 hover:text-red-400 hover:scale-110 transition-all shadow-2xl print:hidden flex items-center justify-center cursor-pointer"
            title="Close Invoice (Esc)"
          >
            <X size={22} className="stroke-[2.5]" />
          </button>
          
          <div className={`print-container ${printType === 'thermal' ? 'print-thermal' : 'print-a4'} bg-dark-800 border border-dark-700 text-gray-300 print:border-none print:bg-white print:text-black w-full max-w-3xl rounded-xl shadow-2xl relative my-8 p-8 animate-in zoom-in-95 print:!m-0 print:!p-8`}>
            
            {/* Print Button */}
            <div className="flex gap-2 mb-6 print:hidden">
               <button onClick={() => { setPrintType('a4'); setTimeout(() => window.print(), 100); }} className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 transition-colors">
                 <Printer size={18} /> Print (A4)
               </button>
               <button onClick={() => { setPrintType('thermal'); setTimeout(() => window.print(), 100); }} className="bg-dark-700 hover:bg-dark-800 text-white px-4 py-2 rounded font-bold flex items-center gap-2 transition-colors">
                 <Printer size={18} /> Print (Thermal)
               </button>
            </div>

            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-dark-700 print:border-gray-200 pb-6 mb-6">
              <div>
                <h1 className="text-4xl font-black tracking-tight mb-1 text-white print:text-black">
                  {activeInvoiceModal.status === 'paid' ? 'OFFICIAL RECEIPT' : 'INVOICE'}
                </h1>
                <p className="text-gray-400 print:text-gray-500 font-medium">#{activeInvoiceModal.invoice_number}</p>
              </div>
              <div className="text-right">
                <div className="flex flex-col justify-center items-end">
                  {contactInfo.logo ? (
                    <img src={contactInfo.logo} alt="Sparkles Apartments Logo" className="max-h-12 object-contain print:max-h-16 mb-2" />
                  ) : (
                    <>
                      <span className="text-[20px] font-sans font-extrabold text-white print:text-black leading-none tracking-wide">SPARKLES</span>
                      <span className="text-[10px] font-sans text-brand-500 leading-tight tracking-[0.25em] mt-1">APARTMENTS</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-400 print:text-gray-500 mt-2">{contactInfo.address}</p>
                <p className="text-sm text-gray-400 print:text-gray-500">{contactInfo.email}</p>
                <p className="text-sm text-gray-400 print:text-gray-500">{contactInfo.phone.split(',')[0]}</p>
              </div>
            </div>

            {/* Invoice Info */}
            <div className="flex justify-between mb-8">
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">Billed To:</p>
                <p className="font-bold text-lg text-white print:text-black">{activeInvoiceModal.bookings?.profiles ? `${activeInvoiceModal.bookings.profiles.first_name} ${activeInvoiceModal.bookings.profiles.last_name}` : activeInvoiceModal.bookings?.guest_name || 'Walk-in Guest'}</p>
                {activeInvoiceModal.bookings?.profiles?.phone && <p className="text-sm text-gray-400 print:text-gray-650">{activeInvoiceModal.bookings.profiles.phone}</p>}
              </div>
              <div className="text-right">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-left">
                  <span className="text-gray-400 print:text-gray-500 font-bold">Issue Timestamp:</span>
                  <span className="font-medium text-white print:text-black">{activeInvoiceModal.created_at ? format(new Date(activeInvoiceModal.created_at), 'MMM dd, yyyy, HH:mm') : format(new Date(activeInvoiceModal.issue_date), 'MMM dd, yyyy')}</span>
                  <span className="text-gray-400 print:text-gray-500 font-bold">Due Date:</span>
                  <span className="font-medium text-white print:text-black">{format(new Date(activeInvoiceModal.due_date), 'MMM dd, yyyy')}</span>
                  <span className="text-gray-400 print:text-gray-500 font-bold">Booking Ref:</span>
                  <span className="font-medium text-white print:text-black">{activeInvoiceModal.bookings?.booking_reference}</span>
                  <span className="text-gray-400 print:text-gray-500 font-bold">Status:</span>
                  <span className={`font-bold uppercase ${activeInvoiceModal.status === 'paid' ? 'text-green-400 print:text-green-600' : activeInvoiceModal.status === 'partial' ? 'text-yellow-400 print:text-yellow-600' : 'text-red-400 print:text-red-650'}`}>
                    {activeInvoiceModal.status === 'paid' ? 'paid' : 
                     activeInvoiceModal.status === 'partial' ? 'partial' : 
                     activeInvoiceModal.status === 'cancelled' ? 'cancelled' : 'not paid'}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-8 text-sm border-collapse text-left">
              <thead className="bg-dark-900/50 border-y border-dark-700 text-gray-400 print:bg-gray-100 print:border-gray-200 print:text-gray-600">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Description</th>
                  <th className="py-3 px-4 text-center font-bold">Payment Status</th>
                  <th className="py-3 px-4 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50 print:divide-gray-100">
                {(() => {
                  const booking = activeInvoiceModal.bookings || {};
                  const roomPrice = Number(booking.total_room_price_ngn || activeInvoiceModal.subtotal || 0);
                  const discount = Number(booking.discount_amount_ngn || 0);
                  const roomBase = Math.max(0, roomPrice - discount);
                  const roomTax = roomBase * 0.075;
                  const roomTotalWithTax = roomBase + roomTax;

                  const amountPaidTotal = Number(activeInvoiceModal.amount_paid || 0);
                  let remainingPaid = amountPaidTotal;

                  // Pay room first
                  let roomPaymentStatus = 'unpaid';
                  if (activeInvoiceModal.status === 'paid' || remainingPaid >= roomTotalWithTax) {
                    roomPaymentStatus = 'paid';
                    remainingPaid -= roomTotalWithTax;
                  } else if (remainingPaid > 0) {
                    roomPaymentStatus = 'partial';
                    remainingPaid = 0;
                  }

                  const renderStatusBadge = (status) => {
                    const normalized = (status || 'unpaid').toLowerCase();
                    let colorClasses = '';
                    let label = normalized;
                    if (normalized === 'paid') {
                      colorClasses = 'bg-green-500/10 text-green-500 border border-green-500/20 print:bg-green-100 print:text-green-800 print:border-green-200';
                      label = 'Paid';
                    } else if (normalized === 'partial' || normalized === 'partially paid') {
                      colorClasses = 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 print:bg-yellow-100 print:text-yellow-800 print:border-yellow-250';
                      label = 'Partial';
                    } else if (normalized === 'awaiting_confirmation') {
                      colorClasses = 'bg-amber-500/10 text-amber-500 border border-amber-500/20 print:bg-amber-100 print:text-amber-800 print:border-amber-250';
                      label = 'Awaiting';
                    } else {
                      colorClasses = 'bg-red-500/10 text-red-500 border border-red-500/20 print:bg-red-100 print:text-red-800 print:border-red-200';
                      label = 'Unpaid';
                    }
                    return (
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${colorClasses}`}>
                        {label}
                      </span>
                    );
                  };

                  const rawServices = booking.booking_services || [];
                  const activeServices = rawServices.filter(s => s.status !== 'cancelled') || [];

                  // Calculate status for each service sequentially
                  const servicesWithStatus = activeServices.map(extra => {
                    const isTaxable = extra.services?.tax_inclusive !== false;
                    const sBasePrice = Number(extra.total_price_ngn || 0);
                    const sTax = isTaxable ? sBasePrice * 0.075 : 0;
                    const sTotal = sBasePrice + sTax;
                    const uPrice = Number(extra.unit_price_ngn || (extra.quantity > 0 ? sBasePrice / extra.quantity : sBasePrice));

                    let servicePaymentStatus = 'unpaid';
                    if (activeInvoiceModal.status === 'paid' || remainingPaid >= sTotal) {
                      servicePaymentStatus = 'paid';
                      remainingPaid -= sTotal;
                    } else if (remainingPaid > 0) {
                      servicePaymentStatus = 'partial';
                      remainingPaid = 0;
                    }

                    return {
                      ...extra,
                      calculatedStatus: servicePaymentStatus,
                      sBasePrice,
                      sTax,
                      sTotal,
                      uPrice,
                      isTaxable
                    };
                  });

                  return (
                    <>
                      <tr>
                        <td className="py-4 px-4">
                          <p className="font-bold text-white print:text-black">
                            Accommodation Charges (Rent + Tax) {booking.rooms ? `(${booking.rooms.name} - Room ${booking.rooms.room_number})` : ''}
                          </p>
                          <p className="text-gray-400 print:text-gray-500 text-xs mt-0.5">
                            Check-in: {booking.check_in_date || 'N/A'} | Check-out: {booking.check_out_date || 'N/A'}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            Rate: ₦{roomPrice.toLocaleString()} {discount > 0 && `| Discount: -₦${discount.toLocaleString()}`} | Taxable Base: ₦{roomBase.toLocaleString()} | VAT (7.5%): ₦{roomTax.toLocaleString()}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {renderStatusBadge(roomPaymentStatus)}
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-white print:text-black">
                          ₦{roomTotalWithTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      {servicesWithStatus.map((extra) => {
                        return (
                          <tr key={extra.id}>
                            <td className="py-4 px-4">
                              <p className="font-bold text-white print:text-black">
                                {extra.services?.name || 'Guest Service'}
                              </p>
                              <p className="text-gray-400 print:text-gray-500 text-xs mt-0.5">
                                Unit Price: ₦{extra.uPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Quantity: {extra.quantity}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-1">
                                Base: ₦{extra.sBasePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {extra.isTaxable ? `| VAT (7.5%): ₦${extra.sTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '(VAT Exempt)'}
                              </p>
                            </td>
                            <td className="py-4 px-4 text-center">
                              {renderStatusBadge(extra.calculatedStatus)}
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-white print:text-black">
                              ₦{extra.sTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })()}
              </tbody>
            </table>

            {/* Totals */}
            {(() => {
              const totalAmount = Number(activeInvoiceModal.total_amount || 0);
              const amountPaid = Number(activeInvoiceModal.amount_paid || 0);
              const balance = Math.max(0, totalAmount - amountPaid);
              const discount = Number(activeInvoiceModal.bookings?.discount_amount_ngn || 0);

              return (
                <div className="flex justify-end">
                  <div className="w-64 space-y-3 text-sm">
                    <div className="flex justify-between text-gray-400 print:text-gray-600">
                      <span>Subtotal</span>
                      <span className="text-white print:text-black font-medium">
                        ₦{(totalAmount + discount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-yellow-500 print:text-yellow-600 font-medium">
                        <span>Room Discount</span>
                        <span>
                          -₦{discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t border-dark-700 print:border-gray-200 pt-2 text-white print:text-black">
                      <span>Total Due</span>
                      <span>₦{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    
                    {amountPaid > 0 && (
                      <div className="flex justify-between text-green-400 print:text-green-600 font-medium pt-2">
                        <span>Amount Paid</span>
                        <span>₦{amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-black text-xl border-t-2 border-dark-700 print:border-gray-300 pt-2 text-brand-500 print:text-brand-600">
                      <span>Balance</span>
                      <span>₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Signatures */}
            <div className="flex justify-between items-end pt-12 border-t border-dashed border-dark-700 print:border-gray-200 mt-12 text-left">
              <div className="text-center w-48">
                <div className="border-b border-dark-700 print:border-gray-300 h-8"></div>
                <span className="text-[10px] text-gray-450 print:text-gray-500 font-semibold block mt-1.5 uppercase">Prepared By</span>
              </div>
              <div className="text-center w-48">
                <div className="border-b border-dark-700 print:border-gray-300 h-8"></div>
                <span className="text-[10px] text-gray-450 print:text-gray-500 font-semibold block mt-1.5 uppercase">Audited By (Hotel Manager)</span>
              </div>
            </div>

            <div className="mt-16 text-center text-xs text-gray-400 print:text-gray-500 border-t border-dark-700 print:border-gray-200 pt-4">
              <p>Thank you for choosing Sparkles Apartments.</p>
              <p>Payment is due by the specified due date. Late payments may incur additional fees.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminBilling;
