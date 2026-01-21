import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { Banknote, Hash, Check, X, Plus, Minus } from 'lucide-react';

const CashDenominationModal = ({ isOpen, onClose, onConfirm, amount, currency, denominationsConfig, debtAmount, isAuditMode = false }) => {
    const [counts, setCounts] = useState({});
    const [changeMethod, setChangeMethod] = useState('');

    // Default denominations if none provided
    const defaultDenominations = useMemo(() => {
        if (currency === 'BS') {
            return [500, 200, 100, 50, 20, 10];
        }
        return [100, 50, 20, 10, 5, 2, 1];
    }, [currency]);

    const activeDenominations = denominationsConfig || defaultDenominations;

    useEffect(() => {
        if (isOpen) {
            setCounts({});
            setChangeMethod(currency === 'BS' ? 'Efectivo Bs' : 'Efectivo USD');
        }
    }, [isOpen, currency]);

    const totalCalculated = Object.entries(counts).reduce((sum, [denom, count]) => {
        return sum + (parseFloat(denom) * (parseInt(count) || 0));
    }, 0);

    // FIX: Validation target should be the AMOUNT being paid, not the total DEBT (unless paying all)
    // If amount is provided (partial payment), we validate against that. Otherwise fall back to debt.
    const validationTarget = (amount && amount > 0) ? amount : (debtAmount || 0);

    // For visual display of "Debt", we prefer the actual debtAmount
    const visualDebt = debtAmount || validationTarget;

    const diff = totalCalculated - validationTarget;
    // In Audit Mode, any counting is valid. In Payment Mode, must cover the target amount to pay.
    const isValid = isAuditMode ? true : totalCalculated >= validationTarget - 0.009;

    const handleUpdateCount = (denom, delta) => {
        const current = counts[denom] || 0;
        const next = Math.max(0, current + delta);
        setCounts({ ...counts, [denom]: next });
    };

    const handleConfirm = () => {
        if (!isValid) return;
        const breakdown = Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .map(([denom, count]) => ({ denomination: parseFloat(denom), count }));

        onConfirm(breakdown, totalCalculated, diff, changeMethod);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isAuditMode ? `Arqueo de Billetes (${currency})` : `Desglose de Efectivo (${currency})`}
        >
            <div className="flex flex-col gap-6 p-2">
                {/* Header Info - Debt vs Target - Hide in Audit Mode */}
                {!isAuditMode && (
                    <div className="flex gap-2">
                        <div className="flex-1 glass-panel p-3 bg-white/5 border-white/10 text-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Saldo Pendiente</span>
                            <h2 className="text-xl font-black text-white">
                                {currency === 'BS' ? 'Bs ' : '$ '}{visualDebt.toFixed(2)}
                            </h2>
                        </div>
                        {/* Show "Amount Entered" if strictly different from visual debt */}
                        {Math.abs(amount - visualDebt) > 0.01 && amount > 0 && (
                            <div className="flex-1 glass-panel p-3 bg-blue-500/10 border-blue-500/30 text-center">
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">A Desglosar</span>
                                <h2 className="text-xl font-black text-white">
                                    {currency === 'BS' ? 'Bs ' : '$ '}{amount.toFixed(2)}
                                </h2>
                            </div>
                        )}
                    </div>
                )}

                {/* Denominations Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                    {activeDenominations.map(denom => (
                        <div key={denom} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all">
                            <span className="text-sm font-black text-gray-400 w-auto">{currency === 'BS' ? 'Bs' : '$'} {denom}</span>

                            <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/10">
                                <button
                                    className="w-9 h-9 rounded-md bg-red-400/20 text-red-400 flex items-center justify-center active:scale-90 transition-transform hover:bg-red-400/30 shrink-0"
                                    onClick={() => handleUpdateCount(denom, -1)}
                                >
                                    <Minus size={14} />
                                </button>
                                <input
                                    type="number"
                                    className="w-16 bg-transparent text-center font-black text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-white px-1"
                                    value={counts[denom] === 0 || counts[denom] === undefined ? '' : counts[denom]}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                        if (!isNaN(val)) {
                                            setCounts({ ...counts, [denom]: Math.max(0, val) });
                                        }
                                    }}
                                    onFocus={(e) => {
                                        e.target.select();
                                    }}
                                />
                                <button
                                    className="w-9 h-9 rounded-md bg-green-400/20 text-green-400 flex items-center justify-center active:scale-90 transition-transform hover:bg-green-400/30 shrink-0"
                                    onClick={() => handleUpdateCount(denom, 1)}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Validation */}
                <div className="border-t border-white/10 pt-4 mt-auto">
                    {/* Hide Change Method in Audit Mode */}
                    {!isAuditMode && diff > 0.01 && (
                        <div className="glass-panel p-3 border-green-500/20 bg-green-500/5 mb-4 animate-in fade-in slide-in-from-bottom-2">
                            <label className="text-[10px] font-bold text-green-500 uppercase block mb-2">Método para entregar el vuelto</label>
                            <div className="flex flex-wrap gap-2">
                                {['Efectivo BS', 'Pago Móvil', 'Efectivo USD'].map(m => (
                                    <button
                                        key={m}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${changeMethod === m ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20 scale-105' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                        onClick={() => setChangeMethod(m)}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 px-2">
                        <div className="text-center sm:text-left">
                            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                                {isAuditMode ? 'TOTAL CONTADO' : 'TOTAL RECIBIDO'}
                            </span>
                            <span className="text-2xl font-black text-orange-400">
                                {currency === 'BS' ? 'Bs ' : '$ '}{totalCalculated.toFixed(2)}
                            </span>
                        </div>
                        {/* Hide diff/change in Audit Mode */}
                        {!isAuditMode && (
                            <div className="text-center sm:text-right">
                                <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${diff >= -0.01 ? 'text-green-500' : 'text-red-500'}`}>
                                    {diff >= -0.01 ? 'CAMBIO / VUELTO' : 'FALTA POR COBRAR'}
                                </span>
                                <span className={`text-2xl font-black ${diff >= -0.01 ? 'text-green-400' : 'text-red-400'}`}>
                                    {currency === 'BS' ? 'Bs ' : '$ '}{Math.abs(diff).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            className="glass-button flex-1 py-4 text-gray-500 font-bold flex items-center justify-center gap-2 border-white/5"
                            onClick={onClose}
                        >
                            <X size={20} /> CANCELAR
                        </button>
                        <button
                            className={`primary-button flex-[2] py-4 text-lg font-black flex items-center justify-center gap-3 shadow-lg ${!isValid ? 'opacity-30 grayscale pointer-events-none' : 'shadow-orange-600/20'}`}
                            onClick={handleConfirm}
                            style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                            <Check size={22} /> {isAuditMode ? 'CONFIRMAR CONTEO' : 'CONFIRMAR PAGO'}
                        </button>
                    </div>
                    {!isValid && !isAuditMode && (
                        <p className="text-[10px] text-center text-red-400/70 mt-3 animate-pulse">
                            Debes completar el desglose exacto de {currency === 'BS' ? 'Bs ' : '$ '}{validationTarget.toFixed(2)} para continuar.
                        </p>
                    )}
                </div>
            </div>
        </Modal>

    );
};

export default CashDenominationModal;
