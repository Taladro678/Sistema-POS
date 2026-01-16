import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useDialog } from '../context/DialogContext';
import {
    DollarSign, Save, RefreshCw, Calculator, TrendingUp, AlertCircle,
    CheckCircle, Edit2, X, Calendar, ArrowUpRight, ArrowDownRight,
    CreditCard, Banknote, Wallet, ChevronLeft, ChevronRight, ClipboardCheck,
    History
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

// --- Helpers ---

// Get ISO Week Number
const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};

const filterSalesByPeriod = (salesData, range, refDate, offsetPeriods = 0) => {
    // Clone refDate and shift it by offsetPeriods first
    const targetDate = new Date(refDate);

    if (range === 'week') {
        targetDate.setDate(targetDate.getDate() - (offsetPeriods * 7));
        const targetWeek = getWeekNumber(targetDate);
        const targetYear = targetDate.getFullYear();

        return salesData.filter(sale => {
            const sDate = new Date(sale.date);
            return getWeekNumber(sDate) === targetWeek && sDate.getFullYear() === targetYear;
        });
    } else {
        // Month
        targetDate.setMonth(targetDate.getMonth() - offsetPeriods);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        return salesData.filter(sale => {
            const sDate = new Date(sale.date);
            return sDate.getMonth() === targetMonth && sDate.getFullYear() === targetYear;
        });
    }
};

// --- Sub-components ---
const PaymentRow = ({ label, amount, color }) => (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="font-medium text-gray-300">{label}</span>
        </div>
        <span className="font-bold text-white">${amount.toFixed(2)}</span>
    </div>
);

