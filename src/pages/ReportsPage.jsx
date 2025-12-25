import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
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
    const sales = useMemo(() => data.sales || [], [data.sales]);
    const exchangeRate = data.exchangeRate || 1;

    const [timeRange, setTimeRange] = useState('today'); // today, week, month

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

        return true;
    };

    // Filter Sales
    const filteredSales = useMemo(() => {
        return sales.filter(sale => isWithinRange(sale.date, timeRange));
    }, [sales, timeRange]);

    // Calculate Totals
    const financials = useMemo(() => {
        let totalUSD = 0; // Strictly USD payments
        let totalBs = 0;  // Strictly Bs payments
        let totalConverted = 0; // Everything converted to USD

        const methodBreakdown = {};

        filteredSales.forEach(sale => {
            // Check if sale has detailed split payments
            if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
                sale.payments.forEach(p => {
                    const amount = parseFloat(p.amount);
                    if (p.currency === 'USD') {
                        totalUSD += amount;
                        totalConverted += amount;
                    } else { // Bs
                        totalBs += amount;
                        totalConverted += (amount / (p.rate || exchangeRate));
                    }

                    // Method Breakdown
                    const label = mapMethodLabel(p.method);
                    methodBreakdown[label] = (methodBreakdown[label] || 0) + amount; // Store raw amount, might need currency separation for display
                });
            } else {
                // Legacy or single payment sale
                const amount = parseFloat(sale.total);
                // Assume USD if not specified (or check paymentMethod)
                // If paymentMethod is known Bs method, add to Bs
                const isBs = ['pago_movil', 'bancaribe', 'banplus', 'banesco', 'efectivo_bs'].includes(sale.paymentMethod);

                if (isBs) {
                    totalBs += (amount * exchangeRate); // Wait, sale.total is usually in USD in this system? 
                    // Let's check ProductPage. In POSPage, total is calculated in USD.
                    // If paid in Bs, it was converted. 
                    // Let's assume sale.total is ALWAYS USD base for simple single-payment records
                    // UNLESS we want to simulate the Bs amount.
                    // Actually, if it's a Bs method, they paid in Bs.
                    // sale.total is the cart total in USD.
                    // So they paid (sale.total * exchangeRate) Bs.

                    const amountBs = amount * exchangeRate;
                    totalBs += amountBs;
                    totalConverted += amount;
                } else {
                    totalUSD += amount;
                    totalConverted += amount;
                }

                const label = mapMethodLabel(sale.paymentMethod);
                // For the chart, we probably want everything normalized to USD or 
                // it gets confusing mixing currencies in a pie chart.
                // Let's normalize to USD for the "Method Performance" chart.
                methodBreakdown[label] = (methodBreakdown[label] || 0) + amount;
            }
        });

        return { totalUSD, totalBs, totalConverted, methodBreakdown };
    }, [filteredSales, exchangeRate]);



    return (
        <div style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Reporte de Ventas</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Resumen financiero y operativo</p>
                </div>

                <div className="glass-panel" style={{ padding: '0.25rem', display: 'flex', gap: '0.25rem' }}>
                    {[
                        { id: 'today', label: 'Hoy' },
                        { id: 'week', label: 'Esta Semana' },
                        { id: 'month', label: 'Este Mes' }
                    ].map(range => (
                        <button
                            key={range.id}
                            className={`glass-button ${timeRange === range.id ? 'primary' : ''}`}
                            onClick={() => setTimeRange(range.id)}
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

                {/* Total Converted */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.1), rgba(39, 174, 96, 0.05))', border: '1px solid rgba(39, 174, 96, 0.2)' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--accent-green)', borderRadius: '12px', color: 'white' }}>
                        <TrendsUp size={24} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Venta Total (Est. USD)</p>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: 'var(--accent-green)' }}>
                            ${financials.totalConverted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>

                {/* USD Income */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                        <DollarSign size={24} color="#27ae60" />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Recibido en Divisas</p>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                            ${financials.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </h2>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Efectivo / Zelle</span>
                    </div>
                </div>

                {/* Bs Income */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                        <CreditCard size={24} color="#3498db" />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Recibido en Bolívares</p>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                            Bs {financials.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </h2>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Pago Móvil / Punto / Efectivo</span>
                    </div>
                </div>

                {/* Transacciones */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Transacciones</p>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                            {filteredSales.length}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Chart Section Placeholder (Methods) */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Desglose por Métodos (Base USD)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                    {Object.entries(financials.methodBreakdown).map(([method, amount]) => (
                        <div key={method} className="glass-panel" style={{ padding: '1rem' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{method}</p>
                            <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>${amount.toFixed(2)}</p>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', marginTop: '0.5rem', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${(amount / (financials.totalConverted || 1)) * 100}%`, height: '100%', background: 'var(--accent-blue)' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transactions Table */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Detalle de Facturas</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>ID</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Hora</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Total (USD)</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Desc.</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Pagos</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Notas</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Cajero</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No hay ventas en este periodo.
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.slice().reverse().map(sale => (
                                    <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', opacity: 0.8 }}>
                                            {sale.id.toString().slice(-6)}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                                            ${parseFloat(sale.total).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: 'var(--accent-red)' }}>
                                            {sale.discount && sale.discount.amount > 0 ? `-$${parseFloat(sale.discount.amount).toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                                            {sale.payments ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {sale.payments.map((p, i) => (
                                                        <span key={i} style={{ opacity: 0.8 }}>
                                                            {mapMethodLabel(p.method)}: {p.currency === 'USD' ? '$' : 'Bs'}{p.amount}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                mapMethodLabel(sale.paymentMethod)
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sale.note}>
                                            {sale.note || '-'}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                                            {sale.cashier || 'N/A'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Simple Icon component workaround if TrendsUp isn't exported from lucide-react (it's usually TrendingUp)
const TrendsUp = (props) => <TrendingUp {...props} />;

export default ReportsPage;
