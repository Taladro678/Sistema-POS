import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSearchParams } from 'react-router-dom';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import {
    BarChart3,
    Calendar,
    DollarSign,
    CreditCard,
    FileText,
    TrendingUp,
    Filter,
    Download
} from 'lucide-react';

const mapMethodLabel = (method) => {
    const labels = {
        'bancaribe': 'Bancaribe',
        'banplus': 'Banplus',
        'banesco': 'Banesco',
        'pago_movil': 'Pago Móvil',
        'zelle': 'Zelle',
        'efectivo_bs': 'Efectivo Bs',
        'usd': 'USD ($)',
        'punto': 'Punto de Venta'
    };
    return labels[method] || method || 'Otro';
};

const ReportsPage = () => {
    const { data } = useData();
    const [searchParams, setSearchParams] = useSearchParams();
    const sales = useMemo(() => data.sales || [], [data.sales]);
    const customers = useMemo(() => data.customers || [], [data.customers]);
    const exchangeRate = data.exchangeRate || 1;



    // Derive state directly from URL
    const selectedCustomerId = searchParams.get('customerId') || '';

    // Initialize timeRange based on whether we have a customer filter
    const [timeRange, setTimeRange] = useState(selectedCustomerId ? 'all' : 'today');

    // Update URL when filter changes
    const handleCustomerChange = (e) => {
        const id = e.target.value;
        if (id) {
            setSearchParams({ customerId: id });
            setTimeRange('all'); // Visualmente tiene sentido cambiar a 'all'
        } else {
            setSearchParams({});
            setTimeRange('today'); // Reset to today when clearing filter
        }
    };

    // Helper to check if date is within range
    const isWithinRange = (dateString, range) => {
        const date = new Date(dateString);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (range === 'today') {
            return date >= startOfDay;
        }

        if (range === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - 7);
            return date >= startOfWeek;
        }

        if (range === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return date >= startOfMonth;
        }

        if (range === 'all') return true;

        return true;
    };

    // Filter Sales
    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            // Filter by Customer
            if (selectedCustomerId && sale.customerId !== selectedCustomerId) {
                return false;
            }
            // Filter by Date Range
            if (!isWithinRange(sale.date, timeRange)) {
                return false;
            }
            return true;
        });
    }, [sales, timeRange, selectedCustomerId]);

    // Calculate Totals
    const financials = useMemo(() => {
        let totalUSD = 0; // Strictly USD payments
        let totalBs = 0;  // Strictly Bs payments
        let totalConverted = 0; // Everything converted to USD

        // Granular Bs Breakdown
        const bsDetails = {
            'bancaribe': 0,
            'banplus': 0,
            'banesco': 0,
            'pago_movil': 0,
            'punto': 0,
            'efectivo_bs': 0,
            'otros_bs': 0
        };

        const methodBreakdown = {};

        filteredSales.forEach(sale => {
            // Check if sale has detailed split payments
            if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
                sale.payments.forEach(p => {
                    const amount = parseFloat(p.amount);
                    if (p.currency === 'USD') {
                        totalUSD += amount;
                        totalConverted += amount;
                        // USD Breakdown logic could go here if needed
                    } else { // Bs
                        totalBs += amount;
                        totalConverted += (amount / (p.rate || exchangeRate));

                        // Populate Bs Details
                        if (bsDetails[p.method] !== undefined) {
                            bsDetails[p.method] += amount;
                        } else {
                            bsDetails['otros_bs'] += amount;
                        }
                    }

                    // Global Method Breakdown (Normalized to USD for general chart if needed, 
                    // but for specific request we want Bs separately)
                    const label = mapMethodLabel(p.method);
                    // store generic breakdown in USD equivalent for main summary
                    const amountInUSD = p.currency === 'USD' ? amount : (amount / (p.rate || exchangeRate));
                    methodBreakdown[label] = (methodBreakdown[label] || 0) + amountInUSD;
                });
            } else {
                // Legacy or single payment sale
                const amount = parseFloat(sale.total);

                const isBs = ['pago_movil', 'bancaribe', 'banplus', 'banesco', 'efectivo_bs', 'punto'].includes(sale.paymentMethod);

                if (isBs) {
                    const amountBs = amount * exchangeRate; // Assuming total was USD
                    totalBs += amountBs;
                    totalConverted += amount;

                    if (bsDetails[sale.paymentMethod] !== undefined) {
                        bsDetails[sale.paymentMethod] += amountBs;
                    } else {
                        bsDetails['otros_bs'] += amountBs;
                    }
                } else {
                    totalUSD += amount;
                    totalConverted += amount;
                }

                const label = mapMethodLabel(sale.paymentMethod);
                methodBreakdown[label] = (methodBreakdown[label] || 0) + amount;
            }
        });

        // Prepare data for Recharts
        const bsChartData = [
            { name: 'Banesco', value: bsDetails.banesco, color: '#27ae60' },
            { name: 'Bancaribe', value: bsDetails.bancaribe, color: '#e67e22' },
            { name: 'Banplus', value: bsDetails.banplus, color: '#f39c12' },
            { name: 'Pago Móvil', value: bsDetails.pago_movil, color: '#3498db' },
            { name: 'Punto', value: bsDetails.punto, color: '#9b59b6' },
            { name: 'Efectivo Bs', value: bsDetails.efectivo_bs, color: '#16a085' },
        ].filter(d => d.value > 0);

        return { totalUSD, totalBs, totalConverted, methodBreakdown, bsDetails, bsChartData };
    }, [filteredSales, exchangeRate]);



    return (
        <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>

            {/* Header Row: Title + Time Controls + Customer Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: 1 }}>Reporte de Ventas</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Dashboard Financiero</p>
                    </div>

                    {/* Compact Time Controls Inline */}
                    <div className="glass-panel" style={{ padding: '2px', display: 'flex', flexDirection: 'row', gap: '2px', borderRadius: '8px' }}>
                        {[
                            { id: 'today', label: 'Hoy' },
                            { id: 'week', label: 'Semana' },
                            { id: 'month', label: 'Mes' },
                            { id: 'all', label: 'Todo' }
                        ].map(range => (
                            <button
                                key={range.id}
                                className={`glass-button ${timeRange === range.id ? 'primary' : ''}`}
                                onClick={() => setTimeRange(range.id)}
                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', borderRadius: '6px' }}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Compact Customer Filter */}
                <div className="glass-panel" style={{ padding: '0.25rem 0.75rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={14} className="text-gray-400" />
                    <select
                        className="glass-input"
                        value={selectedCustomerId}
                        onChange={handleCustomerChange}
                        style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', maxWidth: '200px', padding: '0.25rem' }}
                    >
                        <option value="">-- Todos los Clientes --</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPI Dashboard Grid (4 Columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', flexShrink: 0 }}>

                {/* Total Converted */}
                <div className="glass-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.85rem', background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.1), rgba(39, 174, 96, 0.05))', border: '1px solid rgba(39, 174, 96, 0.2)' }}>
                    <div style={{ padding: '0.5rem', background: 'var(--accent-green)', borderRadius: '8px', color: 'white' }}>
                        <TrendsUp size={20} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Venta Total (Est.)</p>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0, color: 'var(--accent-green)', lineHeight: 1 }}>
                            ${financials.totalConverted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>

                {/* USD Income */}
                <div className="glass-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                        <DollarSign size={20} color="#27ae60" />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Divisas (Cash/Zelle)</p>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, lineHeight: 1 }}>
                            ${financials.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>

                {/* Bs Income */}
                <div className="glass-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                        <CreditCard size={20} color="#3498db" />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bolívares (PM/Pto)</p>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, lineHeight: 1 }}>
                            Bs {financials.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>

                {/* Transacciones */}
                <div className="glass-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                        <FileText size={20} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transacciones</p>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, lineHeight: 1 }}>
                            {filteredSales.length}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Split Content: Table (2/3) + breakdown (1/3) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1rem', flex: 1, minHeight: 0 }}>

                {/* Left Col: Transactions Table */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: 0 }}>Detalle de Facturas</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Últimas ventas primero</span>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 10 }}>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>Hora</th>
                                    <th style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>Total</th>
                                    <th style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>Método</th>
                                    <th style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>Nota</th>
                                    <th style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>Cajero</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            No hay ventas en este periodo.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSales.slice().reverse().map(sale => (
                                        <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="hover:bg-white/5">
                                            <td style={{ padding: '0.5rem 1rem', fontFamily: 'monospace', opacity: 0.8 }}>
                                                {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem', fontWeight: 'bold' }}>
                                                ${parseFloat(sale.total).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem' }}>
                                                {sale.payments ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        {sale.payments.map((p, i) => (
                                                            <span key={i} style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                                                                {mapMethodLabel(p.method)} ({p.currency})
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    mapMethodLabel(sale.paymentMethod)
                                                )}
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.7 }}>
                                                {sale.note || '-'}
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem', opacity: 0.7 }}>
                                                {sale.cashier || 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Col: Methods Breakdown with Charts */}
                <div className="glass-panel" style={{ padding: '0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                    {/* Bs Breakdown Section */}
                    {financials.bsChartData.length > 0 ? (
                        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--accent-blue)' }}>Distribución Bolívares (Bs)</h3>

                            {/* Chart */}
                            <div style={{ height: '200px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={financials.bsChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {financials.bsChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => `Bs ${value.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                                            contentStyle={{ background: '#333', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend / List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {financials.bsChartData.map(item => (
                                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }}></div>
                                            <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold' }}>Bs {item.value.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span>Total Bs:</span>
                                    <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>Bs {financials.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            No hay movimientos en Bolívares
                        </div>
                    )}

                    {/* USD Summary (Compact) */}
                    <div style={{ padding: '1rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--accent-green)' }}>Entradas Divisas ($)</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span>Total USD:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>${financials.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

// Simple Icon component workaround if TrendsUp isn't exported from lucide-react (it's usually TrendingUp)
const TrendsUp = (props) => <TrendingUp {...props} />;

export default ReportsPage;
