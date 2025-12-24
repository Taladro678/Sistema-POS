import React from 'react';

const DataTable = ({ columns, data, actions }) => {
    return (
        <div className="glass-panel no-scrollbar" style={{ overflowX: 'auto' }}>
            {/* Desktop Table View */}
            <table className="desktop-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                        {columns.map((col, idx) => (
                            <th key={idx} style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                {col.header}
                            </th>
                        ))}
                        {actions && <th style={{ padding: '0.75rem' }}></th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIdx) => (
                        <tr key={row.id || rowIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {columns.map((col, colIdx) => (
                                <td key={colIdx} style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                                    {col.render ? col.render(row) : row[col.accessor]}
                                </td>
                            ))}
                            {actions && (
                                <td style={{ padding: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    {actions(row)}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '1rem' }}>
                {data.map((row, rowIdx) => (
                    <div key={row.id || rowIdx} className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                        {columns.map((col, colIdx) => (
                            <div key={colIdx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{col.header}:</span>
                                <span style={{ textAlign: 'right', fontWeight: '500' }}>
                                    {col.render ? col.render(row) : row[col.accessor]}
                                </span>
                            </div>
                        ))}
                        {actions && (
                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                {actions(row)}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .desktop-table { display: none !important; }
                    .mobile-cards { display: flex !important; }
                }
            `}</style>
        </div>
    );
};

export default DataTable;