export const CashRegisterPage = () => {
    const { data, updateData, updateExchangeRate } = useData();
    const { confirm, alert } = useDialog();
    const { exchangeRate, cashRegister, sales } = data || {};
    const safeSales = useMemo(() => Array.isArray(sales) ? sales : [], [sales]);

    // --- Local State ---
    const [openingBs, setOpeningBs] = useState(cashRegister.openingBalanceBs || 0);
    const [openingUsd, setOpeningUsd] = useState(cashRegister.openingBalanceUsd || 0);

    const [withdrawalsBs, setWithdrawalsBs] = useState(cashRegister.withdrawalsBs || 0);
    const [withdrawalsUsd, setWithdrawalsUsd] = useState(cashRegister.withdrawalsUsd || 0);
    const [withdrawalComment, setWithdrawalComment] = useState(cashRegister.withdrawalComment || '');

    const [countedCashBs, setCountedCashBs] = useState(cashRegister.closingBalanceBs || 0);
    const [countedCashUsd, setCountedCashUsd] = useState(cashRegister.closingBalanceUsd || 0);

    // UI State
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyTab, setHistoryTab] = useState('rates');
    const [newRate, setNewRate] = useState(exchangeRate);
    const [historySearch, setHistorySearch] = useState('');
    const [timeRange, setTimeRange] = useState('week'); // 'week' | 'month'

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Period Logic
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isComparing, setIsComparing] = useState(false);
    const [comparisonDate, setComparisonDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7))); // Default 1 week ago
    const [showDatePicker, setShowDatePicker] = useState(false);

    const getPeriodLabel = () => {
        if (timeRange === 'week') {
            const weekNum = getWeekNumber(selectedDate);
            const year = selectedDate.getFullYear();
            return `Semana ${weekNum} - ${year}`;
        } else {
            return selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        }
    };

    const navigatePeriod = (direction) => {
        const newDate = new Date(selectedDate);
        if (timeRange === 'week') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        } else {
            newDate.setMonth(newDate.getMonth() + direction);
        }
        setSelectedDate(newDate);
    };

    // Analytics
    const currentPeriodSales = useMemo(() =>
        filterSalesByPeriod(safeSales, timeRange, selectedDate, 0),
        [safeSales, timeRange, selectedDate]);

    const previousPeriodSales = useMemo(() =>
        filterSalesByPeriod(safeSales, timeRange, selectedDate, 1),
        [safeSales, timeRange, selectedDate]);

    const totalCurrentSales = currentPeriodSales.reduce((acc, s) => acc + s.total, 0);
    const totalPreviousSales = previousPeriodSales.reduce((acc, s) => acc + s.total, 0);

    const growthPercentage = totalPreviousSales === 0 ? (totalCurrentSales > 0 ? 100 : 0) : ((totalCurrentSales - totalPreviousSales) / totalPreviousSales) * 100;

    const comparisonPeriodSales = useMemo(() =>
        isComparing ? filterSalesByPeriod(safeSales, timeRange, comparisonDate, 0) : [],
        [safeSales, timeRange, comparisonDate, isComparing]);

    const chartData = useMemo(() => {
        const grouped = {};
        const groupedComparison = {};

        if (timeRange === 'week') {
            const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
            days.forEach(d => {
                grouped[d] = 0;
                groupedComparison[d] = 0;
            });

            currentPeriodSales.forEach(sale => {
                const d = new Date(sale.date);
                const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0, Sun=6
                grouped[days[dayIndex]] += sale.total;
            });

            if (isComparing) {
                comparisonPeriodSales.forEach(sale => {
                    const d = new Date(sale.date);
                    const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
                    groupedComparison[days[dayIndex]] += sale.total;
                });
            }

            return days.map(k => ({
                name: k,
                sales: grouped[k],
                comparison: isComparing ? groupedComparison[k] : null
            }));
        } else {
            // Month Logic
            const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                grouped[i] = 0;
                groupedComparison[i] = 0;
            }

            currentPeriodSales.forEach(sale => {
                const d = new Date(sale.date);
                if (grouped[d.getDate()] !== undefined) grouped[d.getDate()] += sale.total;
            });

            if (isComparing) {
                comparisonPeriodSales.forEach(sale => {
                    const d = new Date(sale.date);
                    // Map comparison date to same day number, if exists
                    if (groupedComparison[d.getDate()] !== undefined) groupedComparison[d.getDate()] += sale.total;
                });
            }

            return Object.keys(grouped).map(k => ({
                name: k,
                sales: grouped[k],
                comparison: isComparing ? groupedComparison[k] : null
            }));
        }
    }, [currentPeriodSales, comparisonPeriodSales, timeRange, selectedDate, isComparing]);

    const dailySales = useMemo(() => {
        const today = new Date().toDateString();
        return safeSales.filter(s => new Date(s.date).toDateString() === today);
    }, [safeSales]);

    // Unified reduction logic for all breakdowns
    const { methods, totalCashBs, totalCashUsd } = useMemo(() => {
        const result = {
            methods: {},
            totalCashBs: 0,
            totalCashUsd: 0
        };

        dailySales.forEach(sale => {
            if (sale.payments && Array.isArray(sale.payments)) {
                sale.payments.forEach(p => {
                    const label = p.method;
                    const usdValue = p.currency === 'Bs' ? p.amount / (p.rate || exchangeRate) : p.amount;
                    result.methods[label] = (result.methods[label] || 0) + usdValue;

                    if (p.currency === 'Bs') {
                        if (label === 'Efectivo Bs') result.totalCashBs += p.amount;
                    } else {
                        if (label === 'USD ($)' || label === 'usd') result.totalCashUsd += p.amount;
                    }
                });
            } else {
                // Fallback for old sales
                const label = sale.paymentMethod || 'Otros';
                result.methods[label] = (result.methods[label] || 0) + sale.total;
                if (label.includes('Bs') || label.includes('Pago Móvil') || label.includes('Punto') || ['Banplus', 'Bancaribe', 'Banesco'].some(b => label.includes(b))) {
                    const bsAmt = (sale.total * exchangeRate);
                    if (label === 'Efectivo Bs') result.totalCashBs += bsAmt;
                } else {
                    if (label === 'USD ($)' || label === 'usd') result.totalCashUsd += sale.total;
                }
            }
        });
        return result;
    }, [dailySales, exchangeRate]);

    const banks = (methods['Banplus (Punto)'] || 0) + (methods['Bancaribe (Punto)'] || 0) + (methods['Banesco (Punto)'] || 0) +
        (methods['Banplus'] || 0) + (methods['Bancaribe'] || 0) + (methods['Banesco'] || 0) +
        (methods['Punto de Venta'] || 0) + (methods['Punto'] || 0) + (methods['Otro Punto'] || 0);
    const pms = (methods['Pago movil Banesco PS'] || 0) + (methods['Pago Movil Banesco Raquel'] || 0) + (methods['Pago Movil BDV PS'] || 0) + (methods['Pago Movil Banplus'] || 0) + (methods['Pago Móvil'] || 0);
    const zelle = methods['Zelle'] || 0;
    const cashBsUsdEq = methods['Efectivo Bs'] || 0;
    const cashUsd = methods['USD ($)'] || methods['usd'] || 0;

    const pieData = useMemo(() => {
        const chartData = [
            { name: 'Bancos/Punto', value: banks, color: '#3b82f6' },
            { name: 'Pago Móvil', value: pms, color: '#60a5fa' },
            { name: 'Zelle', value: zelle, color: '#a78bfa' },
            { name: 'Efectivo $', value: cashUsd, color: '#22c55e' },
            { name: 'Efectivo Bs', value: cashBsUsdEq, color: '#4ade80' },
        ].filter(d => d.value > 0);

        return chartData.length > 0 ? chartData : [{ name: 'Sin Ventas', value: 1, color: 'rgba(255,255,255,0.05)' }];
    }, [banks, pms, zelle, cashUsd, cashBsUsdEq]);

    const totalDailySalesUsd = dailySales.reduce((acc, s) => acc + s.total, 0);

    const expectedCashBs = openingBs + totalCashBs - withdrawalsBs;
    const expectedCashUsd = openingUsd + totalCashUsd - withdrawalsUsd;

    const diffBs = countedCashBs - expectedCashBs;
    const diffUsd = countedCashUsd - expectedCashUsd;

    // Handlers
    const handleSaveOpening = async () => {
        updateData('cashRegister', {
            ...cashRegister,
            openingBalanceBs: parseFloat(openingBs) || 0,
            openingBalanceUsd: parseFloat(openingUsd) || 0,
            isOpen: true,
            openingTime: cashRegister.isOpen ? cashRegister.openingTime : new Date().toISOString()
        });
        await alert({ title: 'Éxito', message: 'Fondo de apertura guardado.' });
    };

    const handleSaveWithdrawals = async () => {
        updateData('cashRegister', {
            ...cashRegister,
            withdrawalsBs: parseFloat(withdrawalsBs) || 0,
            withdrawalsUsd: parseFloat(withdrawalsUsd) || 0,
            withdrawalComment: withdrawalComment
        });
        await alert({ title: 'Éxito', message: 'Movimientos guardados.' });
    };

    const handleCloseRegister = async () => {
        const ok = await confirm({
            title: 'Cerrar Caja',
            message: '¿Estás seguro de cerrar la caja? Esto finalizará el turno actual.'
        });
        if (!ok) return;

        const closureRecord = {
            id: window.crypto.randomUUID(),
            openingTime: cashRegister.openingTime,
            closingTime: new Date().toISOString(),
            openingBalanceBs: cashRegister.openingBalanceBs,
            openingBalanceUsd: cashRegister.openingBalanceUsd,
            closingBalanceBs: parseFloat(countedCashBs) || 0,
            closingBalanceUsd: parseFloat(countedCashUsd) || 0,
            expectedCashBs: expectedCashBs,
            expectedCashUsd: expectedCashUsd,
            differenceBs: (parseFloat(countedCashBs) || 0) - expectedCashBs,
            differenceUsd: (parseFloat(countedCashUsd) || 0) - expectedCashUsd,
            salesCount: dailySales.length,
            totalSalesUsd: totalDailySalesUsd
        };

        // Save to history
        const newHistory = [closureRecord, ...(data.cashRegisterHistory || [])];
        updateData('cashRegisterHistory', newHistory);

        // Update current status
        updateData('cashRegister', {
            ...cashRegister,
            closingBalanceBs: parseFloat(countedCashBs) || 0,
            closingBalanceUsd: parseFloat(countedCashUsd) || 0,
            closingTime: closureRecord.closingTime,
            status: 'closed',
            isOpen: false
        });

        await alert({ title: 'Éxito', message: 'Caja cerrada exitosamente y guardada en el historial.' });
    };

    const handleUpdateRate = () => {
        updateExchangeRate(newRate);
        setIsRateModalOpen(false);
    };

    return (
        <div className="cr-container fade-in p-4 md:p-6 pb-24 max-w-[1400px] mx-auto min-h-screen">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg"><Calculator className="text-white" size={isMobile ? 20 : 24} /></div>
                        Control de Caja
                    </h1>
                    <p className="text-gray-400 text-xs md:text-sm mt-1">Gestión de flujo de efectivo y métricas diarias</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
                    <button
                        onClick={() => setIsRateModalOpen(true)}
                        className="glass-panel px-4 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors group cursor-pointer"
                        style={{ flex: 1 }}
                    >
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-200 font-bold uppercase tracking-wider">Tasa</span>
                            <span className="text-sm md:text-base font-bold text-green-400 group-hover:text-green-300 transition-colors">{exchangeRate} Bs/$</span>
                        </div>
                        <Edit2 size={14} className="text-gray-300 group-hover:text-white transition-colors" />
                    </button>

                    <button
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="glass-button h-full flex items-center gap-2 px-4 py-2"
                        title="Ver historial"
                        style={{ height: '52px' }}
                    >
                        <Calendar size={16} />
                        {!isMobile && <span>Historial</span>}
                    </button>
                </div>
            </header>

            {/* Metrics Grid */}
            <div className="manual-grid-3 gap-4 mb-6">
                {/* 1. Total Sales */}
                <div className="glass-panel p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={64} className="text-blue-500" />
                    </div>
                    <div className="flex justify-between items-start z-10">
                        <div>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ventas ({timeRange === 'week' ? 'Semana' : 'Mes'})</span>
                            <div className="flex items-center gap-2 mt-1">
                                <h2 className="text-3xl font-bold text-white">${totalCurrentSales.toFixed(2)}</h2>
                            </div>
                        </div>
                        {/* Period Controls */}
                        <div className="flex bg-black/40 rounded-lg p-0.5">
                            <button onClick={() => setTimeRange('week')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${timeRange === 'week' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>SEM</button>
                            <button onClick={() => setTimeRange('month')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${timeRange === 'month' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>MES</button>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${growthPercentage >= 0 ? 'text-green-400' : 'text-red-400'} z-10`}>
                        {growthPercentage >= 0 ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                        <span>{Math.abs(growthPercentage).toFixed(0)}%</span>
                        <span className="text-gray-500 ml-1 font-normal">vs periodo anterior</span>
                    </div>
                </div>

                {/* 2. Today's Sales */}
                <div className="glass-panel p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar size={64} className="text-purple-500" />
                    </div>
                    <div className="z-10">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ventas de Hoy</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h2 className="text-3xl font-bold text-white">${totalDailySalesUsd.toFixed(2)}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 z-10">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="font-medium text-gray-300">{dailySales.length}</span> transacciones hoy
                    </div>
                </div>

                {/* 3. Theoretical Cash */}
                <div className="glass-panel p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={64} className="text-green-500" />
                    </div>
                    <div className="z-10">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Efectivo en Caja (Teórico)</span>
                    </div>
                    <div className="flex justify-between items-end z-10">
                        <div>
                            <div className="text-2xl font-bold text-white">${expectedCashUsd.toFixed(2)}</div>
                            <div className="text-[10px] text-gray-500 font-bold">USD</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-gray-300">{expectedCashBs.toFixed(2)}</div>
                            <div className="text-[10px] text-gray-500 font-bold">Bs</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Management Grid */}
            <div className="manual-grid-3 gap-6 mb-6">

                {/* COLUMNA 1: APERTURA */}
                <div className="glass-panel flex flex-col h-full border-t-4 border-t-blue-500 overflow-hidden">
                    <div className="bg-white/5 p-3 flex justify-between items-center border-b border-white/5">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">1</span>
                            Apertura de Caja
                        </h3>
                        <button onClick={handleSaveOpening} className="p-1.5 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all" title="Guardar Apertura">
                            <Save size={16} />
                        </button>
                    </div>

                    <div className="p-4 space-y-4 flex-1">
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 block tracking-wider">Fondo Inicial en Bs</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within:text-blue-400 transition-colors">Bs</span>
                                <input
                                    type="number"
                                    className="glass-input w-full pl-9 py-2 text-sm font-bold bg-black/20 focus:bg-black/40 transition-all border-white/10 focus:border-blue-500"
                                    value={openingBs === 0 ? '' : openingBs}
                                    onChange={(e) => setOpeningBs(parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 block tracking-wider">Fondo Inicial en USD</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within:text-green-400 transition-colors">$</span>
                                <input
                                    type="number"
                                    className="glass-input w-full pl-9 py-2 text-sm font-bold bg-black/20 focus:bg-black/40 transition-all border-white/10 focus:border-green-500"
                                    value={openingUsd === 0 ? '' : openingUsd}
                                    onChange={(e) => setOpeningUsd(parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-black/20 border-t border-white/5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">Total Apertura</span>
                            <span className="text-gray-300 font-bold bg-white/5 px-2 py-0.5 rounded">${(openingUsd + (openingBs / exchangeRate)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* COLUMNA 2: MOVIMIENTOS */}
                <div className="glass-panel flex flex-col h-full border-t-4 border-t-orange-500 overflow-hidden">
                    <div className="bg-white/5 p-3 flex justify-between items-center border-b border-white/5">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">2</span>
                            Movimientos
                        </h3>
                        <button onClick={handleSaveWithdrawals} className="p-1.5 rounded-md bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-all" title="Guardar Movimientos">
                            <Save size={16} />
                        </button>
                    </div>

                    <div className="p-4 space-y-4 flex-1">
                        {/* Summary Card */}
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-gray-400 uppercase font-bold">Ventas Efectivo</span>
                                <span className="text-green-400 font-bold text-sm">+${(totalCashUsd + (totalCashBs / exchangeRate)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-end gap-3 text-[10px] text-gray-500">
                                <span>Bs {totalCashBs.toFixed(2)}</span>
                                <span>$ {totalCashUsd.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-red-400 uppercase font-bold mb-1.5 block">Retiros Bs</label>
                                <input
                                    type="number"
                                    className="glass-input w-full px-3 py-2 text-xs text-right font-bold text-red-300 border-red-500/20 focus:border-red-500 bg-red-500/5 placeholder-red-800/50"
                                    placeholder="0.00"
                                    value={withdrawalsBs === 0 ? '' : withdrawalsBs}
                                    onChange={(e) => setWithdrawalsBs(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-red-400 uppercase font-bold mb-1.5 block">Retiros $</label>
                                <input
                                    type="number"
                                    className="glass-input w-full px-3 py-2 text-xs text-right font-bold text-red-300 border-red-500/20 focus:border-red-500 bg-red-500/5 placeholder-red-800/50"
                                    placeholder="0.00"
                                    value={withdrawalsUsd === 0 ? '' : withdrawalsUsd}
                                    onChange={(e) => setWithdrawalsUsd(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <input
                            type="text"
                            className="glass-input w-full px-3 py-2 text-xs border-dashed border-gray-700 focus:border-orange-500 transition-colors"
                            placeholder="Comentario (ej: Compra de Hielo)"
                            value={withdrawalComment}
                            onChange={(e) => setWithdrawalComment(e.target.value)}
                        />
                    </div>
                    <div className="p-3 bg-black/20 border-t border-white/5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-bold uppercase">Esperado en Caja</span>
                            <span className="text-white font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">${(expectedCashUsd + (expectedCashBs / exchangeRate)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* COLUMNA 3: CIERRE */}
                <div className="glass-panel flex flex-col h-full border-t-4 border-t-purple-500 overflow-hidden">
                    <div className="bg-white/5 p-3 flex justify-between items-center border-b border-white/5">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold">3</span>
                            Cierre y Arqueo
                        </h3>
                        <button onClick={handleCloseRegister} className="px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-all text-xs font-bold shadow-lg shadow-red-500/20 flex items-center gap-2">
                            <CheckCircle size={14} /> Cerrar Turno
                        </button>
                    </div>

                    <div className="p-4 space-y-4 flex-1">
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-purple-300 uppercase font-bold mb-1.5 block">Total Efectivo Bs</label>
                                <input
                                    type="number"
                                    className="glass-input w-full py-2 px-3 text-lg font-bold border-purple-500/30 focus:border-purple-500 text-right bg-purple-500/5"
                                    placeholder="0.00"
                                    value={countedCashBs === 0 ? '' : countedCashBs}
                                    onChange={(e) => setCountedCashBs(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-green-300 uppercase font-bold mb-1.5 block">Total Efectivo USD</label>
                                <input
                                    type="number"
                                    className="glass-input w-full py-2 px-3 text-lg font-bold border-green-500/30 focus:border-green-500 text-right bg-green-500/5"
                                    placeholder="0.00"
                                    value={countedCashUsd === 0 ? '' : countedCashUsd}
                                    onChange={(e) => setCountedCashUsd(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        {/* Diff Results using Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className={`rounded-lg border p-2 text-center transition-all duration-300 ${Math.abs(diffBs) < 1 ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                                <span className="text-[10px] text-gray-400 uppercase block mb-1">Dif. Bs</span>
                                <span className={`text-sm font-bold ${Math.abs(diffBs) < 1 ? 'text-green-400' : 'text-red-400'}`}>
                                    {diffBs > 0 ? '+' : ''}{diffBs.toFixed(2)}
                                </span>
                            </div>
                            <div className={`rounded-lg border p-2 text-center transition-all duration-300 ${Math.abs(diffUsd) < 0.1 ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                                <span className="text-[10px] text-gray-400 uppercase block mb-1">Dif. $</span>
                                <span className={`text-sm font-bold ${Math.abs(diffUsd) < 0.1 ? 'text-green-400' : 'text-red-400'}`}>
                                    {diffUsd > 0 ? '+' : ''}{diffUsd.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Grid */}
            <div className="manual-grid-2 gap-6 pb-6">

                {/* 1. Trend Chart */}
                <div className="glass-panel p-4 chart-container-manual">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-400 font-bold text-xs flex items-center gap-2 uppercase tracking-wider">
                            <TrendingUp size={16} className="text-blue-500" /> Tendencia de Ventas
                        </h3>
                        {/* Improved Nav & Controls */}
                        <div className="flex items-center gap-2">
                            {/* Compare Toggle */}
                            <button
                                onClick={() => setIsComparing(!isComparing)}
                                className={`p-1.5 rounded-md transition-all ${isComparing ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                title="Comparar con otra fecha"
                            >
                                <RefreshCw size={14} className={isComparing ? "" : "opacity-50"} />
                            </button>

                            {/* Date Picker Toggle */}
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className={`p-1.5 rounded-md transition-all ${showDatePicker ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                title="Seleccionar fecha específica"
                            >
                                <Calendar size={14} />
                            </button>

                            <div className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-1 border border-white/5">
                                <button onClick={() => navigatePeriod(-1)} className="p-1 hover:text-white text-gray-500 transition-colors"><ChevronLeft size={14} /></button>
                                <span className="text-[10px] font-mono text-gray-300 w-24 text-center">{getPeriodLabel()}</span>
                                <button onClick={() => navigatePeriod(1)} className="p-1 hover:text-white text-gray-500 transition-colors"><ChevronRight size={14} /></button>
                            </div>
                        </div>
                    </div>

                    {/* Extended Date Controls Panel (Conditional) */}
                    {showDatePicker && (
                        <div className="mb-4 p-3 bg-black/20 rounded-lg border border-white/5 flex flex-wrap gap-4 items-end fade-in">
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Fecha Principal</label>
                                <input
                                    type="date"
                                    value={selectedDate.toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        const d = new Date(e.target.value);
                                        // Adjust for timezone offset to prevent day shift
                                        const userTimezoneOffset = d.getTimezoneOffset() * 60000;
                                        setSelectedDate(new Date(d.getTime() + userTimezoneOffset));
                                    }}
                                    className="glass-input py-1 px-2 text-xs"
                                />
                            </div>

                            {isComparing && (
                                <div className="fade-in">
                                    <label className="text-[10px] text-purple-400 uppercase font-bold block mb-1">Comparar con</label>
                                    <input
                                        type="date"
                                        value={comparisonDate.toISOString().split('T')[0]}
                                        onChange={(e) => {
                                            const d = new Date(e.target.value);
                                            const userTimezoneOffset = d.getTimezoneOffset() * 60000;
                                            setComparisonDate(new Date(d.getTime() + userTimezoneOffset));
                                        }}
                                        className="glass-input py-1 px-2 text-xs border-purple-500/30 focus:border-purple-500"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex-1 w-full min-h-0 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorComparison" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `$${val}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f1f1f', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#e5e7eb', fontSize: '12px' }}
                                    labelStyle={{ color: '#9ca3af', fontSize: '10px', marginBottom: '4px' }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    name="Ventas Actuales"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                />
                                {isComparing && (
                                    <Area
                                        type="monotone"
                                        dataKey="comparison"
                                        name="Comparación"
                                        stroke="#a855f7"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        fillOpacity={1}
                                        fill="url(#colorComparison)"
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Breakdown & Pie */}
                <div className="glass-panel p-0 flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                            <CreditCard size={16} className="text-purple-500" /> Desglose de Ventas (Hoy)
                        </h3>
                        <span className="text-xs font-bold text-white bg-black/40 px-2 py-1 rounded-md border border-white/5">
                            Total: ${totalDailySalesUsd.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
                        {/* List */}
                        <div className="p-4 space-y-4 border-b md:border-b-0 md:border-r border-white/5 overflow-y-auto custom-scrollbar max-h-[300px]">
                            <div>
                                <div className="text-[10px] text-blue-400 font-bold mb-2 uppercase tracking-wider">Métodos Digitales</div>
                                <div className="space-y-1.5">
                                    <PaymentRow label="Bancos/Punto" amount={banks} color="#3b82f6" />
                                    <PaymentRow label="Pago Móvil" amount={pms} color="#60a5fa" />
                                    <PaymentRow label="Zelle" amount={zelle} color="#a78bfa" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-green-400 font-bold mb-2 uppercase tracking-wider">Efectivo</div>
                                <div className="space-y-1.5">
                                    <PaymentRow label="Dólares ($)" amount={cashUsd} color="#22c55e" />
                                    <PaymentRow label="Bolívares (Bs)" amount={cashBsUsdEq} color="#4ade80" />
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="p-4 flex flex-col items-center justify-center bg-black/10">
                            <div className="pie-chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: '11px', padding: '8px', borderRadius: '8px' }}
                                            formatter={(value) => `$${Number(value).toFixed(2)}`}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center mt-2">
                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Distribución</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modals */}
            {isRateModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-[320px] p-6 relative animate-in zoom-in-95 duration-200 shadow-2xl shadow-blue-900/20">
                        <button onClick={() => setIsRateModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                        <h3 className="text-lg font-bold mb-6 text-white text-center">Actualizar Tasa de Cambio</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Nueva Tasa (Bs/$)</label>
                                <input
                                    type="number"
                                    className="glass-input w-full text-center text-2xl font-bold py-3 text-green-400 focus:border-green-500"
                                    value={newRate}
                                    onChange={(e) => setNewRate(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <button onClick={handleUpdateRate} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-600/20">
                                Confirmar Cambio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isHistoryModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-2xl p-6 relative flex flex-col max-h-[85vh] shadow-2xl shadow-purple-900/20">
                        <button onClick={() => setIsHistoryModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                        <div className="mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
                                <History size={20} className="text-blue-500" /> Historial del Sistema
                            </h3>
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setHistoryTab('rates')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${historyTab === 'rates' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    TASAS DE CAMBIO
                                </button>
                                <button
                                    onClick={() => setHistoryTab('closures')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${historyTab === 'closures' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    CIERRES DE CAJA
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder={`Buscar en ${historyTab === 'rates' ? 'tasas' : 'cierres'}...`}
                                className="glass-input w-full pl-4 py-2 text-sm"
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {historyTab === 'rates' ? (
                                data.rateHistory && data.rateHistory.length > 0 ? (
                                    data.rateHistory
                                        .filter(entry => {
                                            if (!historySearch) return true;
                                            const term = historySearch.toLowerCase();
                                            return new Date(entry.date).toLocaleDateString().includes(term) || entry.rate.toString().includes(term);
                                        })
                                        .map((entry, index) => (
                                            <div key={entry.id} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors flex justify-between items-center border border-white/5">
                                                <div>
                                                    <div className="text-xs text-gray-400 font-mono">
                                                        {new Date(entry.date).toLocaleString()}
                                                    </div>
                                                    <div className="text-lg font-bold text-green-400 mt-0.5">
                                                        {entry.rate.toFixed(2)} Bs/$
                                                    </div>
                                                </div>
                                                {index < data.rateHistory.length - 1 && (
                                                    <div className="text-xs">
                                                        {(() => {
                                                            const diff = entry.rate - data.rateHistory[index + 1].rate;
                                                            const isIncrease = diff > 0;
                                                            return (
                                                                <span className={`font-bold px-2 py-1 rounded ${isIncrease ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                    {isIncrease ? '↑' : '↓'} {Math.abs(diff).toFixed(2)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                ) : (
                                    <div className="text-center text-gray-500 py-12 flex flex-col items-center gap-3">
                                        <div className="p-3 bg-white/5 rounded-full"><AlertCircle size={32} className="opacity-50" /></div>
                                        No hay historial de tasas disponible
                                    </div>
                                )
                            ) : (
                                /* Closure History */
                                data.cashRegisterHistory && data.cashRegisterHistory.length > 0 ? (
                                    data.cashRegisterHistory
                                        .filter(entry => {
                                            if (!historySearch) return true;
                                            const term = historySearch.toLowerCase();
                                            return new Date(entry.closingTime).toLocaleDateString().includes(term) ||
                                                entry.totalSalesUsd.toString().includes(term);
                                        })
                                        .map((entry) => (
                                            <div key={entry.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors border border-white/5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="text-xs text-purple-400 font-bold uppercase tracking-widest">Cierre de Caja</div>
                                                        <div className="text-sm font-bold text-white">
                                                            {new Date(entry.closingTime).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-500 font-bold">VENTAS TOTALES</div>
                                                        <div className="text-lg font-bold text-green-400">${entry.totalSalesUsd.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 py-2 border-t border-white/5 mt-2">
                                                    <div>
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase">Transacciones</div>
                                                        <div className="font-bold text-xs">{entry.salesCount}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase">Efectivo Bs</div>
                                                        <div className={`font-bold text-xs ${entry.differenceBs !== 0 ? 'text-orange-400' : 'text-gray-300'}`}>
                                                            {entry.closingBalanceBs.toFixed(2)}
                                                            {entry.differenceBs !== 0 && (
                                                                <span className="ml-1 text-[8px] opacity-70">
                                                                    ({entry.differenceBs > 0 ? '+' : ''}{entry.differenceBs.toFixed(2)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase">Efectivo USD</div>
                                                        <div className={`font-bold text-xs ${entry.differenceUsd !== 0 ? 'text-orange-400' : 'text-gray-300'}`}>
                                                            {entry.closingBalanceUsd.toFixed(2)}
                                                            {entry.differenceUsd !== 0 && (
                                                                <span className="ml-1 text-[8px] opacity-70">
                                                                    ({entry.differenceUsd > 0 ? '+' : ''}{entry.differenceUsd.toFixed(2)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="text-center text-gray-500 py-12 flex flex-col items-center gap-3">
                                        <div className="p-3 bg-white/5 rounded-full"><AlertCircle size={32} className="opacity-50" /></div>
                                        No hay historial de cierres disponible
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
