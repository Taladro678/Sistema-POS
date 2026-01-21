import React, { useState, useMemo } from 'react';
import { useData, formatAmount } from '../context/DataContext';
import { useSearchParams } from 'react-router-dom';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, XAxis, YAxis, CartesianGrid, Bar
} from 'recharts';
import {
    Calendar, DollarSign, CreditCard, Filter, User, Clock, ShoppingBag, Receipt,
    TrendingDown, ArrowDownLeft, UserCheck, TrendingUp as TrendingUpIcon,
    ChevronRight, Wallet, Banknote
} from 'lucide-react';
import Modal from '../components/Modal';

const mapMethodLabel = (method, paymentMethods = []) => {
    // Check if the method is one of the dynamic methods
    const dynamicMethod = paymentMethods.find(m => m.id === method || m.name === method);
    if (dynamicMethod) return dynamicMethod.name;

    const labels = {
        'efectivo_usd': 'Efectivo $',
        'efectivo_bs': 'Efectivo Bs',
        'zelle': 'Zelle',
        'pm_banesco': 'Pago Móvil Banesco',
        'punto': 'Punto de Venta',
        'credito': 'Crédito'
    };
    return labels[method] || method || 'Otro';
};

const TrendsUp = (props) => <TrendingUpIcon {...props} />;

