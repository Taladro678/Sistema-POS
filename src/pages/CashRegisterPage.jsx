import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { DollarSign, Save, RefreshCw, Calculator, TrendingUp, AlertCircle, CheckCircle, Edit2, X } from 'lucide-react';

export const CashRegisterPage = () => {
    const { data, updateData, updateExchangeRate } = useData();
    const { exchangeRate, cashRegister, sales } = data;

    // Local state for inputs (Funds, Counted Cash)
    const [openingBs, setOpeningBs] = useState(cashRegister.openingBalanceBs || 0);
    const [openingUsd, setOpeningUsd] = useState(cashRegister.openingBalanceUsd || 0);
    const [countedCashBs, setCountedCashBs] = useState(0);
    const [countedCashUsd, setCountedCashUsd] = useState(0);
    const [withdrawals, setWithdrawals] = useState(0); // Retiro Verdes

    // Rate Modal State
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [newRate, setNewRate] = useState(exchangeRate);

    // Calculate Sales Breakdown
    const salesByMethod = sales.reduce((acc, sale) => {
        const saleDate = new Date(sale.date).toDateString();
        const today = new Date().toDateString();

        if (saleDate === today) {
            acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
        }
        return acc;
    }, {});

    // Specific Methods Mapping
    const banplus = salesByMethod['Banplus'] || 0;
    const pagoMovil = salesByMethod['Pago Móvil'] || 0;
    const bancaribe = salesByMethod['Bancaribe'] || 0;
    const banesco = salesByMethod['Banesco'] || 0;
    const zelle = salesByMethod['Zelle'] || 0;
    const cashBs = salesByMethod['Efectivo Bs'] || 0;
    const cashUsd = salesByMethod['USD ($)'] || 0;

    // Totals
    const totalSalesUsd = sales.reduce((acc, s) => acc + s.total, 0);

    // Calculated Expected Cash
    const expectedCashBs = openingBs + (cashBs * exchangeRate);
    const expectedCashUsd = openingUsd + cashUsd - withdrawals;

    // Differences (Cuadre)
    const diffBs = countedCashBs - expectedCashBs;
    const diffUsd = countedCashUsd - expectedCashUsd;

    const handleSaveOpening = () => {
        updateData('cashRegister', {
            ...cashRegister,
            openingBalanceBs: parseFloat(openingBs),
            openingBalanceUsd: parseFloat(openingUsd),
            isOpen: true,
            openingTime: new Date().toISOString()
        });
        alert('Fondos guardados.');
    };

    const handleUpdateRate = () => {
        updateExchangeRate(newRate);
        setIsRateModalOpen(false);
    };

    return (
        <div className="cr-container">
            {/* Header */}
            <div className="cr-header">
                <div className="cr-title">
                    <div className="cr-title-icon">
                        <Calculator size={18} />
                    </div>
                    <div>
                        <h1>Control de Caja</h1>
                    </div>
                </div>
                <div
                    className="glass-panel cr-rate-display"
                    onClick={() => setIsRateModalOpen(true)}
                    title="Clic para cambiar tasa"
                >
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Tasa:</p>
                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>{exchangeRate} Bs/$</p>
                    <Edit2 size={12} color="var(--text-secondary)" style={{ marginLeft: '0.25rem' }} />
                </div>
            </div>

            <div className="cr-grid">

                {/* Left Column: Inputs (Funds & Count) */}
                <div className="cr-section">

                    {/* Opening Funds Section */}
                    <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
                        <h3 className="cr-card-header text-blue">
                            <TrendingUp size={16} />
                            Apertura
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div className="cr-input-group">
                                <label>Fondo Bs</label>
                                <div className="cr-input-wrapper">
                                    <span className="cr-currency-symbol">Bs</span>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        placeholder="0"
                                        value={openingBs}
                                        onChange={(e) => setOpeningBs(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="cr-input-group">
                                <label>Fondo $</label>
                                <div className="cr-input-wrapper">
                                    <span className="cr-currency-symbol">$</span>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        placeholder="0"
                                        value={openingUsd}
                                        onChange={(e) => setOpeningUsd(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveOpening}
                            className="glass-button primary"
                            style={{ width: '100%', marginTop: '0.25rem' }}
                        >
                            <Save size={14} /> Guardar
                        </button>
                    </div>

                    {/* Closing Count Section */}
                    <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
                        <h3 className="cr-card-header text-green">
                            <DollarSign size={16} />
                            Cierre (Conteo)
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div className="cr-input-group">
                                <label>Efectivo Bs</label>
                                <div className="cr-input-wrapper">
                                    <span className="cr-currency-symbol">Bs</span>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        style={{ color: 'var(--accent-green)' }}
                                        placeholder="0"
                                        value={countedCashBs}
                                        onChange={(e) => setCountedCashBs(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="cr-input-group">
                                <label>Efectivo $</label>
                                <div className="cr-input-wrapper">
                                    <span className="cr-currency-symbol">$</span>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        style={{ color: 'var(--accent-green)' }}
                                        placeholder="0"
                                        value={countedCashUsd}
                                        onChange={(e) => setCountedCashUsd(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="cr-input-group" style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <label style={{ color: 'var(--accent-red)' }}>Retiros / Gastos ($)</label>
                            <div className="cr-input-wrapper">
                                <span className="cr-currency-symbol" style={{ color: 'var(--accent-red)' }}>$</span>
                                <input
                                    type="number"
                                    className="glass-input"
                                    style={{ color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                    placeholder="0"
                                    value={withdrawals}
                                    onChange={(e) => setWithdrawals(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Summary & Breakdown */}
                <div className="cr-section">

                    {/* Sales Breakdown Table */}
                    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                            <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Ventas del Día</h3>
                        </div>

                        <div style={{ padding: '0.5rem' }}>
                            <div className="cr-sales-list">
                                {/* Digital Payments */}
                                <div>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Digitales</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <PaymentRow label="Banplus" amount={banplus} color="#eab308" />
                                        <PaymentRow label="P. Móvil" amount={pagoMovil} color="#a855f7" />
                                        <PaymentRow label="Bancaribe" amount={bancaribe} color="#2563eb" />
                                        <PaymentRow label="Banesco" amount={banesco} color="#16a34a" />
                                        <PaymentRow label="Zelle" amount={zelle} color="#6366f1" />
                                    </div>
                                </div>

                                {/* Cash Payments */}
                                <div>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Efectivo</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div className="glass-panel" style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.03)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Bs (Equiv)</span>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>${cashBs.toFixed(2)}</span>
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                                ≈ Bs {(cashBs * exchangeRate).toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.03)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>USD</span>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent-green)' }}>${cashUsd.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Ventas</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>${totalSalesUsd.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cuadre / Balance Result */}
                    <div className="glass-panel" style={{ padding: '0.75rem', background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(31, 41, 55, 0.8))' }}>
                        <h3 className="cr-card-header">
                            <RefreshCw size={16} style={{ color: 'var(--text-secondary)' }} />
                            Cuadre
                        </h3>

                        <div className="cr-balance-grid">
                            {/* Balance Bs */}
                            <BalanceCard
                                currency="Bs"
                                diff={diffBs}
                                expected={expectedCashBs}
                                counted={countedCashBs}
                            />

                            {/* Balance USD */}
                            <BalanceCard
                                currency="USD"
                                diff={diffUsd}
                                expected={expectedCashUsd}
                                counted={countedCashUsd}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Rate Modal */}
            {isRateModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '250px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Actualizar Tasa</h3>
                            <button onClick={() => setIsRateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="cr-input-group">
                            <label>Nueva Tasa (Bs/$)</label>
                            <input
                                type="number"
                                className="glass-input"
                                value={newRate}
                                onChange={(e) => setNewRate(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={handleUpdateRate}
                            className="glass-button primary"
                            style={{ width: '100%', marginTop: '0.75rem' }}
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Components
const PaymentRow = ({ label, amount, color }) => (
    <div className="cr-payment-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }}></div>
            <span style={{ fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{ fontWeight: 'bold' }}>${amount.toFixed(2)}</span>
    </div>
);

const BalanceCard = ({ currency, diff, expected, counted }) => {
    const isBalanced = Math.abs(diff) < 0.01;
    const isSurplus = diff > 0;
    const statusColor = isBalanced ? 'var(--accent-green)' : (isSurplus ? 'var(--accent-yellow)' : 'var(--accent-red)');
    const StatusIcon = isBalanced ? CheckCircle : AlertCircle;

    return (
        <div className={`cr-balance-card ${isBalanced ? 'balanced' : 'unbalanced'}`}>
            <div className="cr-balance-header">
                <div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Dif. {currency}</p>
                    <h2 className="cr-balance-amount" style={{ color: statusColor }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                    </h2>
                </div>
                <StatusIcon size={20} style={{ color: statusColor }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Esp:</span>
                    <span>{expected.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                    <span>Real:</span>
                    <span>{counted.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};