const ReportsPage = () => {
    const { data } = useData();
    const [searchParams, setSearchParams] = useSearchParams();
    const sales = useMemo(() => data.sales || [], [data.sales]);
    const customers = useMemo(() => data.customers || [], [data.customers]);
    const exchangeRate = data.exchangeRate || 1;

    const [selectedSale, setSelectedSale] = useState(null);
    const selectedCustomerId = searchParams.get('customerId') || '';
    const [timeRange, setTimeRange] = useState(selectedCustomerId ? 'all' : 'today');

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleCustomerChange = (e) => {
        const id = e.target.value;
        if (id) {
            setSearchParams({ customerId: id });
            setTimeRange('all');
        } else {
            setSearchParams({});
            setTimeRange('today');
        }
    };

    const isWithinRange = (dateString, range) => {
        const date = new Date(dateString);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (range === 'today') return date >= startOfDay;
        if (range === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - 7);
            return date >= startOfWeek;
        }
        if (range === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return date >= startOfMonth;
        }
        return true;
    };

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            if (selectedCustomerId && sale.customerId !== selectedCustomerId) return false;
            if (!isWithinRange(sale.date, timeRange)) return false;
            return true;
        });
    }, [sales, timeRange, selectedCustomerId]);

    const financials = useMemo(() => {
        let totalUSD = 0, totalBs = 0, totalConverted = 0;
        let totalReceivable = 0, totalExpenses = 0, totalDebts = 0;

        const methodTotals = {};
        const departmentTotals = { 'Restaurante': 0, 'Quesera': 0 };

        filteredSales.forEach(sale => {
            // Priority 1: Use the new granular department breakdown if available
            if (sale.departmentTotals) {
                Object.entries(sale.departmentTotals).forEach(([dept, amount]) => {
                    if (departmentTotals[dept] !== undefined) {
                        departmentTotals[dept] += amount;
                    } else {
                        departmentTotals[dept] = amount;
                    }
                });
            } else {
                // Legacy fallback: single department for the whole sale
                const dept = sale.department || 'Restaurante';
                if (departmentTotals[dept] !== undefined) {
                    departmentTotals[dept] += sale.total;
                } else {
                    departmentTotals[dept] = sale.total;
                }
            }

            if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
                sale.payments.forEach(p => {
                    const amount = parseFloat(p.amount);
                    const label = mapMethodLabel(p.method, data.paymentMethods);
                    const amountInUSD = p.currency === 'USD' ? amount : (amount / (p.rate || exchangeRate));

                    if (!methodTotals[label]) {
                        methodTotals[label] = { native: 0, usd: 0, currency: p.currency };
                    }
                    methodTotals[label].native += amount;
                    methodTotals[label].usd += amountInUSD;

                    if (p.currency === 'USD') totalUSD += amount;
                    else totalBs += amount;

                    totalConverted += amountInUSD;
                    if (label.toLowerCase().includes('credito') || label.toLowerCase().includes('fiado')) totalReceivable += amountInUSD;
                });
            } else {
                const amount = parseFloat(sale.total);
                // Find method definition
                const methodId = sale.paymentMethod;
                const methodDef = (data.paymentMethods || []).find(m => m.id === methodId || m.name === methodId);
                const currency = methodDef ? methodDef.currency : (label.toLowerCase().includes('bs') || label.toLowerCase().includes('punto') || label.toLowerCase().includes('pago movil') ? 'Bs' : 'USD');

                const amountNative = currency === 'Bs' ? (amount * exchangeRate) : amount;
                const amountUSD = amount;

                if (!methodTotals[label]) {
                    methodTotals[label] = { native: 0, usd: 0, currency };
                }
                methodTotals[label].native += amountNative;
                methodTotals[label].usd += amountUSD;

                if (isBs) totalBs += amountNative;
                else totalUSD += amount;

                totalConverted += amountUSD;
                if (label.toLowerCase().includes('credito') || label.toLowerCase().includes('fiado')) totalReceivable += amountUSD;
            }
        });

        const allPaymentsChartData = Object.entries(methodTotals)
            .map(([name, data]) => ({
                name,
                value: data.usd, // For the Pie chart (proportional)
                nativeValue: data.native,
                usdValue: data.usd, // Explicit USD value
                currency: data.currency,
                percentage: (data.usd / (totalConverted || 1)) * 100,
                color: (data.paymentMethods || []).find(m => m.name === name)?.color || '#3498db'
            }))
            .sort((a, b) => b.value - a.value);

        // Supplier Data Aggregation
        const supplierDebts = (data.suppliers || []).reduce((acc, s) => acc + (s.debt || 0), 0);
        let supplierPaymentsInRange = 0;
        (data.suppliers || []).forEach(s => {
            (s.transactions || []).forEach(t => {
                if (t.type === 'Pago' && isWithinRange(t.date, timeRange)) {
                    supplierPaymentsInRange += t.amount;
                }
            });
        });

        // Combine with generic expenses/debts - Unified tracking via expenses table
        totalExpenses = (data.expenses || [])
            .filter(exp => !exp.date || isWithinRange(exp.date, timeRange))
            .reduce((acc, exp) => acc + (exp.amount || 0), 0);

        totalDebts = (data.debts || []).reduce((acc, debt) => acc + (debt.amount || 0), 0) + supplierDebts;

        totalReceivable += (data.accountsReceivable || []).reduce((acc, rec) => acc + (rec.amount || 0), 0);

        return {
            totalUSD, totalBs, totalConverted, totalReceivable,
            totalExpenses, totalDebts, allPaymentsChartData,
            departmentTotals, supplierDebts, supplierPaymentsInRange
        };
    }, [filteredSales, exchangeRate, data.expenses, data.debts, data.accountsReceivable, data.suppliers, timeRange]);

    return (
        <div style={{
            padding: isMobile ? '0.5rem' : '1rem',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            overflowY: 'auto',
            background: '#0b0e14'
        }}>
            {/* Header Area */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>
                        ANÁLISIS DE VENTAS
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Dashboard Financiero en Tiempo Real</p>
                </div>

                <div className="no-scrollbar" style={{
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    padding: '0.25rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    flexShrink: 0
                }}>
                    {['today', 'week', 'month', 'all'].map(r => (
                        <button key={r}
                            className={`glass-button ${timeRange === r ? 'primary' : ''}`}
                            onClick={() => setTimeRange(r)}
                            style={{
                                fontSize: '0.7rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '8px',
                                background: timeRange === r ? 'var(--accent-blue)' : 'transparent',
                                color: timeRange === r ? '#000' : '#fff',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                minWidth: '60px'
                            }}
                        >
                            {r === 'today' ? 'Hoy' : r === 'week' ? 'Semana' : r === 'month' ? 'Mes' : 'Todo'}
                        </button>
                    ))}
                </div>

                <div className="glass-panel" style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={14} className="text-gray-400" />
                    <select className="glass-input" value={selectedCustomerId} onChange={handleCustomerChange} style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', color: '#fff', width: '100%' }}>
                        <option value="" style={{ background: '#1a1a1a' }}>-- Clientes --</option>
                        {customers.map(c => <option key={c.id} value={c.id} style={{ background: '#1a1a1a' }}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr) repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '4px solid var(--accent-orange)', background: 'rgba(255, 165, 0, 0.05)' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>RESTAURANTE</p>
                    <h2 style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold', color: '#fff' }}>{formatAmount(financials.departmentTotals['Restaurante'], '$')}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '4px solid #f1c40f', background: 'rgba(241, 196, 15, 0.05)' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>QUESERA</p>
                    <h2 style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold', color: '#fff' }}>{formatAmount(financials.departmentTotals['Quesera'] || 0, '$')}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '4px solid var(--accent-green)', background: 'rgba(39, 174, 96, 0.05)' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>VENTA TOTAL</p>
                    <h2 style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold', color: '#fff' }}>{formatAmount(financials.totalConverted, '$')}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '4px solid #e74c3c', background: 'rgba(231, 76, 60, 0.05)' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>PAGOS PROV.</p>
                    <h2 style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold', color: '#e74c3c' }}>{formatAmount(financials.supplierPaymentsInRange, '$')}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '4px solid #9b59b6', background: 'rgba(155, 89, 182, 0.05)' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>DEUDA PROV.</p>
                    <h2 style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold', color: '#9b59b6' }}>{formatAmount(financials.supplierDebts, '$')}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '4px solid #27ae60' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>DIVISAS ($)</p>
                    <h2 style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 'bold', color: '#27ae60' }}>{formatAmount(financials.totalUSD, '$')}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem', borderLeft: '4px solid #3498db' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>BOLÍVARES</p>
                    <h2 style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 'bold', color: '#3498db' }}>{formatAmount(financials.totalBs, 'Bs')}</h2>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '0.75rem',
                flex: 1,
                minHeight: 0,
                overflowY: isMobile ? 'visible' : 'hidden'
            }}>

                {/* Left Side: Trends and Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: isMobile ? 'auto' : 0 }}>
                    <div className="glass-panel" style={{ padding: '1rem', height: isMobile ? '250px' : '200px', flexShrink: 0 }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>COMPARATIVA DE SALDOS ($)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Ventas', valor: financials.totalConverted, color: '#2ecc71' },
                                { name: 'Gastos', valor: financials.totalExpenses, color: '#e74c3c' },
                                { name: 'Deudas', valor: financials.totalDebts, color: '#9b59b6' },
                                { name: 'Por Cobrar', valor: financials.totalReceivable, color: '#3498db' }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                                    {[0, 1, 2, 3].map(i => <Cell key={i} fill={['#27ae60', '#e74c3c', '#9b59b6', '#3498db'][i]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: isMobile ? '400px' : 'auto', maxHeight: isMobile ? '500px' : 'none' }}>
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold' }}>HISTORIAL DE VENTAS</h3>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? '0.75rem' : '0.8rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#161922', zIndex: 10 }}>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>HORA</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>TOTAL</th>
                                        {!isMobile && <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>MÉTODO</th>}
                                        {!isMobile && <th style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>CAJERO</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.slice().reverse().map(sale => (
                                        <tr key={sale.id} onClick={() => setSelectedSale(sale)} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: 'transparent' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '0.75rem 1rem' }}>{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                                                {formatAmount(sale.total, '$')}
                                                {isMobile && <div style={{ fontSize: '0.65rem', color: '#ccc', fontWeight: 'normal' }}>{sale.payments ? sale.payments.map(p => mapMethodLabel(p.method, data.paymentMethods).split(' ')[0]).join(', ') : mapMethodLabel(sale.paymentMethod, data.paymentMethods).split(' ')[0]}</div>}
                                            </td>
                                            {!isMobile && <td style={{ padding: '0.75rem 1rem', color: '#ccc' }}>
                                                {sale.payments ? sale.payments.map(p => mapMethodLabel(p.method, data.paymentMethods)).join(', ') : mapMethodLabel(sale.paymentMethod, data.paymentMethods)}
                                            </td>}
                                            {!isMobile && <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{sale.cashier || 'Cajero 1'}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Side: Detailed Payment Summary */}
                <div className="glass-panel" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: '#11141d',
                    border: '1px solid rgba(255,255,255,0.05)',
                    width: isMobile ? '100%' : '350px',
                    flexShrink: 0,
                    minHeight: isMobile ? 'auto' : 0
                }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CreditCard size={18} color="var(--accent-blue)" /> POR MEDIO DE PAGO
                        </h3>
                    </div>

                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto' }}>

                        {/* Summary Chart */}
                        <div style={{ height: '240px', flexShrink: 0 }}>
                            <ResponsiveContainer>
                                <PieChart margin={{ top: 10, right: 40, left: 40, bottom: 10 }}>
                                    <Pie
                                        data={financials.allPaymentsChartData}
                                        dataKey="value"
                                        innerRadius={35}
                                        outerRadius={55}
                                        paddingAngle={2}
                                        labelLine={true}
                                        label={({ name, percent }) => isMobile ? `${(percent * 100).toFixed(0)}%` : `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {financials.allPaymentsChartData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val) => `$${val.toFixed(2)}`}
                                        contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '11px' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Detailed List: Method, Amount, % */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {financials.allPaymentsChartData.map((item, idx) => (
                                <div key={idx} style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.03)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, boxShadow: `0 0 10px ${item.color}44` }}></div>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column' }}>
                                                <span>{item.currency === 'Bs' ? `Bs ${item.nativeValue.toLocaleString()}` : `$${item.nativeValue.toFixed(2)}`}</span>
                                                {item.currency === 'Bs' && <span style={{ color: 'var(--accent-green)' }}>(${item.usdValue.toFixed(2)})</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>{item.percentage.toFixed(1)}%</div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>de la venta</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Grand Totals Section */}
                        <div style={{ marginTop: isMobile ? '1rem' : 'auto', paddingTop: '1rem', borderTop: '2px dashed rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold' }}>TOTAL BOLÍVARES</span>
                                <span style={{ color: '#3498db', fontSize: '0.85rem', fontWeight: 'bold' }}>{formatAmount(financials.totalBs, 'Bs')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold' }}>TOTAL DIVISAS</span>
                                <span style={{ color: '#27ae60', fontSize: '0.85rem', fontWeight: 'bold' }}>{formatAmount(financials.totalUSD, '$')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Detail Modal */}
            {selectedSale && (
                <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} title="Detalle de Transacción">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Ticket #{selectedSale.id.toString().slice(-6)}</h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(selectedSale.date).toLocaleString()}</p>
                                </div>
                                <div style={{ background: 'var(--accent-blue)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>PAGADO</div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                {selectedSale.items?.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <span>{item.quantity}x {item.name}</span>
                                        <span style={{ fontWeight: 'bold' }}>{formatAmount(item.price * item.quantity, '$')}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                <span>TOTAL VENTA</span>
                                <span style={{ color: 'var(--accent-green)' }}>{formatAmount(selectedSale.total, '$')}</span>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Desglose de Pago Realizado</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {selectedSale.payments ? selectedSale.payments.map((p, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{mapMethodLabel(p.method, data.paymentMethods)}</div>
                                            {p.note && <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)' }}>{p.note}</div>}
                                        </div>
                                        <div style={{ fontWeight: 'bold', color: p.currency === 'Bs' ? '#3498db' : '#27ae60' }}>
                                            {formatAmount(p.amount, p.currency === 'Bs' ? 'Bs' : '$')}
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                                        <div style={{ fontWeight: 'bold' }}>{mapMethodLabel(selectedSale.paymentMethod, data.paymentMethods)}</div>
                                        <div style={{ fontWeight: 'bold' }}>{formatAmount(selectedSale.total, '$')}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} /> Cajero: {selectedSale.cashier || 'Cajero 1'}</div>
                            {selectedSale.tableName && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Receipt size={14} /> Mesa: {selectedSale.tableName}</div>}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ReportsPage;
